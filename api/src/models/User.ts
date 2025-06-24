import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser, UserRole, UserStatus } from '../types';

const userSchema = new Schema<IUser>({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.VIEWER,
    required: [true, 'User role is required']
  },
  status: {
    type: String,
    enum: Object.values(UserStatus),
    default: UserStatus.ACTIVE
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  address: {
    type: String,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  moduleAccess: [{
    type: String,
    enum: [
      'user_management',
      'customer_management',
      'inventory_management',
      'service_management',
      'amc_management',
      'reports_analytics',
      'admin_settings',
      'finance'
    ]
  }],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  lastLoginAt: {
    type: Date
  },
  profileImage: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateJWT = function(): string {
  const secret = process.env.JWT_SECRET || 'fallback-secret-key';
  const payload = { 
    id: this._id,
    email: this.email,
    role: this.role 
  };
  
  // @ts-ignore - Bypassing JWT typing issues
  return jwt.sign(payload, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
};

// Set default module access based on role
userSchema.pre('save', function(next) {
  if (!this.isNew && !this.isModified('role')) return next();

  switch (this.role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.ADMIN:
      this.moduleAccess = [
        'user_management',
        'customer_management',
        'inventory_management',
        'service_management',
        'amc_management',
        'reports_analytics',
        'admin_settings',
        'finance'
      ];
      break;
    case UserRole.HR:
      this.moduleAccess = [
        'user_management',
        'inventory_management',
        'finance'
      ];
      break;
    case UserRole.MANAGER:
      this.moduleAccess = [
        'user_management',
        'customer_management',
        'inventory_management',
        'service_management',
        'amc_management',
        'reports_analytics',
        'finance'
      ];
      break;
    case UserRole.VIEWER:
      this.moduleAccess = []; // Will be configured manually
      break;
  }
  next();
});

// Ensure super admin cannot be deleted
userSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  if (this.role === UserRole.SUPER_ADMIN) {
    throw new Error('Super admin cannot be deleted');
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema); 