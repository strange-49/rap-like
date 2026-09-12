import type { Coordinates } from './location.service';

export interface RouteResult {
  distanceInKilometers: number;
  durationInMinutes: number;
}

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export async function getDrivingRoute(
  from: Coordinates,
  to: Coordinates,
): Promise<RouteResult> {
  const url =
    `${OSRM_BASE_URL}/` +
    `${from.longitude},${from.latitude};` +
    `${to.longitude},${to.latitude}` +
    '?overview=false';

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Routing service failed with status ${response.status}.`,
    );
  }

  const data = (await response.json()) as {
    routes?: Array<{
      distance: number;
      duration: number;
    }>;
  };

  const route = data.routes?.[0];

  if (!route) {
    throw new Error('No driving route was found.');
  }

  return {
    distanceInKilometers:
      Math.round((route.distance / 1000) * 100) / 100,
    durationInMinutes:
      Math.round((route.duration / 60) * 100) / 100,
  };
}