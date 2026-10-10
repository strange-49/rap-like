import type { WebSocket } from 'ws';

import type { AuthContext } from '../common/auth/auth-context';
import type { RideEvent } from './ride-events';

type ConnectedClient = {
  socket: WebSocket;
  authContext: AuthContext | null;
};

export class WebSocketManager {
  private readonly clients = new Map<
    WebSocket,
    ConnectedClient
  >();

  add(client: WebSocket): void {
    this.clients.set(client, {
      socket: client,
      authContext: null,
    });
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
  }

  authenticate(
    client: WebSocket,
    authContext: AuthContext,
  ): void {
    const connectedClient =
      this.clients.get(client);

    if (!connectedClient) {
      return;
    }

    connectedClient.authContext =
      authContext;
  }

  getAuthContext(
    client: WebSocket,
  ): AuthContext | null {
    return (
      this.clients.get(client)?.authContext ??
      null
    );
  }

  send(
    client: WebSocket,
    message: unknown,
  ): void {
    if (client.readyState !== client.OPEN) {
      return;
    }

    client.send(JSON.stringify(message));
  }

  broadcast(message: unknown): void {
    const payload = JSON.stringify(message);

    for (const client of this.clients.values()) {
      if (
        client.socket.readyState ===
        client.socket.OPEN
      ) {
        client.socket.send(payload);
      }
    }
  }

  broadcastRideEvent(
    event: RideEvent,
  ): void {
    for (const client of this.clients.values()) {
      if (
        client.socket.readyState !==
        client.socket.OPEN
      ) {
        continue;
      }

      if (
        this.canReceiveRideEvent(
          client.authContext,
          event,
        )
      ) {
        client.socket.send(
          JSON.stringify(event),
        );
      }
    }
  }

  get size(): number {
    return this.clients.size;
  }

  private canReceiveRideEvent(
    authContext: AuthContext | null,
    event: RideEvent,
  ): boolean {
    if (!authContext) {
      return false;
    }

    if (authContext.role === 'ADMIN') {
      return true;
    }

    const customerId = this.getString(
      event.data?.customerId,
    );

    const riderId = this.getString(
      event.data?.riderId,
    );

    if (authContext.role === 'CUSTOMER') {
      return (
        customerId === authContext.subjectId
      );
    }

    if (authContext.role === 'RIDER') {
      if (event.type === 'ride.requested') {
        return true;
      }

      return riderId === authContext.subjectId;
    }

    if (authContext.role === 'CLIENT_ADMIN') {
      return true;
    }

    return false;
  }

  private getString(
    value: unknown,
  ): string | undefined {
    return typeof value === 'string'
      ? value
      : undefined;
  }
}