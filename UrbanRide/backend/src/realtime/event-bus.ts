import { INSTANCE_ID } from '../config/instance';
import { consoleLogger } from '../common/logging/logger';
import { createSubscriberConnection, getRedis, redisEnabled } from '../infrastructure/redis';
import type { RideEvent } from './ride-events';

const CHANNEL = 'urbanride:ride-events';

interface BusMessage {
  origin: string;
  event: RideEvent;
}

function isRideEvent(value: unknown): value is RideEvent {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RideEvent>;
  return (
    typeof candidate.type === 'string' &&
    typeof candidate.rideId === 'string' &&
    typeof candidate.timestamp === 'string'
  );
}

/**
 * Redis pub/sub bridge between backend instances.
 *
 * A WebSocket client is connected to ONE instance, but the HTTP request that
 * causes an event (e.g. the rider accepting a ride) may land on ANOTHER one.
 * Every instance therefore publishes each event here, and every other instance
 * delivers it to its own connected sockets.
 *
 * Without REDIS_URL this is a no-op (single instance: local delivery is enough).
 */
export async function publishRideEventToBus(event: RideEvent): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    const message: BusMessage = { origin: INSTANCE_ID, event };
    await redis.publish(CHANNEL, JSON.stringify(message));
  } catch (error) {
    consoleLogger.error('eventbus.publish_failed', { error: String(error) });
  }
}

/** Starts listening for events from other instances. Returns a function that stops it. */
export function startRideEventBus(deliver: (event: RideEvent) => void): () => Promise<void> {
  if (!redisEnabled()) return async () => undefined;

  const subscriber = createSubscriberConnection();

  subscriber.subscribe(CHANNEL).catch((error: unknown) => {
    consoleLogger.error('eventbus.subscribe_failed', { error: String(error) });
  });

  subscriber.on('message', (_channel, raw) => {
    try {
      const message = JSON.parse(raw) as Partial<BusMessage>;
      if (message.origin === INSTANCE_ID) return; // we already delivered it locally
      if (!isRideEvent(message.event)) return;
      deliver(message.event);
    } catch (error) {
      consoleLogger.error('eventbus.bad_message', { error: String(error) });
    }
  });

  consoleLogger.info('eventbus.started', { instance: INSTANCE_ID });

  return async () => {
    try {
      await subscriber.quit();
    } catch {
      subscriber.disconnect();
    }
  };
}
