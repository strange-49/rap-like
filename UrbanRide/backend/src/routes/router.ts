import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http'

import { sendError } from '../common/errors/http-error-handler'
import { apiRequestsByIp, locationLookupsByIp } from '../common/security/limiters'
import { clientIp } from '../common/security/rate-limit'
import type { AuthContext } from '../common/auth/auth-context'
import type { HttpHandler } from '../common/middleware/request-logging.middleware'
import type { AuthService } from '../modules/auth/auth.service'
import {
  handleDeviceTokenRoutes,
} from '../modules/notifications/device-token.controller'
import { handleRiderAvailabilityRoutes } from '../modules/notifications/rider-availability.controller'
import { handleNotificationTest } from '../modules/notifications/notification.controller'
import { handleCommunicationRoutes } from '../modules/communication/communication.routes'
import { handleChatRoutes } from '../modules/communication/chat.routes'
import { handleCorporateRoutes } from '../modules/corporate/corporate.routes'
import { handleAdminRoutes } from '../modules/admin/admin.routes'
import { handlePaymentRoutes } from '../modules/payments/payment.routes'
import {
  handleFareEstimate,
  handleGeocode,
  handleLocationSearch,
  handleReverseGeocode,
} from '../modules/location/location.controller'
import { handleRideRoutes } from '../modules/rides/ride/ride.routes'
import {
  sendHealth,
  sendReadiness,
} from './health.routes'

export function createRouter(
  authRoutes: HttpHandler,
  rideRoutes: typeof handleRideRoutes,
  authService: AuthService,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    try {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`,
      )

      if (url.pathname !== '/health' && url.pathname !== '/ready' && request.headers.authorization?.startsWith('Bearer ')) {
        await apiRequestsByIp.enforce(`api:${clientIp(request)}`);
      }
      if (url.pathname.startsWith('/auth/')) {
        authRoutes(request, response)
        return
      }

      if (
        url.pathname === '/rides' ||
        url.pathname.startsWith('/rides/')
      ) {
        const authorization =
          request.headers.authorization

        let authContext = null

        if (
          authorization?.startsWith('Bearer ')
        ) {
          const token = authorization
            .slice('Bearer '.length)
            .trim()

          if (token) {
            authContext =
              authService.authenticate(token)
          }
        }

        const handled = await rideRoutes(
          request,
          response,
          authContext,
        )

        if (handled) {
          return
        }
      }

      if (url.pathname === '/riders/availability') {
        const authContext = getRequestAuthContext(request, authService)
        const handled = await handleRiderAvailabilityRoutes(
          request,
          response,
          authContext,
        )
        if (handled) return
      }
      if (
        url.pathname.startsWith('/notifications/')
      ) {
        const authContext = getRequestAuthContext(request, authService)

        const handled =
          await handleDeviceTokenRoutes(
            request,
            response,
            authContext,
          )

        if (handled) {
          return
        }

        if (
          request.method === 'POST' &&
          url.pathname ===
            '/notifications/test'
        ) {
          const testHandled =
            await handleNotificationTest(
              request,
              response,
              authContext,
            )

          if (testHandled) {
            return
          }
        }
      }

      if (url.pathname.startsWith('/chat/')) {
        const authorization = request.headers.authorization
        let authContext = null
        if (authorization?.startsWith('Bearer ')) {
          const token = authorization.slice('Bearer '.length).trim()
          if (token) authContext = authService.authenticate(token)
        }
        const handled = await handleChatRoutes(request, response, authContext)
        if (handled) return
      }

      if (
        url.pathname.startsWith(
          '/communication/',
        )
      ) {
        const authContext = getRequestAuthContext(request, authService)
        const handled =
          await handleCommunicationRoutes(
            request,
            response,
            authContext,
          )

        if (handled) {
          return
        }
      }

      if (
        url.pathname.startsWith('/corporate/')
      ) {
        const authorization =
          request.headers.authorization

        let authContext = null

        if (
          authorization?.startsWith('Bearer ')
        ) {
          const token = authorization
            .slice('Bearer '.length)
            .trim()

          if (token) {
            authContext =
              authService.authenticate(token)
          }
        }

        const handled =
          await handleCorporateRoutes(
            request,
            response,
            authContext,
          )

        if (handled) {
          return
        }
      }

      if (
        url.pathname.startsWith('/admin/')
      ) {
        const authContext = getRequestAuthContext(request, authService)
        const handled =
          await handleAdminRoutes(
            request,
            response,
            authContext,
          )

        if (handled) {
          return
        }
      }

      if (
        url.pathname.startsWith('/payments/')
      ) {
        const authorization = request.headers.authorization
        let authContext = null
        if (authorization?.startsWith('Bearer ')) {
          const token = authorization.slice('Bearer '.length).trim()
          if (token) authContext = authService.authenticate(token)
        }
        const handled =
          await handlePaymentRoutes(
            request,
            response,
            authContext,
          )

        if (handled) {
          return
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname ===
          '/locations/fare-estimate'
      ) {
        await locationLookupsByIp.enforce(`loc:${clientIp(request)}`);
        const handled =
          await handleFareEstimate(
            request,
            response,
          )

        if (handled) {
          return
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname ===
          '/locations/search'
      ) {
        await locationLookupsByIp.enforce(`loc:${clientIp(request)}`);
        const handled =
          await handleLocationSearch(
            request,
            response,
          )

        if (handled) {
          return
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/location/geocode'
      ) {
        await locationLookupsByIp.enforce(`loc:${clientIp(request)}`);
        const handled =
          await handleGeocode(
            request,
            response,
          )

        if (handled) {
          return
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname ===
          '/location/reverse-geocode'
      ) {
        await locationLookupsByIp.enforce(`loc:${clientIp(request)}`);
        const handled =
          await handleReverseGeocode(
            request,
            response,
          )

        if (handled) {
          return
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/health'
      ) {
        sendHealth(response)
        return
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/ready'
      ) {
        await sendReadiness(response)
        return
      }

      response.writeHead(404, {
        'content-type':
          'application/json; charset=utf-8',
      })

      response.end(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found.',
          },
        }),
      )
    } catch (error) {
      sendError(response, error)
    }
  }
}


function getRequestAuthContext(
  request: IncomingMessage,
  authService: AuthService,
): AuthContext | null {
  const authorization = request.headers.authorization
  if (!authorization?.startsWith('Bearer ')) return null
  const token = authorization.slice('Bearer '.length).trim()
  return token ? authService.authenticate(token) : null
}
