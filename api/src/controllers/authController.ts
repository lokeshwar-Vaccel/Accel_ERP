import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse, UserRole, UserStatus } from '../types';
import { AppError } from '../middleware/errorHandler';
import jwt from 'jsonwebtoken';
import { Request } from 'express';// TODO: Implement email service
import { log } from 'console';
import { sendEmail } from '../utils/email';

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

    // Check if user already exists (excluding deleted users)
    const existingUser = await User.findOne({ 
      email: email,
      status: { $ne: UserStatus.DELETED }
    });
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
    const { email, password, rememberMe } = req.body;

    // Validate email & password
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    console.log("email:",email,password);
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    console.log("user12:",user);
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

    // Generate token with appropriate expiration based on rememberMe
    const token = user.generateJWT(rememberMe);

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

    if (newPassword.length < 8 || newPassword.length > 16) {
      return next(new AppError('New password must be between 8-16 characters long', 400));
    }

    // Check for uppercase, lowercase, special character, and no spaces
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    const hasNoSpaces = !/\s/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasSpecialChar || !hasNoSpaces) {
      return next(new AppError('Password must contain at least one uppercase letter, one lowercase letter, one special character, and no spaces', 400));
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


export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({ success: false, message: "User not found" });
    return;
  }
  const token = user.generateJWT();
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
  const resetLink = `${frontendBaseUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Sun Power Services</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #0a0e1a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 40px auto; background-color: #1c2526; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
        <tr>
          <td style="padding: 40px 30px; text-align: center;">
            <h1 style="font-size: 24px; color: #ffffff; margin: 0 0 20px;">Sun Power Services</h1>
            <p style="font-size: 16px; color: #ffffff; margin: 0 0 10px;">Hello ${user.firstName},</p>
            <p style="font-size: 16px; color: #b0b8c4; line-height: 1.5; margin: 0 0 30px;">You requested a password reset. Click the button below to proceed:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #1e90ff; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 25px; transition: background-color 0.3s ease;">Reset Your Password</a>
            <p style="font-size: 14px; color: #b0b8c4; line-height: 1.5; margin: 30px 0 0;">If you did not request this, please ignore this email or contact our support team at <a href="mailto:support@sunpowerservices.com" style="color: #1e90ff; text-decoration: none;">support@sunpowerservices.com</a>.</p>
            <p style="font-size: 14px; color: #6c757d; margin: 20px 0 0;">© 2025 Sun Power Services. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await sendEmail(user.email, 'Click to Reset Password', html);
    res.status(200).json({ success: true, message: "Reset link sent to your email" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to send email", error: error.message, details: error });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;
  try {
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    user.password = newPassword; 
    await user.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (err: any) {
    res.status(400).json({ success: false, message: "Invalid or expired token" });
  }
}; 