import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from 'node:http'

import { handleRideRoutes } from './modules/rides/ride/ride.routes'
import { withRequestLogging } from './common/middleware/request-logging.middleware'
import type { Logger } from './common/logging/logger'
import { createAuthController } from './modules/auth/auth.controller'
import type { DevelopmentAuthService } from './modules/auth/auth.service'
import { createAuthRoutes } from './modules/auth/auth.routes'
import { createRouter } from './routes/router'

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
])

function withCors(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    const origin = request.headers.origin

    if (origin && ALLOWED_ORIGINS.has(origin)) {
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Vary', 'Origin')
    }

    response.setHeader(
      'Access-Control-Allow-Methods',
      'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    )

    response.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Razorpay-Signature',
    )

    if (request.method === 'OPTIONS') {
      response.writeHead(204)
      response.end()
      return
    }

    await handler(request, response)
  }
}

export function createApp(
  logger: Logger,
  authService: DevelopmentAuthService,
): Server {
  const authRoutes = createAuthRoutes(
    createAuthController(authService),
  )

  const router = createRouter(
    authRoutes,
    handleRideRoutes,
    authService,
  )

  const loggedRouter = withRequestLogging(
    router,
    logger,
  )

  return createServer(withCors(loggedRouter))
}