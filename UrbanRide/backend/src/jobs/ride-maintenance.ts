import { consoleLogger } from '../common/logging/logger';
import { queueEnabled, scheduleRecurring } from './queue';
import {
  autoCompleteAbandonedRides,
  expireStaleRequestedRides,
} from '../modules/rides/ride/ride.repository';
import { rideEvents } from '../realtime/realtime';
import { riderLocations } from '../realtime/rider-locations';

// How often the sweep runs. Requests expire after 15 minutes, so even 5 minutes is fine;
// a longer interval means fewer Redis commands (useful on a command-limited plan like Upstash's).
const configuredSeconds = Number(process.env.MAINTENANCE_INTERVAL_SECONDS);
const SWEEP_INTERVAL_MS =
  Number.isFinite(configuredSeconds) && configuredSeconds >= 10 ? configuredSeconds * 1_000 : 60_000;

/**
 * Background housekeeping (replaces doing writes inside GET /rides/requested):
 *  - cancels ride requests nobody accepted within the expiry window
 *  - completes rides the rider finished but the customer never confirmed
 *  - drops stale in-memory rider positions
 *
 * Every step is an atomic compare-and-set, so running it on several instances
 * at once is safe (only one instance wins each ride).
 */
export async function runRideMaintenanceOnce(): Promise<void> {
  const expired = await expireStaleRequestedRides();
  for (const ride of expired) {
    await rideEvents.publish('ride.cancelled', ride.id, {
      customerId: ride.customerId,
      riderId: null,
      corporateAccountId: ride.corporateAccountId,
      status: 'CANCELLED',
      reason: 'SYSTEM',
    });
  }

  const completed = await autoCompleteAbandonedRides();
  for (const ride of completed) {
    await rideEvents.publish('ride.completed', ride.id, {
      customerId: ride.customerId,
      riderId: ride.riderId,
      corporateAccountId: ride.corporateAccountId,
      status: 'COMPLETED',
    });
  }

  riderLocations.prune(10 * 60_000);

  if (expired.length > 0 || completed.length > 0) {
    consoleLogger.info('rides.maintenance', {
      expiredRequests: expired.length,
      autoCompleted: completed.length,
    });
  }
}

/**
 * With Redis: registers ONE repeatable queue job, so the sweep runs once per
 * interval across the whole fleet (the queue is the distributed lock).
 * Without Redis: a plain timer in this process, as before.
 * Returns a function that stops the timer (the queue schedule lives in Redis).
 */
export function startRideMaintenance(): () => void {
  if (queueEnabled()) {
    void scheduleRecurring('maintenance', SWEEP_INTERVAL_MS).catch((error: unknown) => {
      consoleLogger.error('rides.maintenance_schedule_failed', { error: String(error) });
    });
    return () => undefined;
  }

  let running = false;

  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      await runRideMaintenanceOnce();
    } catch (error) {
      consoleLogger.error('rides.maintenance_failed', { error: String(error) });
    } finally {
      running = false;
    }
  };

  const first = setTimeout(() => void sweep(), 5_000);
  const timer = setInterval(() => void sweep(), SWEEP_INTERVAL_MS);
  first.unref();
  timer.unref();

  return () => {
    clearTimeout(first);
    clearInterval(timer);
  };
}
