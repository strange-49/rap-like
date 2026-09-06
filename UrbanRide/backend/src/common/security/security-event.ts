export type SecurityEventType =
  | 'AUTHENTICATION_SUCCEEDED'
  | 'AUTHENTICATION_FAILED'
  | 'AUTHORIZATION_DENIED'
  | 'TENANT_ACCESS_DENIED';

// Security event persistence and delivery are intentionally not implemented yet.
export interface SecurityEvent {
  type: SecurityEventType;
  occurredAt: Date;
  subjectId?: string;
}
