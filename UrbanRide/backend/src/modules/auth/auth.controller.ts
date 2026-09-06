import type { IncomingMessage, ServerResponse } from 'node:http';

import { ValidationError } from '../../common/validation/validation-error';
import type { DevelopmentAuthService } from './auth.service';
import type { DevelopmentLoginRequest } from './auth.types';

export interface AuthController {
  login(request: IncomingMessage, response: ServerResponse): Promise<void>;
  currentSession(request: IncomingMessage, response: ServerResponse): void;
}

export function createAuthController(service: DevelopmentAuthService): AuthController {
  return {
    async login(request, response) {
      const input = await readLoginRequest(request);
      const session = service.login(input);
      if (!session) {
        response.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        response.end(
          JSON.stringify({
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials.' },
          }),
        );
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify(session));
    },
    currentSession(request, response) {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
      const principal = service.authenticate(token);
      if (!principal) {
        response.writeHead(401, { 'content-type': 'application/json; charset=utf-8' });
        response.end(
          JSON.stringify({
            error: { code: 'UNAUTHENTICATED', message: 'Valid development token required.' },
          }),
        );
        return;
      }
      response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ principal }));
    },
  };
}

async function readLoginRequest(request: IncomingMessage): Promise<DevelopmentLoginRequest> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!isLoginRequest(value)) throw new ValidationError('username and password are required.');
    return value;
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError('Request body must be valid JSON.');
  }
}

function isLoginRequest(value: unknown): value is DevelopmentLoginRequest {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.username === 'string' && typeof candidate.password === 'string';
}
