import { consoleLogger } from '../../common/logging/logger';
import type { RidePushJob } from '../../jobs/queue';
import type { RideEventType } from '../../realtime/ride-events';
import { dispatchRadiusKm, riderLocations } from '../../realtime/rider-locations';
import { getOnlineRiderDeviceTokens, getRiderDeviceTokens } from './device-token.service';
import { sendPushNotification } from './notification.service';
import { haversineKm } from '../../common/geo/distance';
import { getRedis, redisEnabled } from '../../infrastructure/redis';

const MAX_RIDE_REQUEST_PUSH_RECIPIENTS = 200;
const PUSH_DEDUPE_TTL_SECONDS = 7 * 24 * 60 * 60;
const locallyClaimedPushes = new Map<string, number>();

/**
 * BullMQ is at-least-once, and FCM timeouts do not reveal whether a device
 * received a push. Claim each ride event before sending so retries cannot send
 * a duplicate. An uncertain send is intentionally at-most-once.
 */
export async function claimRidePushDelivery(type: RideEventType, rideId: string): Promise<boolean> {
  const key = `${type}:${rideId}`;
  const redis = getRedis();
  if (redisEnabled()) {
    if (!redis) throw new Error('Redis is required for cross-instance push deduplication.');
    const claimed = await redis.set(`push:dedupe:${key}`, '1', 'EX', PUSH_DEDUPE_TTL_SECONDS, 'NX');
    return claimed === 'OK';
  }
  const now = Date.now();
  for (const [claimedKey, expiresAt] of locallyClaimedPushes) {
    if (expiresAt <= now) locallyClaimedPushes.delete(claimedKey);
  }
  if (locallyClaimedPushes.has(key)) return false;
  locallyClaimedPushes.set(key, now + PUSH_DEDUPE_TTL_SECONDS * 1_000);
  return true;
}

/**
 * Sends the push notifications for one ride event. Runs inside the job queue
 * (or in-process without Redis). A claimed push is never repeated on retry;
 * provider timeouts can be ambiguous, so this chooses at-most-once delivery.
 */
export async function processRidePush(job: RidePushJob): Promise<void> {
  const { type, rideId, data } = job;

  if (!(await claimRidePushDelivery(type, rideId))) {
    consoleLogger.info('ride.push.duplicate_suppressed', { type, rideId });
    return;
  }

  if (type === 'ride.requested') {
    await sendRideRequestNotifications(rideId, data);
    return;
  }

  const riderId = typeof data?.riderId === 'string' && data.riderId.trim() ? data.riderId : undefined;
  if (!riderId) return;

  const deviceTokens = await getRiderDeviceTokens(riderId);
  if (deviceTokens.length === 0) return;

  const notification = createNotification(type, rideId);
  const results = await Promise.allSettled(
    deviceTokens.map((deviceToken) =>
      sendPushNotification(deviceToken.token, { ...notification, data: { type, rideId } }),
    ),
  );

  reportResults(`ride.${type}`, rideId, results);
}

async function sendRideRequestNotifications(rideId: string, data?: Record<string, unknown>): Promise<void> {
  const allOnlineTokens = await getOnlineRiderDeviceTokens();

  // Proximity dispatch: skip riders that are KNOWN to be far from the pickup.
  // Riders without a fresh location report are still notified (fallback).
  // Positions come from memory or Redis (shared between instances) in one batch.
  const pickup = getPickupPoint(data);
  const radiusKm = dispatchRadiusKm();
  let candidates = allOnlineTokens;

  if (pickup) {
    const locations = await riderLocations.getManyFresh(allOnlineTokens.map((token) => token.riderId));
    candidates = allOnlineTokens.filter((token) => {
      const location = locations.get(token.riderId);
      return !location || haversineKm(location, pickup) <= radiusKm;
    });
  }

  const deviceTokens = candidates.slice(0, MAX_RIDE_REQUEST_PUSH_RECIPIENTS);

  consoleLogger.info('ride.request.push', {
    rideId,
    onlineDevices: allOnlineTokens.length,
    notifiedDevices: deviceTokens.length,
    radiusKm,
  });

  if (deviceTokens.length === 0) return;

  const notificationData = createRideRequestData(rideId, data);
  const results = await Promise.allSettled(
    deviceTokens.map((deviceToken) =>
      sendPushNotification(deviceToken.token, {
        title: 'NEW RIDE REQUEST',
        body: createRideRequestBody(data),
        data: notificationData,
      }),
    ),
  );

  reportResults('ride.requested', rideId, results);
}

function getPickupPoint(data?: Record<string, unknown>) {
  const latitude = Number(data?.pickupLatitude);
  const longitude = Number(data?.pickupLongitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function reportResults(eventType: string, rideId: string, results: PromiseSettledResult<unknown>[]): void {
  const failed = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  consoleLogger.info('ride.push.completed', {
    eventType,
    rideId,
    sent: results.length - failed.length,
    failed: failed.length,
  });
  for (const failure of failed.slice(0, 3)) {
    // Never log device tokens.
    consoleLogger.error('ride.push.device_failed', { eventType, rideId, error: String(failure.reason) });
  }
  // Do not throw after an ambiguous push result: the retry would duplicate FCM.
}

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function createRideRequestData(rideId: string, data?: Record<string, unknown>) {
  return {
    type: 'RIDE_REQUEST',
    rideId,
    pickupAddress: toStringValue(data?.pickupAddress),
    dropAddress: toStringValue(data?.dropAddress),
    estimatedDistance: toStringValue(data?.estimatedDistance),
    estimatedFare: toStringValue(data?.estimatedFare),
    rideType: toStringValue(data?.rideType),
  };
}

function formatRideType(rideType: string): string {
  if (!rideType) return 'Ride';
  return rideType.charAt(0).toUpperCase() + rideType.slice(1);
}

function createRideRequestBody(data?: Record<string, unknown>): string {
  const fare = toStringValue(data?.estimatedFare);
  const rideType = toStringValue(data?.rideType);
  return fare ? `${formatRideType(rideType)} • ₹${fare}` : `${formatRideType(rideType)} request`;
}

function createNotification(type: RideEventType, rideId: string) {
  switch (type) {
    case 'ride.searching':
      return { title: 'Ride Searching', body: `Searching for a rider for ride ${rideId}.` };
    case 'ride.assigned':
      return { title: 'Ride Assigned', body: `Ride ${rideId} has been assigned to you.` };
    case 'ride.driver_arriving':
      return { title: 'Driver Arriving', body: `Your driver is arriving for ride ${rideId}.` };
    case 'ride.started':
      return { title: 'Ride Started', body: `Ride ${rideId} has started.` };
    case 'ride.completed':
      return { title: 'Ride Completed', body: `Ride ${rideId} has been completed.` };
    case 'ride.cancelled':
      return { title: 'Ride Cancelled', body: `Ride ${rideId} has been cancelled.` };
    case 'ride.requested':
      return { title: 'NEW RIDE REQUEST', body: `A new ride request is available: ${rideId}.` };
    case 'ride.location':
      return { title: 'Ride location', body: `Location update for ride ${rideId}.` };
  }
}
