import type { PlatformRole } from '../authorization/roles';
import type { TenantContext } from '../tenancy/tenant-context';

// Corporate membership is resolved by the backend after credential verification.
export interface AuthContext {
  subjectId: string;
  role: PlatformRole;
  tenant: TenantContext | null;
  corporateAccountId?: string;
  corporateAccountName?: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  countryCode?: string | null;
}
