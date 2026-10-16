import type { AuthContext } from '../auth/auth-context';
import type { PlatformRole } from './roles';
import { AppError } from '../errors/app-error';

export function requireRole(
  authContext: AuthContext | null | undefined,
  allowedRoles: readonly PlatformRole[],
): asserts authContext is AuthContext {
  if (!authContext) {
    throw new AppError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  }

  if (!allowedRoles.includes(authContext.role)) {
    throw new AppError('You do not have permission to access this resource.', 403, 'FORBIDDEN');
  }
}
