import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
export declare const getUsers: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const createUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const deleteUser: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const resetPassword: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getUserStats: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=userController.d.ts.map