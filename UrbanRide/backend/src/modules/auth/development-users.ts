import type { DevelopmentTestUser } from './auth.types';

// Development-only credentials. Replace this in-memory adapter before production use.
export const developmentTestUsers: readonly DevelopmentTestUser[] = [
  { username: 'customer', password: 'customer-dev-password', role: 'CUSTOMER', tenantId: null },
  { username: 'rider', password: 'rider-dev-password', role: 'RIDER', tenantId: null },
  {
    username: 'client_admin',
    password: 'client-admin-dev-password',
    role: 'CLIENT_ADMIN',
    tenantId: 'demo-corporation',
  },
  { username: 'admin', password: 'admin-dev-password', role: 'ADMIN', tenantId: null },
];
