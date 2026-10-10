import {
  clearRiderSession,
  getRiderAuthToken,
} from './auth';

// For physical Android devices, use `adb reverse tcp:3000 tcp:3000` with
// this default, or provide the host LAN URL at build time.
const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export type RequestedRide = {
  id: string;
  customerId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  rideType: 'bike' | 'auto' | 'cab';
  status: string;
  startOtpRequired: boolean;
  // Prisma Decimal fields are serialized as strings in JSON responses.
  estimatedDistance: number | string | null;
  estimatedFare: number | string | null;
  finalFare?: number | string | null;
  riderId: string | null;
  requestedAt: string;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  riderCompletedAt?: string | null;
  customerCompletedAt?: string | null;
  cancelledAt: string | null;
  payment?: {
    status: 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
    amount: number | string;
    mode: 'ADVANCE' | 'POST_RIDE';
  } | null;
};

export type RiderLoginResponse = {
  token: string;
  expiresAt: string;
  principal: {
    subjectId: string;
    role: 'RIDER';
    tenant: {
      tenantId: string;
    } | null;
  };
};

async function parseError(
  response: Response,
  fallback: string,
): Promise<Error> {
  if (response.status === 401) {
    clearRiderSession();
    return new Error('Your rider session expired. Please sign in again.');
  }

  return new Error(`${fallback} (HTTP ${response.status}).`);
}

export async function loginRider(
  username: string,
  password: string,
): Promise<RiderLoginResponse> {
  const response = await fetch(
    `${API_URL}/auth/development/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    },
  );

  if (!response.ok) {
    throw await parseError(
      response,
      'Rider login failed',
    );
  }

  return (await response.json()) as RiderLoginResponse;
}

export async function getRequestedRides(): Promise<
  RequestedRide[]
> {
  const token = getRiderAuthToken();

  if (!token) {
    throw new Error(
      'Rider authentication is required.',
    );
  }

  const response = await fetch(
    `${API_URL}/rides/requested`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw await parseError(
      response,
      'Unable to load ride requests',
    );
  }

  return (await response.json()) as RequestedRide[];
}

export async function getActiveRiderRide(): Promise<RequestedRide | null> {
  const token = getRiderAuthToken();
  if (!token) throw new Error('Rider authentication is required.');
  const response = await fetch(`${API_URL}/rides/rider/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response, 'Unable to load current ride');
  return (await response.json()) as RequestedRide | null;
}

export async function getRiderRideHistory(): Promise<RequestedRide[]> {
  const token = getRiderAuthToken();
  if (!token) throw new Error('Rider authentication is required.');
  const response = await fetch(`${API_URL}/rides/rider/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw await parseError(response, 'Unable to load ride history');
  return (await response.json()) as RequestedRide[];
}

export async function getRideById(
  rideId: string,
): Promise<RequestedRide> {
  const token = getRiderAuthToken();

  if (!token) {
    throw new Error(
      'Rider authentication is required.',
    );
  }

  const response = await fetch(
    `${API_URL}/rides/${encodeURIComponent(rideId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw await parseError(
      response,
      'Unable to load ride',
    );
  }

  return (await response.json()) as RequestedRide;
}

export async function acceptRide(
  rideId: string,
): Promise<RequestedRide> {
  const token = getRiderAuthToken();

  if (!token) {
    throw new Error(
      'Rider authentication is required.',
    );
  }

  const response = await fetch(
    `${API_URL}/rides/${encodeURIComponent(rideId)}/assign`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw await parseError(
      response,
      'Unable to accept ride',
    );
  }

  return (await response.json()) as RequestedRide;
}

export type RiderRideAction = 'arrive' | 'start' | 'complete';

export async function updateRiderRide(
  rideId: string,
  action: RiderRideAction,
  body?: { otp: string },
): Promise<RequestedRide> {
  const token = getRiderAuthToken();
  if (!token) {
    throw new Error('Rider authentication is required.');
  }

  const response = await fetch(
    `${API_URL}/rides/${encodeURIComponent(rideId)}/${action}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );

  if (!response.ok) {
    throw await parseError(response, `Unable to ${action} ride`);
  }

  return (await response.json()) as RequestedRide;
}

export async function cancelRiderRide(
  rideId: string,
): Promise<RequestedRide> {
  const token = getRiderAuthToken();
  if (!token) {
    throw new Error('Rider authentication is required.');
  }

  const response = await fetch(
    `${API_URL}/rides/${encodeURIComponent(rideId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'RIDER' }),
    },
  );

  if (!response.ok) {
    throw await parseError(response, 'Unable to cancel ride');
  }

  return (await response.json()) as RequestedRide;
}

export async function registerRiderDeviceToken(
  token: string,
) {
  const authToken = getRiderAuthToken();

  if (!authToken) {
    throw new Error(
      'Rider authentication is required.',
    );
  }

  const response = await fetch(
    `${API_URL}/notifications/device-token?token=${encodeURIComponent(
      token,
    )}&platform=android`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );

  if (!response.ok) {
    throw await parseError(
      response,
      'Unable to register rider device token',
    );
  }

  return response.json();
}
