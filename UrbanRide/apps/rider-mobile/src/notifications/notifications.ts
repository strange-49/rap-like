import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { registerRiderDeviceToken } from '../config/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type RideRequestNotificationData = {
  type: 'RIDE_REQUEST';
  rideId: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedDistance: string;
  estimatedFare: string;
  rideType: string;
};

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notification registration requires a physical device.');
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission was not granted.');
    return null;
  }

  await Notifications.setNotificationChannelAsync('ride-requests', {
    name: 'Ride Requests',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 300, 200, 300],
    lockscreenVisibility:
      Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  const tokenResponse = await Notifications.getDevicePushTokenAsync();

  return tokenResponse.data;
}

export async function registerRiderPushToken(): Promise<string | null> {
  const token = await registerForPushNotifications();

  if (!token) {
    return null;
  }

  await registerRiderDeviceToken(token);

  return token;
}

export function parseRideRequestNotification(
  data: Record<string, unknown>,
): RideRequestNotificationData | null {
  if (data.type !== 'RIDE_REQUEST' || typeof data.rideId !== 'string') {
    return null;
  }

  return {
    type: 'RIDE_REQUEST',
    rideId: data.rideId,
    pickupAddress:
      typeof data.pickupAddress === 'string'
        ? data.pickupAddress
        : '',
    dropAddress:
      typeof data.dropAddress === 'string'
        ? data.dropAddress
        : '',
    estimatedDistance:
      typeof data.estimatedDistance === 'string'
        ? data.estimatedDistance
        : '',
    estimatedFare:
      typeof data.estimatedFare === 'string'
        ? data.estimatedFare
        : '',
    rideType:
      typeof data.rideType === 'string'
        ? data.rideType
        : '',
  };
}