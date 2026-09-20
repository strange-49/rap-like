import type { IncomingMessage, ServerResponse } from 'node:http'

import { handleAdminController } from './admin.controller'

export async function handleAdminRoutes(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  )

  if (!url.pathname.startsWith('/admin/')) {
    return false
  }

  return handleAdminController(request, response, url.pathname)
}
