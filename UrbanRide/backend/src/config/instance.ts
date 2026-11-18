import { randomUUID } from 'node:crypto';

/**
 * Identifies this backend process. Sent back as the `X-Instance-Id` header
 * (handy for proving a load balancer really spreads requests) and used by the
 * Redis event bus so an instance ignores its own messages.
 * Set INSTANCE_ID when you run several copies, e.g. "api-1", "api-2".
 */
export const INSTANCE_ID: string =
  process.env.INSTANCE_ID?.trim() || `api-${randomUUID().slice(0, 8)}`;
