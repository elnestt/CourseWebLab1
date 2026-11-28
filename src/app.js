import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpecs } from './config/swagger.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { metrics } from './utils/metrics.js';

const app = express();

// Довіра до проксі (для коректного Rate Limiting на хостингу Render)
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Збір HTTP-метрик
app.use((req, res, next) => {
  metrics.httpRequestsTotal += 1;
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      metrics.httpErrorsTotal += 1;
    }
  });
  next();
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT) || 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Забагато запитів з цієї IP-адреси, спробуйте пізніше' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Забагато спроб аутентифікації, спробуйте через 15 хвилин' },
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { explorer: true }));

app.use('/api', apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Маршрут не знайдено' });
});

app.use(errorHandler);

export default app;