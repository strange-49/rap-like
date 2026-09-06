export interface Logger {
  info(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

function write(
  level: 'info' | 'error',
  event: string,
  context: Record<string, unknown> = {},
): void {
  const entry = JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...context });
  (level === 'error' ? console.error : console.info)(entry);
}

export const consoleLogger: Logger = {
  info: (event, context) => write('info', event, context),
  error: (event, context) => write('error', event, context),
};
