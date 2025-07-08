import mongoose, { Schema, Document } from 'mongoose';

// Notification Interface
export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  type: 'assignment' | 'status_change' | 'contact_update' | 'follow_up' | 'payment_received' | 'invoice_created';
  content: string;
  entityId: mongoose.Types.ObjectId; // Related customer/invoice/contact ID
  entityType: 'customer' | 'invoice' | 'contact' | 'payment';
  createdAt: Date;
  isRead: boolean;
  metadata?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: Date;
}

// Notification Schema
const notificationSchema = new Schema<INotification>({
  recipientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['assignment', 'status_change', 'contact_update', 'follow_up', 'payment_received', 'invoice_created'],
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  entityId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['customer', 'invoice', 'contact', 'payment'],
    index: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1 });
notificationSchema.index({ entityId: 1, entityType: 1 });

// Pre-save middleware to set expiration for certain notification types
notificationSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    // Set expiration based on notification type
    const now = new Date();
    switch (this.type) {
      case 'follow_up':
        this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        break;
      case 'payment_received':
        this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        break;
      default:
        this.expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    }
  }
  next();
});

export const Notification = mongoose.model<INotification>('Notification', notificationSchema); 