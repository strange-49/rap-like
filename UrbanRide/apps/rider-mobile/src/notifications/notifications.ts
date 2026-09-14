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

export async function registerForPushNotifications(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } =
      await Notifications.requestPermissionsAsync();

    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const tokenResponse =
    await Notifications.getDevicePushTokenAsync();

  return tokenResponse.data;
}

export async function registerRiderPushToken(
  riderId: string,
): Promise<string | null> {
  const token = await registerForPushNotifications();

  if (!token) {
    return null;
  }

  await registerRiderDeviceToken(riderId, token);

  return token;
}