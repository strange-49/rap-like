import { haversineKm, type GeoPoint } from '../common/geo/distance';
import { getRedis } from '../infrastructure/redis';

export interface RiderLocation extends GeoPoint {
  riderId: string;
  heading: number | null;
  speedKmh: number | null;
  updatedAt: number;
}

const MAX_TRACKED_RIDERS = 20_000;
/** How long a position stays valid in Redis, and the minimum gap between Redis writes per rider. */
const SHARED_TTL_MS = 120_000;
const SHARED_WRITE_MIN_INTERVAL_MS = 5_000;

const sharedKey = (riderId: string) => `rider:loc:${riderId}`;

/**
 * Sharing positions through Redis costs about one command per rider every 5-20 s
 * (roughly 4,000 per day for a rider who stays online). On a command-limited plan
 * set REDIS_SHARE_RIDER_LOCATIONS=false: positions then stay per instance.
 */
function sharingEnabled(): boolean {
  return process.env.REDIS_SHARE_RIDER_LOCATIONS !== 'false';
}

function sharedRedis() {
  return sharingEnabled() ? getRedis() : null;
}

function isRiderLocation(value: unknown): value is RiderLocation {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<RiderLocation>;
  return (
    typeof candidate.riderId === 'string' &&
    typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    typeof candidate.updatedAt === 'number'
  );
}

/**
 * Last-known rider positions.
 *
 * - Always kept in memory (instant, no I/O).
 * - When REDIS_URL is set they are ALSO shared through Redis (throttled to one
 *   write per rider every 5 s), so any backend instance can answer "where is
 *   this rider?" and target nearby riders, even if the rider's phone talks to
 *   a different instance. Positions expire after 2 minutes.
 */
export class RiderLocationStore {
  private readonly locations = new Map<string, RiderLocation>();
  private readonly lastSharedWriteAt = new Map<string, number>();

  public constructor(private readonly now: () => number = Date.now) {}

  public set(riderId: string, point: GeoPoint, extra: { heading?: number | null; speedKmh?: number | null } = {}): RiderLocation {
    if (this.locations.size >= MAX_TRACKED_RIDERS && !this.locations.has(riderId)) this.prune(5 * 60_000);
    const location: RiderLocation = {
      riderId,
      latitude: point.latitude,
      longitude: point.longitude,
      heading: extra.heading ?? null,
      speedKmh: extra.speedKmh ?? null,
      updatedAt: this.now(),
    };
    this.locations.set(riderId, location);
    return location;
  }

  /** Returns the last location (this process only) if it is fresher than `maxAgeMs`. */
  public get(riderId: string, maxAgeMs = 2 * 60_000): RiderLocation | null {
    const location = this.locations.get(riderId);
    if (!location) return null;
    return this.now() - location.updatedAt <= maxAgeMs ? location : null;
  }

  public remove(riderId: string): void {
    this.locations.delete(riderId);
    this.lastSharedWriteAt.delete(riderId);
  }

  /** Shares a position through Redis (no-op without Redis; throttled; never throws). */
  public async publishShared(location: RiderLocation): Promise<void> {
    const redis = sharedRedis();
    if (!redis) return;

    const last = this.lastSharedWriteAt.get(location.riderId) ?? 0;
    if (this.now() - last < SHARED_WRITE_MIN_INTERVAL_MS) return;
    this.lastSharedWriteAt.set(location.riderId, this.now());

    try {
      await redis.set(sharedKey(location.riderId), JSON.stringify(location), 'PX', SHARED_TTL_MS);
    } catch {
      // Redis hiccup: the in-memory copy still works for this instance.
    }
  }

  /** Local position, falling back to Redis (written by another instance). */
  public async getFresh(riderId: string, maxAgeMs = 2 * 60_000): Promise<RiderLocation | null> {
    const local = this.get(riderId, maxAgeMs);
    if (local) return local;

    const redis = sharedRedis();
    if (!redis) return null;
    try {
      const raw = await redis.get(sharedKey(riderId));
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRiderLocation(parsed) || this.now() - parsed.updatedAt > maxAgeMs) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  /** Batch version of getFresh: one MGET for everyone not known locally. */
  public async getManyFresh(riderIds: readonly string[], maxAgeMs = 2 * 60_000): Promise<Map<string, RiderLocation>> {
    const result = new Map<string, RiderLocation>();
    const missing: string[] = [];
    for (const riderId of new Set(riderIds)) {
      const local = this.get(riderId, maxAgeMs);
      if (local) result.set(riderId, local);
      else missing.push(riderId);
    }

    const redis = sharedRedis();
    if (!redis || missing.length === 0) return result;

    try {
      const values = await redis.mget(...missing.map(sharedKey));
      values.forEach((raw, index) => {
        if (!raw) return;
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isRiderLocation(parsed) && this.now() - parsed.updatedAt <= maxAgeMs) {
            result.set(missing[index], parsed);
          }
        } catch {
          // ignore a corrupt entry
        }
      });
    } catch {
      // fall back to what we know locally
    }
    return result;
  }

  /**
   * True when the rider is KNOWN to be farther than `radiusKm` from `point`.
   * Riders with no fresh location are NOT excluded, so older app versions
   * that never report a position keep receiving requests.
   */
  public isKnownFarFrom(riderId: string, point: GeoPoint, radiusKm: number, maxAgeMs = 2 * 60_000): boolean {
    const location = this.get(riderId, maxAgeMs);
    if (!location) return false;
    return haversineKm(location, point) > radiusKm;
  }

  public prune(maxAgeMs: number): void {
    const cutoff = this.now() - maxAgeMs;
    for (const [riderId, location] of this.locations) {
      if (location.updatedAt < cutoff) {
        this.locations.delete(riderId);
        this.lastSharedWriteAt.delete(riderId);
      }
    }
  }

  public get size(): number {
    return this.locations.size;
  }
}

export const riderLocations = new RiderLocationStore();

export function dispatchRadiusKm(): number {
  const configured = Number(process.env.DISPATCH_RADIUS_KM);
  return Number.isFinite(configured) && configured > 0 ? configured : 10;
}
