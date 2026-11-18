import { AppError } from '../../common/errors/app-error';
import { CircuitBreaker } from '../../common/resilience/circuit-breaker';
import { TieredCache } from '../../infrastructure/tiered-cache';

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export interface LocationSearchResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

// The public Nominatim server allows ~1 request/second and requires an
// identifying User-Agent. For production run your own Nominatim/Photon or use
// a paid geocoder, and set GEOCODER_USER_AGENT to something with a contact.
const NOMINATIM_BASE_URL = (process.env.NOMINATIM_BASE_URL ?? 'https://nominatim.openstreetmap.org').replace(/\/$/, '');
const USER_AGENT = process.env.GEOCODER_USER_AGENT ?? 'UrbanRide/0.1.0';
const TIMEOUT_MS = Number(process.env.GEOCODER_TIMEOUT_MS) || 4_000;
const MIN_INTERVAL_MS = process.env.GEOCODER_MIN_INTERVAL_MS === undefined ? 1_000 : Number(process.env.GEOCODER_MIN_INTERVAL_MS);
const MAX_PENDING = 8;
const MAX_QUERY_LENGTH = 200;

// After 3 consecutive failures answer 502 immediately for 30 s instead of waiting for the timeout each time.
const geocoderBreaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30_000 });

const searchCache = new TieredCache<LocationSearchResult[]>('geo-search', 10 * 60_000, 300);
const geocodeCache = new TieredCache<GeocodingResult>('geo-forward', 10 * 60_000, 300);
const reverseCache = new TieredCache<GeocodingResult>('geo-reverse', 30 * 60_000, 500);

/** Spaces outbound requests so we stay inside the upstream usage policy. */
let nextSlotAt = 0;
let pending = 0;

async function waitForSlot(): Promise<void> {
  if (!Number.isFinite(MIN_INTERVAL_MS) || MIN_INTERVAL_MS <= 0) return;
  if (pending >= MAX_PENDING) {
    throw new AppError('Location search is busy. Please try again in a moment.', 503, 'GEOCODER_BUSY');
  }
  pending += 1;
  try {
    const now = Date.now();
    const slot = Math.max(now, nextSlotAt);
    nextSlotAt = slot + MIN_INTERVAL_MS;
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
  } finally {
    pending -= 1;
  }
}

async function nominatimFetch<T>(url: URL): Promise<T> {
  if (geocoderBreaker.isOpen()) {
    throw new AppError('The location service is temporarily unavailable.', 502, 'GEOCODER_UNAVAILABLE');
  }
  await waitForSlot();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    geocoderBreaker.recordFailure();
    throw new AppError('The location service is not responding.', 502, 'GEOCODER_UNAVAILABLE');
  }
  if (!response.ok) {
    geocoderBreaker.recordFailure();
    throw new AppError(`The location service failed with status ${response.status}.`, 502, 'GEOCODER_UNAVAILABLE');
  }
  geocoderBreaker.recordSuccess();
  return (await response.json()) as T;
}

function normalizeQuery(query: string): string {
  return query.trim().replace(/\s+/g, ' ').slice(0, MAX_QUERY_LENGTH);
}

export async function searchLocations(
  query: string,
): Promise<LocationSearchResult[]> {
  const normalized = normalizeQuery(query);
  const key = normalized.toLowerCase();
  const cached = await searchCache.get(key);
  if (cached) return cached;

  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', normalized);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '5');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('countrycodes', 'in');

  const data = await nominatimFetch<Array<{ lat: string; lon: string; display_name: string }>>(url);

  const results = data.map((result) => ({
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  }));
  await searchCache.set(key, results);
  return results;
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult> {
  const normalized = normalizeQuery(address);
  const key = normalized.toLowerCase();
  const cached = await geocodeCache.get(key);
  if (cached) return cached;

  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.set('q', normalized);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const data = await nominatimFetch<Array<{ lat: string; lon: string; display_name: string }>>(url);

  const result = data[0];
  if (!result) {
    throw new AppError('No location was found for the given address.', 404, 'LOCATION_NOT_FOUND');
  }

  const geocoded = {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    displayName: result.display_name,
  };
  await geocodeCache.set(key, geocoded);
  return geocoded;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> {
  // ~11 m precision: nearby taps share one cached answer.
  const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = await reverseCache.get(key);
  if (cached) return cached;

  const url = new URL(`${NOMINATIM_BASE_URL}/reverse`);
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('format', 'json');

  const data = await nominatimFetch<{ lat?: string; lon?: string; display_name?: string }>(url);

  if (!data.lat || !data.lon || !data.display_name) {
    throw new AppError('No address was found for the given coordinates.', 404, 'LOCATION_NOT_FOUND');
  }

  const result = {
    latitude: Number(data.lat),
    longitude: Number(data.lon),
    displayName: data.display_name,
  };
  await reverseCache.set(key, result);
  return result;
}
