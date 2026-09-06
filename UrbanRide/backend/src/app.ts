import { createServer, type Server } from 'node:http';

import { withRequestLogging } from './common/middleware/request-logging.middleware';
import type { Logger } from './common/logging/logger';
import { createAuthController } from './modules/auth/auth.controller';
import { createDevelopmentAuthService } from './modules/auth/auth.service';
import { createAuthRoutes } from './modules/auth/auth.routes';
import { createRouter } from './routes/router';

export function createApp(logger: Logger): Server {
  const authService = createDevelopmentAuthService();
  const authRoutes = createAuthRoutes(createAuthController(authService));
  const router = createRouter(authRoutes);

  return createServer(withRequestLogging(router, logger));
}
