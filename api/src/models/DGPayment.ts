import mongoose, { Schema, Document } from 'mongoose';

export interface IDGPayment extends Document {
  paymentNumber: string;
  customer: any;
  dgInvoice: any;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'dd' | 'rtgs' | 'neft';
  paymentReference: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    chequeNumber?: string;
    ddNumber?: string;
    utrNumber?: string;
  };
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'bounced';
  paymentType: 'advance' | 'partial' | 'full' | 'final';
  notes: string;
  receivedBy: any;
  verifiedBy?: any;
  verificationDate?: Date;
  createdBy: any;
}

const DGPaymentSchema = new Schema<IDGPayment>({
  paymentNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  customer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  dgInvoice: { 
    type: Schema.Types.ObjectId, 
    ref: 'DGInvoice',
    required: true 
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  paymentDate: { 
    type: Date, 
    required: true 
  },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'dd', 'rtgs', 'neft'],
    required: true 
  },
  paymentReference: { 
    type: String, 
    required: true,
    trim: true 
  },
  bankDetails: {
    bankName: { type: String },
    accountNo: { type: String },
    ifsc: { type: String },
    chequeNumber: { type: String },
    ddNumber: { type: String },
    utrNumber: { type: String }
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled', 'bounced'],
    default: 'pending'
  },
  paymentType: { 
    type: String, 
    enum: ['advance', 'partial', 'full', 'final'],
    required: true 
  },
  notes: { type: String },
  receivedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  verifiedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  verificationDate: { type: Date },
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

DGPaymentSchema.index({ paymentNumber: 1 });
DGPaymentSchema.index({ customer: 1 });
DGPaymentSchema.index({ dgInvoice: 1 });
DGPaymentSchema.index({ status: 1 });
DGPaymentSchema.index({ paymentDate: 1 });

export const DGPayment = mongoose.model<IDGPayment>('DGPayment', DGPaymentSchema); 