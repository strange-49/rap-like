import type { AuthContext } from '../auth/auth-context';
import type { PermissionRequirement } from './permissions';

// A concrete guard will enforce role and permission requirements after authentication.
export interface AuthorizationGuard {
  authorize(context: AuthContext, requirement: PermissionRequirement): Promise<void>;
}
