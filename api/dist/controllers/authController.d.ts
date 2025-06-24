import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
export declare const register: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const login: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const getMe: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const updateProfile: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const changePassword: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const logout: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=authController.d.ts.map