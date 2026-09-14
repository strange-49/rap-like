const API_URL = 'http://10.0.2.2:3000';

export async function registerRiderDeviceToken(
  riderId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${API_URL}/notifications/device-token?riderId=${encodeURIComponent(
      riderId,
    )}&token=${encodeURIComponent(token)}&platform=android`,
    {
      method: 'POST',
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to register device token: ${response.status}`,
    );
  }
}