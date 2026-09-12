import { WebSocketManager } from './websocket-manager';

export type RideEventType =
  | 'ride.requested'
  | 'ride.assigned'
  | 'ride.driver_arriving'
  | 'ride.started'
  | 'ride.completed'
  | 'ride.cancelled';

export interface RideEvent {
  type: RideEventType;
  rideId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export class RideEventPublisher {
  constructor(private readonly websocketManager: WebSocketManager) {}

  publish(
    type: RideEventType,
    rideId: string,
    data?: Record<string, unknown>,
  ): void {
    const event: RideEvent = {
      type,
      rideId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.websocketManager.broadcast(event);
  }
}