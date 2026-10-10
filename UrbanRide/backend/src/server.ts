import { WebSocketServer } from 'ws'

import { createApp } from './app'
import { loadConfig } from './config/environment'
import { consoleLogger } from './common/logging/logger'
import { websocketManager } from './realtime/realtime'
import { createDevelopmentAuthService } from './modules/auth/auth.service'

const config = loadConfig(process.env)

const authService =
  createDevelopmentAuthService()

const server = createApp(
  consoleLogger,
  authService,
)

const websocketServer = new WebSocketServer({
  server,
  path: '/ws',
})

websocketServer.on('connection', (client) => {
  websocketManager.add(client)

  consoleLogger.info(
    'websocket.connected',
    {
      clients: websocketManager.size,
    },
  )

  websocketManager.send(client, {
    type: 'connection.ready',
    message:
      'Connected to UrbanRide real-time server.',
    authenticated: false,
  })

  client.on('message', async (rawMessage) => {
    try {
      const message = JSON.parse(
        rawMessage.toString(),
      ) as unknown

      if (
        !isRecord(message) ||
        message.type !== 'auth'
      ) {
        websocketManager.send(client, {
          type: 'error',
          code: 'AUTHENTICATION_REQUIRED',
          message:
            'Send an auth message with your session token.',
        })

        return
      }

      const token =
        typeof message.token === 'string'
          ? message.token.trim()
          : ''

      if (!token) {
        websocketManager.send(client, {
          type: 'auth.error',
          code: 'AUTH_TOKEN_REQUIRED',
          message:
            'Authentication token is required.',
        })

        return
      }

      const authContext =
        await authService.authenticate(token)

      if (!authContext) {
        websocketManager.send(client, {
          type: 'auth.error',
          code: 'INVALID_AUTH_TOKEN',
          message:
            'Authentication token is invalid or expired.',
        })

        client.close(
          1008,
          'Authentication failed.',
        )

        return
      }

      websocketManager.authenticate(
        client,
        authContext,
      )

      websocketManager.send(client, {
        type: 'auth.success',
        principal: authContext,
      })

      consoleLogger.info(
        'websocket.authenticated',
        {
          subjectId:
            authContext.subjectId,
          role: authContext.role,
        },
      )
    } catch (error) {
      consoleLogger.error(
        'websocket.message_failed',
        {
          error: String(error),
        },
      )

      websocketManager.send(client, {
        type: 'error',
        code: 'INVALID_WEBSOCKET_MESSAGE',
        message:
          'Invalid WebSocket message.',
      })
    }
  })

  client.on('close', () => {
    websocketManager.remove(client)

    consoleLogger.info(
      'websocket.disconnected',
      {
        clients: websocketManager.size,
      },
    )
  })

  client.on('error', (error) => {
    consoleLogger.error(
      'websocket.client_error',
      {
        error: String(error),
      },
    )
  })
})

server.listen(config.port, () => {
  consoleLogger.info(
    'backend.started',
    {
      port: config.port,
      environment: config.nodeEnv,
    },
  )
})

server.on('error', (error) => {
  consoleLogger.error(
    'backend.failed_to_start',
    {
      error: String(error),
    },
  )

  process.exitCode = 1
})

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}