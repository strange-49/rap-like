import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http'

import { sendError } from '../common/errors/http-error-handler'
import type { HttpHandler } from '../common/middleware/request-logging.middleware'
import type { DevelopmentAuthService } from '../modules/auth/auth.service'
import {
  handleDeviceTokenRoutes,
} from '../modules/notifications/device-token.controller'
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
  authService: DevelopmentAuthService,
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

      if (
        url.pathname.startsWith('/notifications/')
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
        const handled =
          await handleCommunicationRoutes(
            request,
            response,
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
        const handled =
          await handleAdminRoutes(
            request,
            response,
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
        sendReadiness(response)
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
