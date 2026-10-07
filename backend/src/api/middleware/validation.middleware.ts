import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: result.error.errors.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
};
