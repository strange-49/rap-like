export const platformRoles = ['CUSTOMER', 'RIDER', 'CLIENT_ADMIN', 'ADMIN'] as const;

export type PlatformRole = (typeof platformRoles)[number];
