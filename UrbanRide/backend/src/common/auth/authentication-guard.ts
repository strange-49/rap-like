import type { IncomingMessage } from 'node:http';

import type { AuthContext } from './auth-context';

// A concrete guard will validate credentials and attach trusted identity context.
export interface AuthenticationGuard {
  authenticate(request: IncomingMessage): Promise<AuthContext>;
}
