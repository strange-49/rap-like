import type { AuthContext } from '../../common/auth/auth-context';
import type { PlatformRole } from '../../common/authorization/roles';

export interface DevelopmentLoginRequest {
  username: string;
  password: string;
}

export interface DevelopmentTestUser {
  username: string;
  password: string;
  role: PlatformRole;
  tenantId: string | null;
}

export interface DevelopmentSession {
  token: string;
  expiresAt: string;
  principal: AuthContext;
}
