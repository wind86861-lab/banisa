import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from '../utils/errors';

export const validate = (schema: ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            }) as { body?: any; query?: any; params?: any };
            // Replace with parsed data to strip unknown fields
            if (parsed.body) req.body = parsed.body;
            if (parsed.query) req.query = parsed.query;
            if (parsed.params) req.params = parsed.params;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(new AppError('Validation failed', 400, ErrorCodes.VALIDATION_ERROR, error.issues));
            } else {
                next(error);
            }
        }
    };
};
