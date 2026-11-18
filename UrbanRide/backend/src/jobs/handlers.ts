import { refundCapturedPaymentForRide } from '../modules/payments/payment.service';
import { processRidePush } from '../modules/notifications/ride-push.service';
import { registerJobHandlers } from './queue';
import { runRideMaintenanceOnce } from './ride-maintenance';

/**
 * Connects job names to their implementations. Kept separate from queue.ts so
 * the queue module never imports the modules that enqueue jobs (import cycle).
 * Call once at startup (server.ts and worker.ts do).
 */
export function registerAllJobHandlers(): void {
  registerJobHandlers({
    'ride-push': (job) => processRidePush(job),
    // Throws if the payment provider call fails, so the queue retries with backoff.
    // The function itself is idempotent (only one caller can claim a refund).
    refund: async ({ rideId }) => {
      await refundCapturedPaymentForRide(rideId);
    },
    maintenance: () => runRideMaintenanceOnce(),
  });
}
