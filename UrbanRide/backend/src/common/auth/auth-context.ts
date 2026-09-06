import type { PlatformRole } from '../authorization/roles';
import type { TenantContext } from '../tenancy/tenant-context';

// Populated by a future authentication mechanism; never supplied as trusted client input.
export interface AuthContext {
  subjectId: string;
  role: PlatformRole;
  tenant: TenantContext | null;
}
