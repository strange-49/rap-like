import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AuthContext } from '../../common/auth/auth-context'
import { handleCorporateController } from './corporate.controller'

export async function handleCorporateRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
  if (!url.pathname.startsWith('/corporate/')) return false
  return handleCorporateController(request, response, url.pathname, authContext)
}
