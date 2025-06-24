import { Request, Response, NextFunction } from 'express';
import { APIResponse } from '../types';

const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const response: APIResponse = {
    success: false,
    message: `Route ${req.originalUrl} not found`,
    error: 'Not Found'
  };
  
  res.status(404).json(response);
};

export { notFound }; 