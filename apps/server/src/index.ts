import { app } from './app';
import { config } from './lib/config';
import { logger } from './lib/logger';
import { connectDatabase } from './lib/database';
import { redisClient } from './lib/redis';
import { reconcileMonitorJobs } from './lib/queue';

async function main(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Connect to Redis
    await redisClient.connect();

    // Reconcile BullMQ jobs with DB state
    await reconcileMonitorJobs();

    // Start the HTTP server
    app.listen(config.PORT, () => {
      logger.info(`Server started`, {
        port: config.PORT,
        env: config.NODE_ENV,
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

void main();
