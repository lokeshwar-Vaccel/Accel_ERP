import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse, UserRole, UserStatus, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private
export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt', search, role, status } = req.query as QueryParams & {
      role?: UserRole;
      status?: UserStatus | 'all';
    };

    // Build query
    const query: any = {};
    
    // By default, exclude soft-deleted users unless explicitly requested
    if (status === 'all') {
      // Include all users including deleted ones
    } else if (status) {
      query.status = status;
    } else {
      // Default: exclude deleted users
      query.status = { $ne: UserStatus.DELETED };
    }
    
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

    // Execute query with pagination
    const options = {
      page: Number(page),
      limit: Number(limit),
      sort,
      populate: [
        { path: 'createdBy', select: 'firstName lastName email' }
      ]
    };

    const users = await User.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort(sort as string)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
export const getUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/v1/users
// @access  Private (Admin only)
export const createUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, phone, address, moduleAccess } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Validate role assignment permissions
    if (req.user?.role !== UserRole.SUPER_ADMIN && req.user?.role !== UserRole.ADMIN) {
      if (role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN) {
        return next(new AppError('You cannot assign admin roles', 403));
      }
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: role || UserRole.VIEWER,
      phone,
      address,
      moduleAccess,
      createdBy: req.user?.id
    });

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin only)
export const updateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, phone, address, role, status, moduleAccess } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent updating super admin
    if (user.role === UserRole.SUPER_ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
      return next(new AppError('Cannot update super admin user', 403));
    }

    // Validate role assignment permissions
    if (role && req.user?.role !== UserRole.SUPER_ADMIN) {
      if (role === UserRole.SUPER_ADMIN) {
        return next(new AppError('Only super admin can assign super admin role', 403));
      }
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (role) user.role = role;
    if (status) user.status = status;
    if (moduleAccess) user.moduleAccess = moduleAccess;

    await user.save();

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (Soft Delete)
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin only)
export const deleteUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user is already deleted
    if (user.status === UserStatus.DELETED) {
      return next(new AppError('User is already deleted', 400));
    }

    // Prevent deleting super admin
    if (user.role === UserRole.SUPER_ADMIN) {
      return next(new AppError('Cannot delete super admin user', 403));
    }

    // Prevent users from deleting themselves
    if ((user._id as any).toString() === req.user?.id) {
      return next(new AppError('You cannot delete your own account', 403));
    }

    // Soft delete: Set status to DELETED instead of removing from database
    user.status = UserStatus.DELETED;
    await user.save();

    const response: APIResponse = {
      success: true,
      message: 'User deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Reset user password
// @route   PUT /api/v1/users/:id/reset-password
// @access  Private (Admin only)
export const resetPassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return next(new AppError('New password must be at least 6 characters long', 400));
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Prevent resetting super admin password by non-super admin
    if (user.role === UserRole.SUPER_ADMIN && req.user?.role !== UserRole.SUPER_ADMIN) {
      return next(new AppError('Cannot reset super admin password', 403));
    }

    user.password = newPassword;
    await user.save();

    const response: APIResponse = {
      success: true,
      message: 'Password reset successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Restore deleted user
// @route   PUT /api/v1/users/:id/restore
// @access  Private (Admin only)
export const restoreUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user is actually deleted
    if (user.status !== UserStatus.DELETED) {
      return next(new AppError('User is not deleted', 400));
    }

    // Restore user by setting status to ACTIVE
    user.status = UserStatus.ACTIVE;
    await user.save();

    const response: APIResponse = {
      success: true,
      message: 'User restored successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private (Admin only)
export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Exclude deleted users from main stats
    const totalUsers = await User.countDocuments({ status: { $ne: UserStatus.DELETED } });
    const activeUsers = await User.countDocuments({ status: UserStatus.ACTIVE });
    const inactiveUsers = await User.countDocuments({ status: UserStatus.INACTIVE });
    const suspendedUsers = await User.countDocuments({ status: UserStatus.SUSPENDED });
    const deletedUsers = await User.countDocuments({ status: UserStatus.DELETED });

    const usersByRole = await User.aggregate([
      {
        $match: { status: { $ne: UserStatus.DELETED } }
      },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    const recentUsers = await User.find({ status: { $ne: UserStatus.DELETED } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email role createdAt');

    const response: APIResponse = {
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        suspendedUsers,
        deletedUsers,
        usersByRole,
        recentUsers
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 