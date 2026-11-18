import type { AuthContext } from '../auth/auth-context';

export interface RideAccessFields {
  customerId: string;
  riderId: string | null;
  corporateAccountId: string | null;
}

/**
 * Single source of truth for "may this caller see / act on this ride?".
 *
 * - ADMIN: any ride
 * - CUSTOMER: only their own rides
 * - RIDER: only rides assigned to them
 * - CLIENT_ADMIN: only rides booked under THEIR OWN company. The caller's
 *   company id must be resolved server-side (never taken from the request).
 */
export function canAccessRide(
  ride: RideAccessFields,
  auth: Pick<AuthContext, 'role' | 'subjectId'>,
  callerCorporateAccountId: string | null = null,
): boolean {
  switch (auth.role) {
    case 'ADMIN':
      return true;
    case 'CUSTOMER':
      return ride.customerId === auth.subjectId;
    case 'RIDER':
      return ride.riderId === auth.subjectId;
    case 'CLIENT_ADMIN':
      return Boolean(callerCorporateAccountId) && ride.corporateAccountId === callerCorporateAccountId;
    default:
      return false;
  }
}
