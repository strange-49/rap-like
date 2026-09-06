import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import type { AuthContext } from '../../common/auth/auth-context';
import type {
  DevelopmentLoginRequest,
  DevelopmentSession,
  DevelopmentTestUser,
} from './auth.types';
import { developmentTestUsers } from './development-users';

export interface DevelopmentAuthService {
  login(input: DevelopmentLoginRequest): DevelopmentSession | null;
  authenticate(token: string): AuthContext | null;
}

const sessionLifetimeMs = 8 * 60 * 60 * 1000;

export function createDevelopmentAuthService(): DevelopmentAuthService {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development authentication must not run in production.');
  }

  const sessions = new Map<string, { expiresAt: number; principal: AuthContext }>();

  return {
    login(input) {
      const user = developmentTestUsers.find((candidate) => candidate.username === input.username);
      if (!user || !passwordMatches(input.password, user)) return null;

      const token = randomBytes(32).toString('hex');
      const expiresAt = Date.now() + sessionLifetimeMs;
      const principal: AuthContext = {
        subjectId: `development:${user.username}`,
        role: user.role,
        tenant: user.tenantId ? { tenantId: user.tenantId } : null,
      };
      sessions.set(token, { expiresAt, principal });
      return { token, expiresAt: new Date(expiresAt).toISOString(), principal };
    },
    authenticate(token) {
      const session = sessions.get(token);
      if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(token);
        return null;
      }
      return session.principal;
    },
  };
}

function passwordMatches(password: string, user: DevelopmentTestUser): boolean {
  const expected = scryptSync(user.password, user.username, 64);
  const actual = scryptSync(password, user.username, 64);
  return timingSafeEqual(expected, actual);
}
