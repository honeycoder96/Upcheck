import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

export const redisClient = new Redis(config.REDIS_URI, {
  lazyConnect: true,
});

redisClient.on('connect', () => {
  logger.info('Redis connected', { uri: config.REDIS_URI });
});

redisClient.on('error', (error) => {
  logger.error('Redis connection error', { error });
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});
