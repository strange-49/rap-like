import {
  deleteRiderDeviceToken,
  findAllRiderDeviceTokens,
  findRiderDeviceTokens,
  registerRiderDeviceToken,
} from './device-token.repository';

export interface RegisterRiderDeviceTokenInput {
  riderId: string;
  token: string;
  platform?: string;
}

export function registerDeviceToken(
  input: RegisterRiderDeviceTokenInput,
) {
  return registerRiderDeviceToken({
    riderId: input.riderId,
    token: input.token,
    platform: input.platform,
  });
}

export function getRiderDeviceTokens(
  riderId: string,
) {
  return findRiderDeviceTokens(riderId);
}

export function getAllRiderDeviceTokens() {
  return findAllRiderDeviceTokens();
}

export function removeDeviceToken(
  token: string,
) {
  return deleteRiderDeviceToken(token);
}