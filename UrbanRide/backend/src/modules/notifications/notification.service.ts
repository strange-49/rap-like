import { getMessaging } from 'firebase-admin/messaging';

import '../../config/firebase';
import { removeDeviceToken } from './device-token.service';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  token: string,
  notification: PushNotification,
): Promise<string | null> {
  try {
    return await getMessaging().send({
      token,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes('registration-token-not-registered') ||
        error.message.includes('invalid-registration-token')
      )
    ) {
      await removeDeviceToken(token);
      return null;
    }

    throw error;
  }
}