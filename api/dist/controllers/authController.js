"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.changePassword = exports.updateProfile = exports.getMe = exports.login = exports.register = void 0;
const User_1 = require("../models/User");
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role, phone, address, moduleAccess } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return next(new errorHandler_1.AppError('User with this email already exists', 400));
        }
        const user = await User_1.User.create({
            firstName,
            lastName,
            email,
            password,
            role: role || types_1.UserRole.VIEWER,
            phone,
            address,
            moduleAccess,
            createdBy: req.user?.id
        });
        const response = {
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    moduleAccess: user.moduleAccess
                }
            }
        };
        res.status(201).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new errorHandler_1.AppError('Please provide email and password', 400));
        }
        const user = await User_1.User.findOne({ email }).select('+password');
        if (!user) {
            return next(new errorHandler_1.AppError('Invalid credentials', 401));
        }
        if (user.status !== 'active') {
            return next(new errorHandler_1.AppError('Your account has been deactivated. Please contact admin.', 401));
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return next(new errorHandler_1.AppError('Invalid credentials', 401));
        }
        user.lastLoginAt = new Date();
        await user.save();
        const token = user.generateJWT();
        const response = {
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    moduleAccess: user.moduleAccess,
                    lastLoginAt: user.lastLoginAt
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.user?.id);
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        const response = {
            success: true,
            message: 'User profile retrieved successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    phone: user.phone,
                    address: user.address,
                    moduleAccess: user.moduleAccess,
                    profileImage: user.profileImage,
                    lastLoginAt: user.lastLoginAt,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
const updateProfile = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, address } = req.body;
        const user = await User_1.User.findById(req.user?.id);
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (phone)
            user.phone = phone;
        if (address)
            user.address = address;
        await user.save();
        const response = {
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    phone: user.phone,
                    address: user.address
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return next(new errorHandler_1.AppError('Please provide current and new password', 400));
        }
        if (newPassword.length < 6) {
            return next(new errorHandler_1.AppError('New password must be at least 6 characters long', 400));
        }
        const user = await User_1.User.findById(req.user?.id).select('+password');
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return next(new errorHandler_1.AppError('Current password is incorrect', 400));
        }
        user.password = newPassword;
        await user.save();
        const response = {
            success: true,
            message: 'Password changed successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.changePassword = changePassword;
const logout = async (req, res, next) => {
    try {
        const response = {
            success: true,
            message: 'Logged out successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
//# sourceMappingURL=authController.js.map