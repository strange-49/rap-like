const DEVELOPMENT_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

/**
 * Browser origins allowed to call the API and open WebSockets.
 * Set CORS_ALLOWED_ORIGINS="https://app.example.com,https://admin.example.com"
 * in production. In development the Vite localhost ports are always allowed.
 */
export function allowedOrigins(environment: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = (environment.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const production = environment.NODE_ENV === 'production';
  return new Set(production ? configured : [...DEVELOPMENT_ORIGINS, ...configured]);
}

/** Requests without an Origin header (native apps, curl) are not browser-CORS traffic. */
export function isOriginAllowed(
  origin: string | undefined,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!origin) return true;
  return allowedOrigins(environment).has(origin);
}
