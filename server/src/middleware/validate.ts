import { AnyZodObject, ZodEffects } from 'zod';
import { Request, Response, NextFunction } from 'express';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

export function validateBody(schema: Schema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.body = await schema.parseAsync(req.body);
    next();
  };
}

export function validateQuery(schema: Schema) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    req.query = await schema.parseAsync(req.query);
    next();
  };
}
