export interface BackendConfig {
  nodeEnv: string;
  port: number;
}

export function loadConfig(environment: NodeJS.ProcessEnv): BackendConfig {
  const configuredPort = environment.PORT ?? '3000';
  const port = Number(configuredPort);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return {
    nodeEnv: environment.NODE_ENV ?? 'development',
    port,
  };
}
