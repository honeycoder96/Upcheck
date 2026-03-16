import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { config } from '../lib/config';
import { VALIDATION_ERROR, INTERNAL_ERROR } from '@uptimemonitor/shared/strings';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const details = err.issues.map((issue) => ({
      code: issue.code.toUpperCase(),
      message: issue.message,
      field: issue.path.join('.'),
    }));

    res.status(422).json({
      data: null,
      error: {
        code: VALIDATION_ERROR,
        message: 'Validation failed',
        field: firstIssue?.path.join('.'),
        details,
      },
      message: null,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      data: null,
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {}),
      },
      message: null,
    });
    return;
  }

  // Unknown error
  logger.error('Unhandled error', {
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    method: req.method,
    path: req.path,
  });

  res.status(500).json({
    data: null,
    error: {
      code: INTERNAL_ERROR,
      message: config.NODE_ENV === 'production' ? 'An unexpected error occurred' : (err instanceof Error ? err.message : 'An unexpected error occurred'),
    },
    message: null,
  });
}
