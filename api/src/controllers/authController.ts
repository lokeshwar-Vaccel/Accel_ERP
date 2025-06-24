import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse, UserRole } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Private (Super Admin only)
export const register = async (
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
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(new AppError('Your account has been deactivated. Please contact admin.', 401));
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = user.generateJWT();

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const user = await User.findById(req.user?.id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (address) user.address = address;

    await user.save();

    const response: APIResponse = {
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
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
export const changePassword = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Please provide current and new password', 400));
    }

    if (newPassword.length < 6) {
      return next(new AppError('New password must be at least 6 characters long', 400));
    }

    const user = await User.findById(req.user?.id).select('+password');
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return next(new AppError('Current password is incorrect', 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    const response: APIResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just send a success response
    const response: APIResponse = {
      success: true,
      message: 'Logged out successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 