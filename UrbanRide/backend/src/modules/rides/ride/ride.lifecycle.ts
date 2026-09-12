import type { RideStatus } from '../../../generated/prisma/client';

import { AppError } from '../../../common/errors/app-error';

const allowedTransitions: Record<RideStatus, readonly RideStatus[]> = {
  REQUESTED: ['SEARCHING', 'CANCELLED'],
  SEARCHING: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['DRIVER_ARRIVING', 'CANCELLED'],
  DRIVER_ARRIVING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(
  currentStatus: RideStatus,
  nextStatus: RideStatus,
): boolean {
  return allowedTransitions[currentStatus].includes(nextStatus);
}

export function assertTransition(
  currentStatus: RideStatus,
  nextStatus: RideStatus,
): void {
  if (!canTransition(currentStatus, nextStatus)) {
    throw new AppError(
      `Invalid ride transition: ${currentStatus} -> ${nextStatus}`,
      400,
      'INVALID_RIDE_TRANSITION',
    );
  }
}