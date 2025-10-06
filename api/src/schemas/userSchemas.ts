import Joi from 'joi';
import { UserRole, UserStatus } from '../types';

// Password strength validation - 8-16 characters, one caps, one special character, no spacing
const validatePassword = () => {
  return Joi.string()
    .min(8)
    .max(16)
    .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/)
    .pattern(/^\S*$/)
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 16 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one special character. No spaces allowed.'
    });
};

// TypeScript interfaces for validation results
export interface RegisterUserInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: UserRole;
  phone?: string;
  address?: string;
  moduleAccess?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  role?: UserRole;
  status?: UserStatus;
  moduleAccess?: string[];
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UserQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  moduleAccess?: string;
}

// Base user schema for common fields
const baseUserFields = {
  firstName: Joi.string().min(2).max(50).trim(),
  lastName: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(500).trim()
};

// User registration schema
export const registerUserSchema = Joi.object<RegisterUserInput>({
  firstName: baseUserFields.firstName.required(),
  lastName: baseUserFields.lastName.required(),
  email: baseUserFields.email.required(),
  password: validatePassword().required(),
  role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.VIEWER),
  phone: baseUserFields.phone,
  address: baseUserFields.address,
  moduleAccess: Joi.array().items(
    Joi.string().valid(
      'dashboard',
      'user_management',
      'lead_management',
      'quotation_management',
      'product_management', 
      'inventory_management',
      'service_management',
      'amc_management',
      'purchase_orders',
      'billing',
      'dg_sales',
      'reports_analytics',
      'file_management',
      'communications',
      'admin_settings',
      'finance'
    )
  )
});

// User login schema
export const loginSchema = Joi.object<LoginInput>({
  email: baseUserFields.email.required(),
  password: Joi.string().required()
});

// Update user profile schema (for self-update)
export const updateProfileSchema = Joi.object<UpdateProfileInput>({
  firstName: baseUserFields.firstName,
  lastName: baseUserFields.lastName,
  phone: baseUserFields.phone,
  address: baseUserFields.address
});

// Update user schema (for admin updates)
export const updateUserSchema = Joi.object<UpdateUserInput>({
  firstName: baseUserFields.firstName,
  lastName: baseUserFields.lastName,
  phone: baseUserFields.phone,
  address: baseUserFields.address,
  role: Joi.string().valid(...Object.values(UserRole)),
  status: Joi.string().valid(...Object.values(UserStatus)),
  moduleAccess: Joi.array().items(
    Joi.string().valid(
      'dashboard',
      'user_management',
      'lead_management',
      'quotation_management',
      'product_management', 
      'inventory_management',
      'service_management',
      'amc_management',
      'purchase_orders',
      'billing',
      'dg_sales',
      'reports_analytics',
      'file_management',
      'communications',
      'admin_settings',
      'finance'
    )
  )
});

// Change password schema
export const changePasswordSchema = Joi.object<ChangePasswordInput>({
  currentPassword: Joi.string().required(),
  newPassword: validatePassword().required()
});

// Reset password schema (admin only)
export const resetPasswordSchema = Joi.object({
  newPassword: validatePassword().required()
});

// User query parameters schema
export const userQuerySchema = Joi.object<UserQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  role: Joi.string().valid(...Object.values(UserRole)),
  status: Joi.string().valid(...Object.values(UserStatus)),
  moduleAccess: Joi.string()
}); 