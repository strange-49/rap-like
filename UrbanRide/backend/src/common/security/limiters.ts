import { RateLimiter } from './rate-limit';

const minute = 60_000;

// ---- Security-critical limits: SHARED (Redis when configured) ------------------------
// These must hold across every backend instance, otherwise an attacker simply
// spreads guesses over the instances behind the load balancer.

/** Login / activation attempts per client IP. */
export const authAttemptsByIp = new RateLimiter({ name: 'auth-ip', windowMs: 10 * minute, max: 30, shared: true });
/** Login attempts against a single username or e-mail (credential stuffing). */
export const authAttemptsByIdentity = new RateLimiter({ name: 'auth-identity', windowMs: 10 * minute, max: 10, shared: true });
/** New account / company registrations per client IP. */
export const registrationsByIp = new RateLimiter({ name: 'register-ip', windowMs: 60 * minute, max: 10, shared: true });
/** Failed ride-start OTP attempts per ride. */
export const startOtpFailuresByRide = new RateLimiter({ name: 'otp-fail', windowMs: 10 * minute, max: 5, shared: true });
/** Start-OTP (re)generation requests per ride. */
export const startOtpIssuesByRide = new RateLimiter({ name: 'otp-issue', windowMs: 10 * minute, max: 30, shared: true });

// ---- Coarse guards: in-memory per instance (cheap, no Redis round trip per request) --

/** Map / geocoding lookups per client IP (protects the upstream providers). */
export const locationLookupsByIp = new RateLimiter({ name: 'location-ip', windowMs: minute, max: 120 });
/** Coarse global guard for every authenticated API call, per client IP. */
export const apiRequestsByIp = new RateLimiter({ name: 'api-ip', windowMs: minute, max: 900 });
/** Rider GPS uploads per rider (about one every 1-2 seconds is plenty). */
export const locationUpdatesByRider = new RateLimiter({ name: 'rider-location', windowMs: 10_000, max: 10 });
/** Chat messages per sender (flood / spam guard). */
export const chatMessagesByUser = new RateLimiter({ name: 'chat-user', windowMs: 60_000, max: 30 });
