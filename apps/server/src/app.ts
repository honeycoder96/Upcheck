import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './lib/config';
import { requestLogger } from './middleware/requestLogger';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { authRouter } from './routes/auth.router';
import { monitorsRouter } from './routes/monitors.router';
import { heartbeatRouter } from './routes/heartbeat.router'
import { alertChannelsRouter } from './routes/alertChannels.router';
import { dashboardRouter } from './routes/dashboard.router';
import { usersRouter } from './routes/users.router';
import { orgRouter } from './routes/org.router';
import { statusRouter } from './routes/status.router';

const app = express();

// Trust the first proxy hop (nginx container).
// nginx passes X-Forwarded-For: $http_x_real_ip so XFF contains only the real
// client IP — no Cloudflare edge or Traefik IPs in the chain.
app.set('trust proxy', 1);

// 1. Request logger
app.use(requestLogger);

// 2. CORS
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// 3. Helmet
app.use(helmet());

// 4. Body parser
app.use(express.json({ limit: '1mb' }));

// 5. Cookie parser
app.use(cookieParser());

// 6. Auth middleware
app.use(authMiddleware);

// 7. Health check route
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.status(200).json({
    data: { status: 'ok' },
    error: null,
    message: null,
  });
});

// 8. Auth routes
app.use('/api/v1/auth', authRouter);

// 9. Monitor routes
app.use('/api/v1/monitors', monitorsRouter);

// 10. Heartbeat routes (public — auth middleware skips these)
app.use('/api/v1/heartbeat', heartbeatRouter);

// 11. Alert channel routes
app.use('/api/v1/alert-channels', alertChannelsRouter);

// 12. Dashboard routes
app.use('/api/v1/dashboard', dashboardRouter);

// 13. Users routes
app.use('/api/v1/users', usersRouter);

// 14. Org routes
app.use('/api/v1/org', orgRouter);

// 15. Public status routes (no auth required — auth middleware skips /api/v1/status/*)
app.use('/api/v1/status', statusRouter);

// 16. 404 handler
app.use(notFound);

// 17. Global error handler
app.use(errorHandler);

export { app };
