import mongoose, { Schema, Document } from 'mongoose';

export interface IDGQuotationPayment extends Document {
  quotationId: mongoose.Types.ObjectId;
  quotationNumber: string;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'other';
  paymentMethodDetails: {
    cash?: {
      receivedBy?: string;
      receiptNumber?: string;
    };
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
    upi?: {
      upiId: string;
      transactionId: string;
      transactionReference?: string;
      payerName?: string;
      payerPhone?: string;
    };
    card?: {
      cardType: 'credit' | 'debit' | 'prepaid';
      cardNetwork: 'visa' | 'mastercard' | 'amex' | 'rupay' | 'other';
      lastFourDigits: string;
      transactionId: string;
      authorizationCode?: string;
      cardHolderName?: string;
    };
    other?: {
      methodName: string;
      referenceNumber?: string;
      additionalDetails?: any;
    };
  };
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  paymentDate: Date;
  notes?: string;
  receiptNumber?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dgQuotationPaymentSchema = new Schema<IDGQuotationPayment>({
  quotationId: {
    type: Schema.Types.ObjectId,
    ref: 'DGQuotation',
    required: true
  },
  quotationNumber: {
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
    required: true
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
dgQuotationPaymentSchema.index({ quotationId: 1 });
dgQuotationPaymentSchema.index({ quotationNumber: 1 });
dgQuotationPaymentSchema.index({ customerId: 1 });
dgQuotationPaymentSchema.index({ paymentDate: -1 });
dgQuotationPaymentSchema.index({ paymentStatus: 1 });
dgQuotationPaymentSchema.index({ createdBy: 1 });

export const DGQuotationPayment = mongoose.model<IDGQuotationPayment>('DGQuotationPayment', dgQuotationPaymentSchema);
