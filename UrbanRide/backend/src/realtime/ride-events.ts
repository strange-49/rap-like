import { WebSocketManager } from './websocket-manager';
import { getRiderDeviceTokens } from '../modules/notifications/device-token.service';
import { sendPushNotification } from '../modules/notifications/notification.service';

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

  async publish(
    type: RideEventType,
    rideId: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const event: RideEvent = {
      type,
      rideId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.websocketManager.broadcast(event);

    const riderId = this.getRiderId(data);

    if (!riderId) {
      return;
    }

    const deviceTokens = await getRiderDeviceTokens(riderId);

    if (deviceTokens.length === 0) {
      return;
    }

    const notification = this.createNotification(type, rideId);

    await Promise.allSettled(
      deviceTokens.map((deviceToken) =>
        sendPushNotification(deviceToken.token, {
          ...notification,
          data: {
            type,
            rideId,
          },
        }),
      ),
    );
  }

  private getRiderId(
    data?: Record<string, unknown>,
  ): string | undefined {
    const riderId = data?.riderId;

    return typeof riderId === 'string' && riderId.trim()
      ? riderId
      : undefined;
  }

  private createNotification(
    type: RideEventType,
    rideId: string,
  ): {
    title: string;
    body: string;
  } {
    switch (type) {
      case 'ride.assigned':
        return {
          title: 'New ride assigned',
          body: `Ride ${rideId} has been assigned to you.`,
        };

      case 'ride.driver_arriving':
        return {
          title: 'Ride update',
          body: `You are marked as arriving for ride ${rideId}.`,
        };

      case 'ride.started':
        return {
          title: 'Ride started',
          body: `Ride ${rideId} has started.`,
        };

      case 'ride.completed':
        return {
          title: 'Ride completed',
          body: `Ride ${rideId} has been completed.`,
        };

      case 'ride.cancelled':
        return {
          title: 'Ride cancelled',
          body: `Ride ${rideId} has been cancelled.`,
        };

      case 'ride.requested':
        return {
          title: 'New ride request',
          body: `A new ride request is available: ${rideId}.`,
        };
    }
  }
}