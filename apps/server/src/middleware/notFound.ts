import type { Request, Response } from 'express';
import { NOT_FOUND } from '@uptimemonitor/shared/strings';

export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    data: null,
    error: {
      code: NOT_FOUND,
      message: 'Route not found',
    },
    message: null,
  });
}
