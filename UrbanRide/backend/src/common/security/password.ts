import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keyLength: number,
) => Promise<Buffer>;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 200;

/**
 * Hashes a password with a random per-password salt: `scrypt$<salt>$<hex>`.
 * Uses the async scrypt so a burst of logins never blocks the event loop.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

/**
 * Verifies a password. Accepts the current format and the legacy format that
 * used the username as the salt, so existing accounts can still sign in.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  legacySalt: string,
): Promise<boolean> {
  try {
    const parts = storedHash.split('$');
    const isModern = parts.length === 3 && parts[0] === 'scrypt';
    const salt = isModern ? parts[1] : legacySalt;
    const expectedHex = isModern ? parts[2] : storedHash;
    if (!salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex) || expectedHex.length % 2 !== 0) {
      return false;
    }
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(password, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function needsPasswordHashUpgrade(storedHash: string): boolean {
  return !storedHash.startsWith('scrypt$');
}
