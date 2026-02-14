import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import config from './config';
import logger from './utils/logger';
import chatbotRoutes from './routes/chatbotRoutes';
import dummyRoutes from './routes/dummyRoutes';

const app: Express = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Health check route
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'rideshare-chatbot-api',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/dummy', dummyRoutes);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'RideShare Chatbot API',
    version: '1.0.0',
    endpoints: {
      chatbot: '/api/chatbot',
      dummy: '/api/dummy',
      dummyHealth: '/api/dummy/health',
      health: '/health',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const port = config.port;
const server = app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
