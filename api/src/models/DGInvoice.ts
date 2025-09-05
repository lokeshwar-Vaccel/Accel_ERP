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
  partNo?: string;
  hsnNumber?: string;
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
  overallDiscount?: number; // Overall discount percentage
  overallDiscountAmount?: number; // Calculated overall discount amount
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
  dgSalesEnquiry?: mongoose.Types.ObjectId; // Link to DG Sales Enquiry
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
  billToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  supplierAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  assignedEngineer?: mongoose.Types.ObjectId; // Reference to User with Field Engineer role
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
    enum: ['kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos', 'eu'],
    default: 'nos'
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  partNo: {
    type: String,
    trim: true
  },
  hsnNumber: {
    type: String,
    trim: true
  }
});

// Invoice Schema
const DGInvoiceSchema = new Schema<IInvoice>({
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
  overallDiscount: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  overallDiscountAmount: {
    type: Number,
    required: false,
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
    default: ''
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
  dgSalesEnquiry: {
    type: Schema.Types.ObjectId,
    ref: 'DGSalesEnquiry',
    required: false
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
  billToAddress: {
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
  shipToAddress: {
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
  supplierAddress: {
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
  },
  assignedEngineer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
DGInvoiceSchema.pre('save', function (this: IInvoice, next) {
  const round2 = (n: number): number => Number(n.toFixed(2));

  // 1. Recalculate subtotal and taxAmount
  this.subtotal = round2(this.items.reduce((sum, item) => sum + round2(item.totalPrice), 0));
  this.taxAmount = round2(this.items.reduce((sum, item) => sum + round2(item.taxAmount || 0), 0));
  console.log("____step 1", this.totalAmount ,this.taxAmount, this.subtotal);

  const discount = round2(this.discountAmount || 0);

  // 2. Calculate totalAmount = subtotal + tax - discount - overallDiscountAmount
  const grandTotalBeforeOverallDiscount = round2(this.subtotal + this.taxAmount - discount);
  
  // Only recalculate overallDiscountAmount if it's not already set (preserve frontend calculation)
  if (this.overallDiscountAmount === undefined || this.overallDiscountAmount === null) {
    this.overallDiscountAmount = round2((this.overallDiscount || 0) / 100 * grandTotalBeforeOverallDiscount);
  }
  
  this.totalAmount = round2(grandTotalBeforeOverallDiscount - (this.overallDiscountAmount || 0));
  console.log("____step 2", this.totalAmount, this.taxAmount, "overallDiscountAmount:", this.overallDiscountAmount);

  // 3. Ensure paidAmount doesn't exceed total
  if (this.paidAmount > this.totalAmount) {
    this.paidAmount = this.totalAmount;
  }

  // 4. Remaining amount = total - paid
  this.remainingAmount = round2(Math.max(0, this.totalAmount - this.paidAmount));

  // 5. Auto-update payment status
  if (this.totalAmount === 0) {
    this.paymentStatus = 'paid';
    this.paidAmount = 0;
    this.remainingAmount = 0;
  } else if (this.paidAmount === 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.remainingAmount = 0;
  } else {
    this.paymentStatus = 'partial';
  }

  next();
});


// Index for efficient queries
DGInvoiceSchema.index({ customer: 1, issueDate: -1 });
DGInvoiceSchema.index({ status: 1, dueDate: 1 });
DGInvoiceSchema.index({ invoiceNumber: 1 });

export const DGInvoice = mongoose.model<IInvoice>('DGInvoice', DGInvoiceSchema); 