import Joi from 'joi';
import { UserRole, UserStatus } from '../types';

// Base user schema for common fields
const baseUserFields = {
  firstName: Joi.string().min(2).max(50).trim(),
  lastName: Joi.string().min(2).max(50).trim(),
  email: Joi.string().email().lowercase(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(500).trim()
};

// User registration schema
export const registerUserSchema = Joi.object({
  firstName: baseUserFields.firstName.required(),
  lastName: baseUserFields.lastName.required(),
  email: baseUserFields.email.required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid(...Object.values(UserRole)).default(UserRole.VIEWER),
  phone: baseUserFields.phone,
  address: baseUserFields.address,
  moduleAccess: Joi.array().items(
    Joi.string().valid(
      'user_management',
      'customer_management', 
      'inventory_management',
      'service_management',
      'amc_management',
      'reports_analytics',
      'admin_settings',
      'finance'
    )
  )
});

// User login schema
export const loginSchema = Joi.object({
  email: baseUserFields.email.required(),
  password: Joi.string().required()
});

// Update user profile schema (for self-update)
export const updateProfileSchema = Joi.object({
  firstName: baseUserFields.firstName,
  lastName: baseUserFields.lastName,
  phone: baseUserFields.phone,
  address: baseUserFields.address
});

// Update user schema (for admin updates)
export const updateUserSchema = Joi.object({
  firstName: baseUserFields.firstName,
  lastName: baseUserFields.lastName,
  phone: baseUserFields.phone,
  address: baseUserFields.address,
  role: Joi.string().valid(...Object.values(UserRole)),
  status: Joi.string().valid(...Object.values(UserStatus)),
  moduleAccess: Joi.array().items(
    Joi.string().valid(
      'user_management',
      'customer_management',
      'inventory_management', 
      'service_management',
      'amc_management',
      'reports_analytics',
      'admin_settings',
      'finance'
    )
  )
});

// Change password schema
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(128).required()
});

// Reset password schema (admin only)
export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).max(128).required()
});

// User query parameters schema
export const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  role: Joi.string().valid(...Object.values(UserRole)),
  status: Joi.string().valid(...Object.values(UserStatus)),
  moduleAccess: Joi.string()
}); 