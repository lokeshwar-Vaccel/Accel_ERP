import mongoose, { Schema, Document } from 'mongoose';

// Payment Method Details Interface (reusing from PurchaseOrderPayment)
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
    bankName?: string;
    branchName?: string;
    accountNumber?: string;
    ifscCode?: string;
    transactionId?: string;
    transferDate: Date;
    accountHolderName?: string;
    referenceNumber?: string;
  };
  
  // UPI Payment
  upi?: {
    upiId?: string;
    transactionId?: string;
    transactionReference?: string;
    payerName?: string;
    payerPhone?: string;
  };
  
  // Card Payment
  card?: {
    cardType?: 'credit' | 'debit' | 'prepaid';
    cardNetwork?: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
    lastFourDigits?: string;
    transactionId?: string;
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

// Invoice Payment Interface
export interface IInvoicePayment extends Document {
  invoiceId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  customerId: mongoose.Types.ObjectId;
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

// Invoice Payment Schema
const invoicePaymentSchema = new Schema<IInvoicePayment>({
  invoiceId: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    trim: true
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
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
      chequeNumber: String,
      bankName: String,
      branchName: String,
      issueDate: Date,
      clearanceDate: Date,
      accountHolderName: String,
      accountNumber: String,
      ifscCode: String
    },
    bankTransfer: {
      bankName: String,
      branchName: String,
      accountNumber: String,
      ifscCode: String,
      transactionId: String,
      transferDate: Date,
      accountHolderName: String,
      referenceNumber: String
    },
    upi: {
      upiId: String,
      transactionId: String,
      transactionReference: String,
      payerName: String,
      payerPhone: String
    },
    card: {
      cardType: { type: String, enum: ['credit', 'debit', 'prepaid'] },
      cardNetwork: { type: String, enum: ['visa', 'mastercard', 'amex', 'rupay', 'other'] },
      lastFourDigits: String,
      transactionId: String,
      authorizationCode: String,
      cardHolderName: String
    },
    other: {
      methodName: String,
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
invoicePaymentSchema.index({ invoiceId: 1, createdAt: -1 });
invoicePaymentSchema.index({ invoiceNumber: 1 });
invoicePaymentSchema.index({ customerId: 1 });
invoicePaymentSchema.index({ paymentMethod: 1 });
invoicePaymentSchema.index({ paymentStatus: 1 });
invoicePaymentSchema.index({ paymentDate: 1 });

export const InvoicePayment = mongoose.model<IInvoicePayment>('InvoicePayment', invoicePaymentSchema);
