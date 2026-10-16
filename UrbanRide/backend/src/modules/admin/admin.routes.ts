import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireRole } from '../../common/authorization/require-role';
import { handleAdminController } from './admin.controller';

export async function handleAdminRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null = null,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (!url.pathname.startsWith('/admin/')) return false;

  // Defense in depth: the router also resolves the bearer token, but this
  // module independently enforces ADMIN access before reading admin data.
  requireRole(authContext, ['ADMIN']);
  return handleAdminController(request, response, url.pathname);
}
