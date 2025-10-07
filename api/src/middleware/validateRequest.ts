import { Request, Response, NextFunction } from 'express';
import { AnySchema } from 'joi';
import { AppError } from '../errors/AppError';

export const validateRequest = (schema: AnySchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      return next(new AppError(`Validation error: ${errorMessage}`, 400));
    }

    // Replace the original data with validated and sanitized data
    req[source] = value;
    next();
  };
};
