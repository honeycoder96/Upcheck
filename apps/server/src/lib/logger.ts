import winston from 'winston';
import { config } from './config';

const { combine, timestamp, printf, json, colorize, errors } = winston.format;

const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, process: proc, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${ts} [${proc ?? 'api'}] ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.NODE_ENV === 'development' ? devFormat : prodFormat,
  }),
];

if (config.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  defaultMeta: { process: 'api' },
  transports,
});
