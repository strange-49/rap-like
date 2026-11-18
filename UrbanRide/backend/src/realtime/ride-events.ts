import { enqueue } from '../jobs/queue';
import { publishRideEventToBus } from './event-bus';
import { WebSocketManager } from './websocket-manager';

export type RideEventType =
  | 'ride.requested'
  | 'ride.searching'
  | 'ride.assigned'
  | 'ride.driver_arriving'
  | 'ride.started'
  | 'ride.completed'
  | 'ride.cancelled'
  | 'ride.location';

export interface RideEvent {
  type: RideEventType;
  rideId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class RideEventPublisher {
  constructor(private readonly websocketManager: WebSocketManager) {}

  async publish(type: RideEventType, rideId: string, data?: Record<string, unknown>): Promise<void> {
    const event: RideEvent = {
      type,
      rideId,
      timestamp: new Date().toISOString(),
      data,
    };
    this.websocketManager.broadcastRideEvent(event);
    await publishRideEventToBus(event);

    // GPS traffic is delivered over WebSockets and must not produce FCM pushes.
    if (type === 'ride.location') return;
    await enqueue('ride-push', { type, rideId, data }, {
      jobId: `ride-push-${type.replaceAll('.', '-')}-${rideId}`,
    });
  }
}
