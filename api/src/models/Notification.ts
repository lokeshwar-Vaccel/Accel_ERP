import mongoose, { Schema, Document } from 'mongoose';

// Notification Interface
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  type: 'assignment' | 'status_change' | 'contact_history' | 'follow_up' | 'general' | 'low_stock' | 'out_of_stock' | 'over_stock' | 'payment_due' | 'amc_expiry' | 'service_reminder' | 'system_alert';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'inventory' | 'customer' | 'service' | 'payment' | 'system' | 'general';
  metadata?: Record<string, any>;
  expiresAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  actionUrl?: string; // URL to navigate when notification is clicked
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
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['assignment', 'status_change', 'contact_history', 'follow_up', 'general', 'low_stock', 'out_of_stock', 'over_stock', 'payment_due', 'amc_expiry', 'service_reminder', 'system_alert'],
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
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  category: {
    type: String,
    enum: ['inventory', 'customer', 'service', 'payment', 'system', 'general'],
    default: 'general',
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
  },
  actionUrl: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, createdAt: -1 });
notificationSchema.index({ customerId: 1, createdAt: -1 });
notificationSchema.index({ productId: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired notifications
notificationSchema.index({ priority: 1, createdAt: -1 }); // For priority-based queries

// Pre-save middleware to set default expiration (30 days)
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }
  next();
});

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = async function(userId: mongoose.Types.ObjectId): Promise<number> {
  return this.countDocuments({ userId, isRead: false });
};

// Static method to get notifications by category
notificationSchema.statics.getByCategory = async function(userId: mongoose.Types.ObjectId, category: string, limit: number = 10) {
  return this.find({ userId, category })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customerId', 'name email phone')
    .populate('productId', 'name partNo')
    .populate('createdBy', 'firstName lastName');
};

// Static method to get urgent notifications
notificationSchema.statics.getUrgentNotifications = async function(userId: mongoose.Types.ObjectId) {
  return this.find({ userId, priority: 'urgent', isRead: false })
    .sort({ createdAt: -1 })
    .populate('customerId', 'name email phone')
    .populate('productId', 'name partNo');
};

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);