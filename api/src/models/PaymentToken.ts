import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

// Payment Token Interface
export interface IPaymentToken extends Document {
  token: string;
  invoiceId: mongoose.Types.ObjectId;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IPaymentTokenModel extends Model<IPaymentToken> {
  generateSecureToken(): string;
  createForInvoice(invoiceId: mongoose.Types.ObjectId, expiresInDays?: number): Promise<string>;
  verifyAndConsume(token: string, userId?: mongoose.Types.ObjectId): Promise<{ invoiceId: mongoose.Types.ObjectId; isValid: boolean; error?: string }>;
  cleanupExpired(): Promise<number>;
}

// Payment Token Schema
const paymentTokenSchema = new Schema<IPaymentToken>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: {
    type: Date
  },
  usedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentTokenSchema.index({ token: 1 });
paymentTokenSchema.index({ invoiceId: 1, isUsed: 1 });
paymentTokenSchema.index({ expiresAt: 1 });
paymentTokenSchema.index({ isUsed: 1, expiresAt: 1 });

// Static method to generate secure token
paymentTokenSchema.statics.generateSecureToken = function(): string {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to create token for invoice
paymentTokenSchema.statics.createForInvoice = async function(
  invoiceId: mongoose.Types.ObjectId,
  expiresInDays: number = 7
): Promise<string> {
  const token = (this as any).generateSecureToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  await this.create({
    token,
    invoiceId,
    expiresAt
  });

  return token;
};

// Static method to verify and consume token
paymentTokenSchema.statics.verifyAndConsume = async function(
  token: string,
  userId?: mongoose.Types.ObjectId
): Promise<{ invoiceId: mongoose.Types.ObjectId; isValid: boolean; error?: string }> {
  const tokenRecord = await this.findOne({ token });

  if (!tokenRecord) {
    return { invoiceId: new mongoose.Types.ObjectId(), isValid: false, error: 'Invalid token' };
  }

  if (tokenRecord.isUsed) {
    return { invoiceId: tokenRecord.invoiceId, isValid: false, error: 'Token already used' };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { invoiceId: tokenRecord.invoiceId, isValid: false, error: 'Token expired' };
  }

  // Mark token as used
  tokenRecord.isUsed = true;
  tokenRecord.usedAt = new Date();
  if (userId) {
    tokenRecord.usedBy = userId;
  }
  await tokenRecord.save();

  return { invoiceId: tokenRecord.invoiceId, isValid: true };
};

// Static method to cleanup expired tokens
paymentTokenSchema.statics.cleanupExpired = async function(): Promise<number> {
  const result = await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return result.deletedCount || 0;
};

export const PaymentToken = mongoose.model<IPaymentToken, IPaymentTokenModel>('PaymentToken', paymentTokenSchema); 