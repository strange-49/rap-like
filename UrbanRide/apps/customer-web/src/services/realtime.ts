import { getToken } from './auth'

const WEBSOCKET_URL = 'ws://localhost:3000/ws'

export type RideRealtimeEventType =
  | 'ride.requested'
  | 'ride.searching'
  | 'ride.assigned'
  | 'ride.driver_arriving'
  | 'ride.started'
  | 'ride.completed'
  | 'ride.cancelled'

export type RideRealtimeEvent = {
  type: RideRealtimeEventType
  rideId: string
  timestamp: string
  data?: Record<string, unknown>
}

type ConnectionMessage = {
  type: string
  message?: string
  code?: string
}

type RideEventListener = (
  event: RideRealtimeEvent,
) => void

export class CustomerRealtime {
  private socket: WebSocket | null = null

  private reconnectTimer:
    number | null = null

  private stopped = false

  private connectionGeneration = 0

  private readonly listeners =
    new Set<RideEventListener>()

  connect(): void {
    this.stopped = false

    if (
      this.socket &&
      (
        this.socket.readyState ===
          WebSocket.OPEN ||
        this.socket.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      return
    }

    const token = getToken()

    if (!token) {
      return
    }

    const generation =
      ++this.connectionGeneration

    const socket = new WebSocket(
      WEBSOCKET_URL,
    )

    this.socket = socket

    socket.addEventListener(
      'open',
      () => {
        if (
          this.socket !== socket ||
          generation !==
            this.connectionGeneration
        ) {
          socket.close()
          return
        }

        if (this.stopped) {
          socket.close()
          return
        }

        socket.send(
          JSON.stringify({
            type: 'auth',
            token,
          }),
        )
      },
    )

    socket.addEventListener(
      'message',
      (messageEvent) => {
        if (
          this.socket !== socket ||
          generation !==
            this.connectionGeneration
        ) {
          return
        }

        this.handleMessage(
          messageEvent.data,
        )
      },
    )

    socket.addEventListener(
      'close',
      () => {
        if (
          this.socket === socket &&
          generation ===
            this.connectionGeneration
        ) {
          this.socket = null
        }

        if (
          !this.stopped &&
          generation ===
            this.connectionGeneration
        ) {
          this.scheduleReconnect()
        }
      },
    )

    socket.addEventListener(
      'error',
      () => {
        /*
         * Do not call socket.close() here.
         *
         * The browser will complete the socket
         * close lifecycle itself. Calling close()
         * from the error handler can produce:
         *
         * "WebSocket is closed before the
         * connection is established."
         */
      },
    )
  }

  disconnect(): void {
    this.stopped = true

    this.connectionGeneration += 1

    if (this.reconnectTimer !== null) {
      window.clearTimeout(
        this.reconnectTimer,
      )

      this.reconnectTimer = null
    }

    const socket = this.socket

    this.socket = null

    if (!socket) {
      return
    }

    if (
      socket.readyState ===
        WebSocket.OPEN ||
      socket.readyState ===
        WebSocket.CONNECTING
    ) {
      socket.close()
    }
  }

  subscribe(
    listener: RideEventListener,
  ): () => void {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  private handleMessage(
    rawMessage: unknown,
  ): void {
    if (
      typeof rawMessage !== 'string'
    ) {
      return
    }

    try {
      const message =
        JSON.parse(rawMessage) as
          | ConnectionMessage
          | RideRealtimeEvent

      if (
        message.type ===
          'connection.ready' ||
        message.type ===
          'auth.success'
      ) {
        return
      }

      if (
        message.type ===
          'auth.error' ||
        message.type === 'error'
      ) {
        console.error(
          'UrbanRide realtime error:',
          message,
        )

        return
      }

      if (
        !this.isRideEvent(message)
      ) {
        return
      }

      for (const listener of this.listeners) {
        listener(message)
      }
    } catch (error) {
      console.error(
        'Failed to parse UrbanRide realtime message.',
        error,
      )
    }
  }

  private scheduleReconnect(): void {
    if (
      this.stopped ||
      this.reconnectTimer !== null
    ) {
      return
    }

    this.reconnectTimer =
      window.setTimeout(() => {
        this.reconnectTimer = null

        if (!this.stopped) {
          this.connect()
        }
      }, 3000)
  }

  private isRideEvent(
    message:
      | ConnectionMessage
      | RideRealtimeEvent,
  ): message is RideRealtimeEvent {
    return (
      message.type ===
        'ride.requested' ||
      message.type ===
        'ride.searching' ||
      message.type ===
        'ride.assigned' ||
      message.type ===
        'ride.driver_arriving' ||
      message.type ===
        'ride.started' ||
      message.type ===
        'ride.completed' ||
      message.type ===
        'ride.cancelled'
    )
  }
}

export const customerRealtime =
  new CustomerRealtime()