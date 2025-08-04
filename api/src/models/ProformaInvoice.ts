import mongoose, { Schema, Document } from 'mongoose';

export interface IProformaInvoice extends Document {
  invoiceNumber: string;
  customer: any;
  dgPurchaseOrder?: any;
  quotation?: any;
  issueDate: Date;
  dueDate: Date;
  items: {
    description: string;
    specifications: string;
    kva: string;
    phase: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  companyDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    gst: string;
    bankDetails: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  terms: string;
  notes: string;
  status: 'draft' | 'sent' | 'approved' | 'used' | 'expired';
  purpose: 'loan' | 'finance' | 'advance' | 'other';
  validUntil: Date;
  createdBy: any;
}

const ProformaInvoiceSchema = new Schema<IProformaInvoice>({
  invoiceNumber: { 
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
  dgPurchaseOrder: { 
    type: Schema.Types.ObjectId, 
    ref: 'DGPurchaseOrder' 
  },
  quotation: { 
    type: Schema.Types.ObjectId, 
    ref: 'Quotation' 
  },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date },
  items: [{
    description: { type: String, required: true },
    specifications: { type: String },
    kva: { type: String },
    phase: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 18, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  totalTax: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  advanceAmount: { type: Number, default: 0, min: 0 },
  balanceAmount: { type: Number, required: true, min: 0 },
  customerAddress: {
    address: { type: String, required: true },
    state: { type: String, required: true },
    district: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  companyDetails: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    pan: { type: String, required: true },
    gst: { type: String, required: true },
    bankDetails: {
      bankName: { type: String, required: true },
      accountNo: { type: String, required: true },
      ifsc: { type: String, required: true },
      branch: { type: String, required: true }
    }
  },
  terms: { type: String },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'approved', 'used', 'expired'],
    default: 'draft'
  },
  purpose: { 
    type: String, 
    enum: ['loan', 'finance', 'advance', 'other'],
    required: true 
  },
  validUntil: { type: Date, required: true },
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

ProformaInvoiceSchema.index({ invoiceNumber: 1 });
ProformaInvoiceSchema.index({ customer: 1 });
ProformaInvoiceSchema.index({ status: 1 });

export const ProformaInvoice = mongoose.model<IProformaInvoice>('ProformaInvoice', ProformaInvoiceSchema); 