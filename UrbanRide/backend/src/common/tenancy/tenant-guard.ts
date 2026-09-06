import type { AuthContext } from '../auth/auth-context';
import type { TenantContext } from './tenant-context';

// A concrete guard will verify a requested resource belongs to the authenticated tenant.
export interface TenantGuard {
  assertAccess(context: AuthContext, resourceTenant: TenantContext): Promise<void>;
}
