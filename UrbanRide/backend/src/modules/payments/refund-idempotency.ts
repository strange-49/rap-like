import { createHash } from 'node:crypto';

/** Stable for an ambiguous retry; changes only after a confirmed failed attempt. */
export function refundIdempotencyKey(paymentId: string, attempt: number): string {
  const digest = createHash('sha256').update(paymentId).digest('hex').slice(0, 16);
  return `ur-refund-${digest}-${attempt}`;
}
