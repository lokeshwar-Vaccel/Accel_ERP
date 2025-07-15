import mongoose, { Schema } from 'mongoose';

// Invoice Item Interface
export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
  taxAmount?: number;
  uom?: string;
  discount?: number;
}

// Invoice Interface
export interface IInvoice extends mongoose.Document {
  invoiceNumber: string;
  user: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number; // Amount paid so far
  remainingAmount: number; // Calculated: totalAmount - paidAmount
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentDate?: Date;
  notes?: string;
  terms?: string;
  invoiceType: 'sale' | 'purchase' | 'challan' | 'quotation' ;
  referenceId?: string; // Service ticket, AMC contract, etc.
  location: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  poNumber: string;
  supplierName: string;
  supplierEmail: string;
  externalInvoiceNumber?: string; // External/hardcopy invoice number
  externalInvoiceTotal?: number;  // External/hardcopy invoice total
  // Bank details and PAN
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  bankBranch?: string;
  // Customer address details
  customerAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  referenceNo?: string;
  referenceDate?: string;
}

// Invoice Item Schema
const invoiceItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  uom: {
    type: String,
    enum: ['pcs', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'],
    default: 'pcs'
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
});

// Invoice Schema
const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    // required: true,
    unique: true,
    trim: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default:null
    // required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default:null
    // required: true
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'razorpay', 'other']
  },
  paymentDate: Date,
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true,
    default: 'Payment due within 30 days'
  },
  invoiceType: {
    type: String,
    enum: ['sale', 'quotation', 'purchase', 'challan'],
    required: true
  },
  referenceId: {
    type: String,
    trim: true
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  externalInvoiceNumber: {
    type: String,
    required: false,
    trim: true
  },
  supplierName: {
    type: String,
    trim: true
  },
  supplierEmail: {
    type: String,
    trim: true
  },
  poNumber: {
    type: String,
    trim: true
  },
  externalInvoiceTotal: {
    type: Number,
    required: false,
    min: 0
  },
  // Bank details and PAN
  pan: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  bankAccountNo: {
    type: String,
    trim: true
  },
  bankIFSC: {
    type: String,
    trim: true
  },
  bankBranch: {
    type: String,
    trim: true
  },
  // Customer address details
  customerAddress: {
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    }
  },
  referenceNo: {
    type: String,
    trim: true
  },
  referenceDate: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(this: IInvoice, next) {

  function truncateTo(n: number): number {
  return Math.floor(n * 100) / 100;
}

  // Calculate subtotal and taxes
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.taxAmount = this.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  // this.totalAmount = this.subtotal + this.taxAmount - this.discountAmount;
  console.log("____step 2", this.totalAmount ,this.taxAmount);

  // this.taxAmount = truncateTo(this.taxAmount)
  const discount = this.discountAmount || 0;
  this.totalAmount = parseFloat((this.subtotal + this.taxAmount - discount).toFixed(2));
console.log("____step 1", this.totalAmount);
 


  
  // Ensure paidAmount doesn't exceed totalAmount
  if (this.paidAmount > this.totalAmount) {
    this.paidAmount = this.totalAmount;
  }
  
  // Calculate remaining amount
  this.remainingAmount = Math.max(0, this.totalAmount - this.paidAmount);
  
  // Auto-update payment status based on amounts
  if (this.totalAmount === 0) {
    this.paymentStatus = 'paid';
    this.paidAmount = 0;
    this.remainingAmount = 0;
  } else if (this.paidAmount === 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.remainingAmount = 0;
  } else if (this.paidAmount > 0 && this.paidAmount < this.totalAmount) {
    this.paymentStatus = 'partial';
  }
  
  next();
});

// Index for efficient queries
invoiceSchema.index({ customer: 1, issueDate: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema); 