import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import type { AuthContext } from '../../common/auth/auth-context';
import { platformRoles } from '../../common/authorization/roles';
import {
  findUserByUsername,
  findUserById,
  updateUserPasswordHash,
  updateUserRideStartOtpPreference,
  createUser,
} from './auth.repository';
import type { DevelopmentLoginRequest, DevelopmentSession } from './auth.types';
import { authenticateCorporateEmployee, activateEmployeeInvitation } from '../corporate/corporate.service';

export interface AuthService {
  login(input: DevelopmentLoginRequest): Promise<DevelopmentSession | null>;
  corporateLogin(input: CorporateLoginRequest): Promise<DevelopmentSession | null>;
  activateCorporateEmployee(token: string, password: string): Promise<{ employeeId: string }>;
  signup(input: SignupRequest): Promise<DevelopmentSession | null>;
  authenticate(token: string): AuthContext | null;
  getRideStartOtpPreference(customerId: string): Promise<boolean | null>;
  setRideStartOtpPreference(customerId: string, enabled: boolean): Promise<boolean | null>;
}

export type DevelopmentAuthService = AuthService;

export interface SignupRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  countryCode: string;
}

export interface CorporateLoginRequest {
  accessCode: string;
  email: string;
  password: string;
}

const sessionLifetimeMs = 8 * 60 * 60 * 1000;
type SessionRecord = { expiresAt: number; principal: AuthContext };
type SignedSessionPayload = { exp: number; principal: AuthContext };

/**
 * Uses short-lived HMAC-signed bearer sessions in production and in-memory
 * sessions in development. Production requires a high-entropy secret.
 */
export function createAuthService(): AuthService {
  const production = process.env.NODE_ENV === 'production';
  const configuredSecret = process.env.AUTH_SESSION_SECRET;
  if (production && (!configuredSecret || configuredSecret.length < 32)) {
    throw new Error('AUTH_SESSION_SECRET must be set to at least 32 characters in production.');
  }
  const signingSecret = configuredSecret ?? randomBytes(32).toString('hex');
  const sessions = new Map<string, SessionRecord>();

  return {
    async login(input) {
      const username = input.username.trim().toLowerCase();
      const user = await findUserByUsername(username);
      if (!user || !user.active) return null;
      if (!passwordMatches(input.password, username, user.passwordHash)) return null;
      if (needsPasswordHashUpgrade(user.passwordHash)) {
        await updateUserPasswordHash(user.id, hashPassword(input.password));
      }
      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
      });
    },

    async signup(input) {
      const normalizedUsername = input.username.trim().toLowerCase();
      const existingUser = await findUserByUsername(normalizedUsername);
      if (existingUser) return null;
      const user = await createUser({
        username: normalizedUsername,
        passwordHash: hashPassword(input.password),
        role: 'CUSTOMER',
        tenantId: null,
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        countryCode: input.countryCode.trim(),
      });
      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
      });
    },

    async corporateLogin(input) {
      const membership = await authenticateCorporateEmployee(input.accessCode, input.email);
      if (!membership) return null;
      const user = await findUserById(membership.employee.userId!);
      if (!user || !user.active || !passwordMatches(input.password, user.username, user.passwordHash)) return null;
      if (needsPasswordHashUpgrade(user.passwordHash)) {
        await updateUserPasswordHash(user.id, hashPassword(input.password));
      }
      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
        corporateAccountId: membership.account.id, corporateAccountName: membership.account.name,
      });
    },

    async activateCorporateEmployee(token, password) {
      const activation = await activateEmployeeInvitation(token, password);
      return { employeeId: activation.user.id };
    },

    async getRideStartOtpPreference(customerId) {
      const user = await findUserById(customerId);
      return user?.rideStartOtpEnabled ?? null;
    },

    async setRideStartOtpPreference(customerId, enabled) {
      const result = await updateUserRideStartOtpPreference(customerId, enabled);
      return result.rideStartOtpEnabled;
    },

    authenticate(token) {
      if (!token) return null;
      if (!production) {
        const session = sessions.get(token);
        if (!session || session.expiresAt <= Date.now()) {
          sessions.delete(token);
          return null;
        }
        return session.principal;
      }
      return verifySignedSession(token, signingSecret);
    },
  };

  function createSession(
    userId: string,
    role: AuthContext['role'],
    tenantId: string | null,
    rideStartOtpEnabled: boolean,
    profile: Partial<AuthContext> = {},
  ): DevelopmentSession {
    const expiresAt = Date.now() + sessionLifetimeMs;
    const principal: AuthContext = { subjectId: userId, role, tenant: tenantId ? { tenantId } : null, ...profile };
    let token: string;
    if (production) {
      const payload: SignedSessionPayload = { exp: Math.floor(expiresAt / 1000), principal };
      const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const signature = createHmac('sha256', signingSecret).update(encoded).digest('base64url');
      token = `${encoded}.${signature}`;
    } else {
      token = randomBytes(32).toString('hex');
      sessions.set(token, { expiresAt, principal });
    }
    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      principal,
      preferences: role === 'CUSTOMER' ? { rideStartOtpEnabled } : null,
    };
  }
}

// Backward-compatible export for callers that still use the old name.
export const createDevelopmentAuthService = createAuthService;

function verifySignedSession(token: string, secret: string): AuthContext | null {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encoded, suppliedSignature] = parts;
  const expected = createHmac('sha256', secret).update(encoded).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(suppliedSignature, 'base64url'); } catch { return null; }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Partial<SignedSessionPayload>;
    const principal = payload.principal;
    if (!Number.isInteger(payload.exp) || (payload.exp as number) <= Math.floor(Date.now() / 1000)) return null;
    if (!principal || typeof principal.subjectId !== 'string' || !principal.subjectId || !platformRoles.includes(principal.role)) return null;
    if (principal.tenant !== null && (typeof principal.tenant !== 'object' || typeof principal.tenant.tenantId !== 'string')) return null;
    return principal;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function passwordMatches(password: string, username: string, storedHash: string): boolean {
  try {
    // Current format uses a random per-password salt. The legacy format used
    // the username as salt; it remains readable so existing accounts can log in.
    const parts = storedHash.split('$');
    const isModern = parts.length === 3 && parts[0] === 'scrypt';
    const salt = isModern ? parts[1] : username;
    const expectedHex = isModern ? parts[2] : storedHash;
    if (!salt || !expectedHex || !/^[0-9a-f]+$/i.test(expectedHex) || expectedHex.length % 2 !== 0) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = scryptSync(password, salt, expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

function needsPasswordHashUpgrade(storedHash: string): boolean {
  return !storedHash.startsWith('scrypt$');
}
