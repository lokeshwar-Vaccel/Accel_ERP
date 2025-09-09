import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthenticatedRequest, UserRole } from '../types';
import { AppError } from './errorHandler';

// Protect routes - verify JWT token
export const protect = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Check if user still exists
    const currentUser = await User.findById(decoded.id).select('-password');
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // Check if user is active
    if (currentUser.status !== 'active') {
      return next(new AppError('Your account has been deactivated. Please contact admin.', 401));
    }

    // Attach user to request
    req.user = {
      id: (currentUser._id as any).toString(),
      email: currentUser.email,
      role: currentUser.role,
      moduleAccess: currentUser.moduleAccess // Array of objects
    };

    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
};

// Restrict access based on roles
export const restrictTo = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Check module access
export const checkModuleAccess = (module: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    // Super admin and admin have access to all modules
    if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check if user has access to the specific module
    const hasAccess = req.user.moduleAccess.some(
      m => m.module === module && m.access
    );

    if (!hasAccess) {
      return next(new AppError(`You do not have access to ${module} module`, 403));
    }

    next();
  };
};


// Check permission for specific actions
export const checkPermission = (action: 'read' | 'write' | 'delete') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Not authorized', 401));
    }

    const requestedModule = req.baseUrl.split('/')[3]; // assumes format /api/v1/{module}

    // Super admin and admin have all permissions
    if (req.user.role === UserRole.SUPER_ADMIN || req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Viewer role can only read
    if (req.user.role === UserRole.VIEWER && action !== 'read') {
      return next(new AppError('You only have read-only access', 403));
    }

    // HR-specific restrictions
    if (req.user.role === UserRole.HR) {
      const hrModules = ['users', 'products', 'purchase-orders', 'purchase-order-payments', 'customers'];
      if (!hrModules.includes(requestedModule)) {
        return next(new AppError('You do not have access to this module', 403));
      }
    }

    // Manager-specific restrictions
    if (req.user.role === UserRole.MANAGER) {
      const restrictedModules = ['admin_settings'];
      if (restrictedModules.includes(requestedModule)) {
        return next(new AppError('You do not have access to admin settings', 403));
      }
    }

    // Field Engineer-specific restrictions
    if (req.user.role === UserRole.FIELD_ENGINEER) {
      const fieldEngineerModules = ['services', 'amc', 'inventory', 'products'];
      if (!fieldEngineerModules.includes(requestedModule)) {
        return next(new AppError('You do not have access to this module', 403));
      }
    }

    // Check if the user has permission for this module and action
    const modulePermission = req.user.moduleAccess.find(
      m => m.module === requestedModule && m.access
    );

    // if (!modulePermission) {
    //   return next(new AppError(`You do not have access to ${requestedModule}`, 403));
    // }

    // // If action is 'write' or 'delete', user must have 'write' or 'admin' permission
    // if ((action === 'write' || action === 'delete') && !['write', 'admin'].includes(modulePermission.permission)) {
    //   return next(new AppError(`You do not have ${action} permission for ${requestedModule}`, 403));
    // }

    // // If action is 'read' and permission is at least 'read', allow
    // if (action === 'read' && !['read', 'write', 'admin'].includes(modulePermission.permission)) {
    //   return next(new AppError(`You do not have read permission for ${requestedModule}`, 403));
    // }

    next();
  };
};
