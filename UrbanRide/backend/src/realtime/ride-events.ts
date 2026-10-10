import { WebSocketManager } from './websocket-manager';
import {
  getAllRiderDeviceTokens,
  getRiderDeviceTokens,
} from '../modules/notifications/device-token.service';
import { sendPushNotification } from '../modules/notifications/notification.service';

export type RideEventType =
  | 'ride.requested'
  | 'ride.searching'
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
  constructor(
    private readonly websocketManager: WebSocketManager,
  ) {}

  async publish(
    type: RideEventType,
    rideId: string,
    data?: Record<string, unknown>,
  ) {
    const event: RideEvent = {
      type,
      rideId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.websocketManager.broadcastRideEvent(event);

    if (type === 'ride.requested') {
      await this.sendRideRequestNotifications(rideId, data);
      return;
    }

    const riderId = this.getRiderId(data);

    if (!riderId) {
      return;
    }

    const deviceTokens = await getRiderDeviceTokens(riderId);

    if (deviceTokens.length === 0) {
      return;
    }

    const notification = this.createNotification(type, rideId);

    const results = await Promise.allSettled(
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

    this.logPushResults(
      `ride.${type}`,
      rideId,
      deviceTokens.map((deviceToken) => deviceToken.token),
      results,
    );
  }

  private async sendRideRequestNotifications(
    rideId: string,
    data?: Record<string, unknown>,
  ) {
    const deviceTokens = await getAllRiderDeviceTokens();

    console.log(
      `[RideRequestPush] ride=${rideId} riderDevices=${deviceTokens.length}`,
    );

    if (deviceTokens.length === 0) {
      console.warn(
        `[RideRequestPush] No registered rider devices for ride ${rideId}.`,
      );
      return;
    }

    const notificationData = this.createRideRequestData(
      rideId,
      data,
    );

    console.log(
      '[RideRequestPush] Sending notification:',
      JSON.stringify({
        rideId,
        deviceCount: deviceTokens.length,
        data: notificationData,
      }),
    );

    const results = await Promise.allSettled(
      deviceTokens.map((deviceToken) =>
        sendPushNotification(deviceToken.token, {
          title: 'NEW RIDE REQUEST',
          body: this.createRideRequestBody(data),
          data: notificationData,
        }),
      ),
    );

    this.logPushResults(
      'ride.requested',
      rideId,
      deviceTokens.map((deviceToken) => deviceToken.token),
      results,
    );
  }

  private logPushResults(
    eventType: string,
    rideId: string,
    tokens: string[],
    results: PromiseSettledResult<unknown>[],
  ) {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(
          `[RideRequestPush] SUCCESS event=${eventType} ride=${rideId} token=${tokens[index].slice(0, 20)}...`,
          result.value,
        );
        return;
      }

      console.error(
        `[RideRequestPush] FAILED event=${eventType} ride=${rideId} token=${tokens[index].slice(0, 20)}...`,
        result.reason,
      );
    });
  }

  private createRideRequestData(
    rideId: string,
    data?: Record<string, unknown>,
  ) {
    return {
      type: 'RIDE_REQUEST',
      rideId,
      pickupAddress: this.toStringValue(data?.pickupAddress),
      dropAddress: this.toStringValue(data?.dropAddress),
      estimatedDistance: this.toStringValue(
        data?.estimatedDistance,
      ),
      estimatedFare: this.toStringValue(data?.estimatedFare),
      rideType: this.toStringValue(data?.rideType),
    };
  }

  private createRideRequestBody(
    data?: Record<string, unknown>,
  ) {
    const fare = this.toStringValue(data?.estimatedFare);
    const rideType = this.toStringValue(data?.rideType);

    if (fare) {
      return `${this.formatRideType(rideType)} • ₹${fare}`;
    }

    return `${this.formatRideType(rideType)} request`;
  }

  private formatRideType(rideType: string) {
    if (!rideType) {
      return 'Ride';
    }

    return (
      rideType.charAt(0).toUpperCase() +
      rideType.slice(1)
    );
  }

  private toStringValue(value: unknown) {
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  private getRiderId(
    data?: Record<string, unknown>,
  ) {
    const riderId = data?.riderId;

    if (
      typeof riderId === 'string' &&
      riderId.trim()
    ) {
      return riderId;
    }

    return undefined;
  }

  private createNotification(
    type: RideEventType,
    rideId: string,
  ) {
    switch (type) {
      case 'ride.searching':
        return {
          title: 'Ride Searching',
          body: `Searching for a rider for ride ${rideId}.`,
        };

      case 'ride.assigned':
        return {
          title: 'Ride Assigned',
          body: `Ride ${rideId} has been assigned to you.`,
        };

      case 'ride.driver_arriving':
        return {
          title: 'Driver Arriving',
          body: `Your driver is arriving for ride ${rideId}.`,
        };

      case 'ride.started':
        return {
          title: 'Ride Started',
          body: `Ride ${rideId} has started.`,
        };

      case 'ride.completed':
        return {
          title: 'Ride Completed',
          body: `Ride ${rideId} has been completed.`,
        };

      case 'ride.cancelled':
        return {
          title: 'Ride Cancelled',
          body: `Ride ${rideId} has been cancelled.`,
        };

      case 'ride.requested':
        return {
          title: 'NEW RIDE REQUEST',
          body: `A new ride request is available: ${rideId}.`,
        };
    }
  }
}