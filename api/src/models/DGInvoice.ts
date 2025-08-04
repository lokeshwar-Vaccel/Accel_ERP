import mongoose, { Schema, Document } from 'mongoose';

export interface IDGInvoice extends Document {
  invoiceNumber: string;
  customer: any;
  dgPurchaseOrder?: any;
  proformaInvoice?: any;
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
    serialNumbers?: string[];
  }[];
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  paidAmount: number;
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
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  deliveryStatus: 'pending' | 'shipped' | 'delivered' | 'installed' | 'commissioned';
  installationDate?: Date;
  commissioningDate?: Date;
  warrantyPeriod: number; // in months
  warrantyStartDate?: Date;
  createdBy: any;
}

const DGInvoiceSchema = new Schema<IDGInvoice>({
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
  proformaInvoice: { 
    type: Schema.Types.ObjectId, 
    ref: 'ProformaInvoice' 
  },
  quotation: { 
    type: Schema.Types.ObjectId, 
    ref: 'Quotation' 
  },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  items: [{
    description: { type: String, required: true },
    specifications: { type: String },
    kva: { type: String },
    phase: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 18, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    serialNumbers: [{ type: String }]
  }],
  subtotal: { type: Number, required: true, min: 0 },
  totalTax: { type: Number, required: true, min: 0 },
  totalDiscount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0, min: 0 },
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
    enum: ['draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  deliveryStatus: { 
    type: String, 
    enum: ['pending', 'shipped', 'delivered', 'installed', 'commissioned'],
    default: 'pending'
  },
  installationDate: { type: Date },
  commissioningDate: { type: Date },
  warrantyPeriod: { type: Number, default: 12, min: 0 },
  warrantyStartDate: { type: Date },
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

DGInvoiceSchema.index({ invoiceNumber: 1 });
DGInvoiceSchema.index({ customer: 1 });
DGInvoiceSchema.index({ status: 1 });
DGInvoiceSchema.index({ paymentStatus: 1 });
DGInvoiceSchema.index({ deliveryStatus: 1 });

export const DGInvoice = mongoose.model<IDGInvoice>('DGInvoice', DGInvoiceSchema); 