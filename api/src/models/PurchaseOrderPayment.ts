import mongoose, { Schema, Document } from 'mongoose';

// Payment Method Details Interface
export interface IPaymentMethodDetails {
  // Cash Payment
  cash?: {
    receivedBy?: string;
    receiptNumber?: string;
  };
  
  // Cheque Payment
  cheque?: {
    chequeNumber: string;
    bankName: string;
    branchName?: string;
    issueDate: Date;
    clearanceDate?: Date;
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  
  // Bank Transfer
  bankTransfer?: {
    bankName: string;
    branchName?: string;
    accountNumber: string;
    ifscCode: string;
    transactionId: string;
    transferDate: Date;
    accountHolderName?: string;
    referenceNumber?: string;
  };
  
  // UPI Payment
  upi?: {
    upiId: string;
    transactionId: string;
    transactionReference?: string;
    payerName?: string;
    payerPhone?: string;
  };
  
  // Card Payment
  card?: {
    cardType: 'credit' | 'debit' | 'prepaid';
    cardNetwork: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
    lastFourDigits: string;
    transactionId: string;
    authorizationCode?: string;
    cardHolderName?: string;
  };
  
  // Other Payment Methods
  other?: {
    methodName: string;
    referenceNumber?: string;
    additionalDetails?: Record<string, any>;
  };
}

// Purchase Order Payment Interface
export interface IPurchaseOrderPayment extends Document {
  purchaseOrderId: mongoose.Types.ObjectId;
  poNumber: string;
  supplierId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'other';
  paymentMethodDetails: IPaymentMethodDetails;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  notes?: string;
  receiptNumber?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Purchase Order Payment Schema
const purchaseOrderPaymentSchema = new Schema<IPurchaseOrderPayment>({
  purchaseOrderId: {
    type: Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  poNumber: {
    type: String,
    required: true,
    trim: true
  },
  supplierId: {
    type: Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other']
  },
  paymentMethodDetails: {
    cash: {
      receivedBy: String,
      receiptNumber: String
    },
    cheque: {
      chequeNumber: { type: String, required: true },
      bankName: { type: String, required: true },
      branchName: String,
      issueDate: { type: Date, required: true },
      clearanceDate: Date,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String
    },
    bankTransfer: {
      bankName: { type: String, required: true },
      branchName: String,
      accountNumber: { type: String, required: true },
      ifscCode: { type: String, required: true },
      transactionId: { type: String, required: true },
      transferDate: { type: Date, required: true },
      accountHolderName: String,
      referenceNumber: String
    },
    upi: {
      upiId: { type: String, required: true },
      transactionId: { type: String, required: true },
      transactionReference: String,
      payerName: String,
      payerPhone: String
    },
    card: {
      cardType: { type: String, required: true, enum: ['credit', 'debit', 'prepaid'] },
      cardNetwork: { type: String, required: true, enum: ['visa', 'mastercard', 'amex', 'rupay', 'other'] },
      lastFourDigits: { type: String, required: true },
      transactionId: { type: String, required: true },
      authorizationCode: String,
      cardHolderName: String
    },
    other: {
      methodName: { type: String, required: true },
      referenceNumber: String,
      additionalDetails: Schema.Types.Mixed
    }
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
purchaseOrderPaymentSchema.index({ purchaseOrderId: 1, createdAt: -1 });
purchaseOrderPaymentSchema.index({ poNumber: 1 });
purchaseOrderPaymentSchema.index({ supplierId: 1 });
purchaseOrderPaymentSchema.index({ paymentMethod: 1 });
purchaseOrderPaymentSchema.index({ paymentStatus: 1 });
purchaseOrderPaymentSchema.index({ paymentDate: 1 });

export const PurchaseOrderPayment = mongoose.model<IPurchaseOrderPayment>('PurchaseOrderPayment', purchaseOrderPaymentSchema); 