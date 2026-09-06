import { createApp } from './app';
import { loadConfig } from './config/environment';
import { consoleLogger } from './common/logging/logger';

const config = loadConfig(process.env);
const server = createApp(consoleLogger);

server.listen(config.port, () => {
  consoleLogger.info('backend.started', { port: config.port, environment: config.nodeEnv });
});

server.on('error', (error) => {
  consoleLogger.error('backend.failed_to_start', { error: String(error) });
  process.exitCode = 1;
});
