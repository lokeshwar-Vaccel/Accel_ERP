import mongoose, { Schema, Document } from 'mongoose';

// Notification Interface
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  type: 'assignment' | 'status_change' | 'contact_history' | 'follow_up' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Schema
const notificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['assignment', 'status_change', 'contact_history', 'follow_up', 'general'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  expiresAt: {
    type: Date,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ customerId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications

// Pre-save middleware to set default expiration (30 days)
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);