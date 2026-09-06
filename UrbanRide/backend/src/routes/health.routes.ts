import type { ServerResponse } from 'node:http';

function sendStatus(response: ServerResponse, status: 'ok' | 'ready'): void {
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ status }));
}

export function sendHealth(response: ServerResponse): void {
  sendStatus(response, 'ok');
}

export function sendReadiness(response: ServerResponse): void {
  // Dependency checks will be added as infrastructure becomes available.
  sendStatus(response, 'ready');
}
