import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
export declare const protect: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const restrictTo: (...roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const checkModuleAccess: (module: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
export declare const checkPermission: (action: "read" | "write" | "delete") => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map