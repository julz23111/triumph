import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten() });
  }
  console.error('Unexpected error', err);
  return res.status(500).json({ error: 'Internal server error' });
}
