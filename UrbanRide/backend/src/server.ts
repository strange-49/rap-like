import { WebSocketServer } from 'ws';

import { createApp } from './app';
import { loadConfig } from './config/environment';
import { consoleLogger } from './common/logging/logger';
import { websocketManager } from './realtime/realtime';

const config = loadConfig(process.env);
const server = createApp(consoleLogger);

const websocketServer = new WebSocketServer({
  server,
  path: '/ws',
});

websocketServer.on('connection', (client) => {
  websocketManager.add(client);

  consoleLogger.info('websocket.connected', {
    clients: websocketManager.size,
  });

  client.on('close', () => {
    websocketManager.remove(client);

    consoleLogger.info('websocket.disconnected', {
      clients: websocketManager.size,
    });
  });

  websocketManager.send(client, {
    type: 'connection.ready',
    message: 'Connected to UrbanRide real-time server.',
  });
});

server.listen(config.port, () => {
  consoleLogger.info('backend.started', {
    port: config.port,
    environment: config.nodeEnv,
  });
});

server.on('error', (error) => {
  consoleLogger.error('backend.failed_to_start', {
    error: String(error),
  });

  process.exitCode = 1;
});