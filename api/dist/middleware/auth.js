"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = exports.checkModuleAccess = exports.restrictTo = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const types_1 = require("../types");
const errorHandler_1 = require("./errorHandler");
const protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new errorHandler_1.AppError('Not authorized to access this route', 401));
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const currentUser = await User_1.User.findById(decoded.id).select('-password');
        if (!currentUser) {
            return next(new errorHandler_1.AppError('The user belonging to this token no longer exists', 401));
        }
        if (currentUser.status !== 'active') {
            return next(new errorHandler_1.AppError('Your account has been deactivated. Please contact admin.', 401));
        }
        req.user = {
            id: currentUser._id.toString(),
            email: currentUser.email,
            role: currentUser.role,
            moduleAccess: currentUser.moduleAccess
        };
        next();
    }
    catch (error) {
        return next(new errorHandler_1.AppError('Not authorized to access this route', 401));
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new errorHandler_1.AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
const checkModuleAccess = (module) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AppError('Not authorized', 401));
        }
        if (req.user.role === types_1.UserRole.SUPER_ADMIN || req.user.role === types_1.UserRole.ADMIN) {
            return next();
        }
        if (!req.user.moduleAccess.includes(module)) {
            return next(new errorHandler_1.AppError(`You do not have access to ${module} module`, 403));
        }
        next();
    };
};
exports.checkModuleAccess = checkModuleAccess;
const checkPermission = (action) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new errorHandler_1.AppError('Not authorized', 401));
        }
        if (req.user.role === types_1.UserRole.SUPER_ADMIN || req.user.role === types_1.UserRole.ADMIN) {
            return next();
        }
        if (req.user.role === types_1.UserRole.VIEWER && action !== 'read') {
            return next(new errorHandler_1.AppError('You only have read-only access', 403));
        }
        if (req.user.role === types_1.UserRole.HR) {
            const hrModules = ['user_management', 'inventory_management', 'finance'];
            const requestedModule = req.baseUrl.split('/')[3];
            if (!hrModules.includes(requestedModule)) {
                return next(new errorHandler_1.AppError('You do not have access to this module', 403));
            }
        }
        if (req.user.role === types_1.UserRole.MANAGER) {
            const restrictedModules = ['admin_settings'];
            const requestedModule = req.baseUrl.split('/')[3];
            if (restrictedModules.includes(requestedModule)) {
                return next(new errorHandler_1.AppError('You do not have access to admin settings', 403));
            }
        }
        next();
    };
};
exports.checkPermission = checkPermission;
//# sourceMappingURL=auth.js.map