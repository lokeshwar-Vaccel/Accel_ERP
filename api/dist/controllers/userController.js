"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.resetPassword = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUser = exports.getUsers = void 0;
const User_1 = require("../models/User");
const types_1 = require("../types");
const errorHandler_1 = require("../middleware/errorHandler");
const getUsers = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, sort = '-createdAt', search, role, status } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        if (role) {
            query.role = role;
        }
        if (status) {
            query.status = status;
        }
        const options = {
            page: Number(page),
            limit: Number(limit),
            sort,
            populate: [
                { path: 'createdBy', select: 'firstName lastName email' }
            ]
        };
        const users = await User_1.User.find(query)
            .populate('createdBy', 'firstName lastName email')
            .sort(sort)
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await User_1.User.countDocuments(query);
        const pages = Math.ceil(total / Number(limit));
        const response = {
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users: users.map(user => ({
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    fullName: user.fullName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    phone: user.phone,
                    moduleAccess: user.moduleAccess,
                    lastLoginAt: user.lastLoginAt,
                    createdAt: user.createdAt,
                    createdBy: user.createdBy
                }))
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const getUser = async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.params.id)
            .populate('createdBy', 'firstName lastName email');
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        const response = {
            success: true,
            message: 'User retrieved successfully',
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
                    updatedAt: user.updatedAt,
                    createdBy: user.createdBy
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUser = getUser;
const createUser = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, role, phone, address, moduleAccess } = req.body;
        const existingUser = await User_1.User.findOne({ email });
        if (existingUser) {
            return next(new errorHandler_1.AppError('User with this email already exists', 400));
        }
        if (req.user?.role !== types_1.UserRole.SUPER_ADMIN && req.user?.role !== types_1.UserRole.ADMIN) {
            if (role === types_1.UserRole.SUPER_ADMIN || role === types_1.UserRole.ADMIN) {
                return next(new errorHandler_1.AppError('You cannot assign admin roles', 403));
            }
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
            message: 'User created successfully',
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
exports.createUser = createUser;
const updateUser = async (req, res, next) => {
    try {
        const { firstName, lastName, phone, address, role, status, moduleAccess } = req.body;
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        if (user.role === types_1.UserRole.SUPER_ADMIN && req.user?.role !== types_1.UserRole.SUPER_ADMIN) {
            return next(new errorHandler_1.AppError('Cannot update super admin user', 403));
        }
        if (role && req.user?.role !== types_1.UserRole.SUPER_ADMIN) {
            if (role === types_1.UserRole.SUPER_ADMIN) {
                return next(new errorHandler_1.AppError('Only super admin can assign super admin role', 403));
            }
        }
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (phone)
            user.phone = phone;
        if (address)
            user.address = address;
        if (role)
            user.role = role;
        if (status)
            user.status = status;
        if (moduleAccess)
            user.moduleAccess = moduleAccess;
        await user.save();
        const response = {
            success: true,
            message: 'User updated successfully',
            data: {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    phone: user.phone,
                    address: user.address,
                    moduleAccess: user.moduleAccess
                }
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res, next) => {
    try {
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        if (user.role === types_1.UserRole.SUPER_ADMIN) {
            return next(new errorHandler_1.AppError('Cannot delete super admin user', 403));
        }
        if (user._id.toString() === req.user?.id) {
            return next(new errorHandler_1.AppError('You cannot delete your own account', 403));
        }
        await User_1.User.findByIdAndDelete(req.params.id);
        const response = {
            success: true,
            message: 'User deleted successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.deleteUser = deleteUser;
const resetPassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return next(new errorHandler_1.AppError('New password must be at least 6 characters long', 400));
        }
        const user = await User_1.User.findById(req.params.id);
        if (!user) {
            return next(new errorHandler_1.AppError('User not found', 404));
        }
        if (user.role === types_1.UserRole.SUPER_ADMIN && req.user?.role !== types_1.UserRole.SUPER_ADMIN) {
            return next(new errorHandler_1.AppError('Cannot reset super admin password', 403));
        }
        user.password = newPassword;
        await user.save();
        const response = {
            success: true,
            message: 'Password reset successfully'
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.resetPassword = resetPassword;
const getUserStats = async (req, res, next) => {
    try {
        const totalUsers = await User_1.User.countDocuments();
        const activeUsers = await User_1.User.countDocuments({ status: types_1.UserStatus.ACTIVE });
        const inactiveUsers = await User_1.User.countDocuments({ status: types_1.UserStatus.INACTIVE });
        const suspendedUsers = await User_1.User.countDocuments({ status: types_1.UserStatus.SUSPENDED });
        const usersByRole = await User_1.User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]);
        const recentUsers = await User_1.User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('firstName lastName email role createdAt');
        const response = {
            success: true,
            message: 'User statistics retrieved successfully',
            data: {
                totalUsers,
                activeUsers,
                inactiveUsers,
                suspendedUsers,
                usersByRole,
                recentUsers
            }
        };
        res.status(200).json(response);
    }
    catch (error) {
        next(error);
    }
};
exports.getUserStats = getUserStats;
//# sourceMappingURL=userController.js.map