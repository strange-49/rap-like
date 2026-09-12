import type { WebSocket } from 'ws';

export class WebSocketManager {
  private readonly clients = new Set<WebSocket>();

  add(client: WebSocket): void {
    this.clients.add(client);
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
  }

  send(client: WebSocket, message: unknown): void {
    if (client.readyState !== client.OPEN) {
      return;
    }

    client.send(JSON.stringify(message));
  }

  broadcast(message: unknown): void {
    const payload = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  get size(): number {
    return this.clients.size;
  }
}