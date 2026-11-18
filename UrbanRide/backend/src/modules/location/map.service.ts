import { TieredCache } from '../../infrastructure/tiered-cache';
import { consoleLogger } from '../../common/logging/logger';
import { CircuitBreaker } from '../../common/resilience/circuit-breaker';
import { calculateDistance, type Coordinates } from './location.service';

export interface RouteResult {
  distanceInKilometers: number;
  durationInMinutes: number;
  /** True when the routing service was unreachable and a straight-line estimate was used. */
  approximate?: boolean;
}

// The public OSRM demo server is fine for development but NOT for production
// traffic. Point OSRM_BASE_URL at your own OSRM / a paid routing provider.
const OSRM_BASE_URL = (
  process.env.OSRM_BASE_URL ?? 'https://router.project-osrm.org/route/v1/driving'
).replace(/\/$/, '');
const ROUTING_TIMEOUT_MS = Number(process.env.ROUTING_TIMEOUT_MS) || 4_000;
// Straight-line distance understates road distance; this factor is a common rule of thumb.
const ROAD_DISTANCE_FACTOR = 1.3;
const FALLBACK_SPEED_KMH = 22;

// Shared via Redis when configured, so one instance's lookup warms the others.
// After 3 consecutive failures skip OSRM for 30 s instead of making every booking wait for the timeout.
const routingBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30_000 });

const routeCache = new TieredCache<RouteResult>('route', 10 * 60_000, 500);

/** Rounds to ~11 m so near-identical requests share one cached route. */
function cacheKey(from: Coordinates, to: Coordinates): string {
  const round = (value: number) => value.toFixed(4);
  return `${round(from.latitude)},${round(from.longitude)}>${round(to.latitude)},${round(to.longitude)}`;
}

export async function getDrivingRoute(
  from: Coordinates,
  to: Coordinates,
): Promise<RouteResult> {
  const key = cacheKey(from, to);
  const cached = await routeCache.get(key);
  if (cached) return cached;

  if (routingBreaker.isOpen()) return estimateRoute(from, to);

  try {
    const route = await fetchOsrmRoute(from, to);
    routingBreaker.recordSuccess();
    await routeCache.set(key, route);
    return route;
  } catch (error) {
    routingBreaker.recordFailure();
    // Never let a routing outage block booking: fall back to a straight-line
    // estimate (not cached, so the real route is retried next time).
    consoleLogger.error('routing.fallback', { error: String(error) });
    return estimateRoute(from, to);
  }
}

async function fetchOsrmRoute(from: Coordinates, to: Coordinates): Promise<RouteResult> {
  const url =
    `${OSRM_BASE_URL}/` +
    `${from.longitude},${from.latitude};` +
    `${to.longitude},${to.latitude}` +
    '?overview=false';

  // Without a timeout a slow routing server would hang every booking request.
  const response = await fetch(url, { signal: AbortSignal.timeout(ROUTING_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Routing service failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    routes?: Array<{ distance: number; duration: number }>;
  };

  const route = data.routes?.[0];
  if (!route) throw new Error('No driving route was found.');

  return {
    distanceInKilometers: Math.round((route.distance / 1000) * 100) / 100,
    durationInMinutes: Math.round((route.duration / 60) * 100) / 100,
  };
}

export function estimateRoute(from: Coordinates, to: Coordinates): RouteResult {
  const roadKm = Math.round(calculateDistance(from, to) * ROAD_DISTANCE_FACTOR * 100) / 100;
  return {
    distanceInKilometers: roadKm,
    durationInMinutes: Math.round((roadKm / FALLBACK_SPEED_KMH) * 60 * 100) / 100,
    approximate: true,
  };
}
