import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('MongoDB connected', { uri: config.MONGODB_URI.replace(/\/\/.*@/, '//***@') });
  } catch (error) {
    logger.error('MongoDB connection error', { error });
    throw error;
  }

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}
