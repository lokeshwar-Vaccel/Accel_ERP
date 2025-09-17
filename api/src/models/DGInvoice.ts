import mongoose, { Schema } from 'mongoose';

// Invoice Item Interface
export interface IInvoiceItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  uom: string;
  discount: number;
  discountedAmount: number;
  gstRate: number;
  gstAmount: number;
  kva: string;
  phase: string;
  annexureRating: string;
  dgModel: string;
  numberOfCylinders: number;
  subject: string;
  isActive: boolean;
  hsnNumber: string;
}

// Invoice Interface
export interface IInvoice extends mongoose.Document {
  invoiceNumber?: string;
  customer: mongoose.Types.ObjectId;
  customerEmail: string;
  customerAddress?: {
    address: string;
    district: string;
    state: string;
    pincode: string;
    addressId: number;
  };
  billingAddress?: {
    address: string;
    district: string;
    state: string;
    pincode: string;
    addressId: number;
    gstNumber: string;
  };
  shippingAddress?: {
    address: string;
    district: string;
    state: string;
    pincode: string;
    addressId: number;
    gstNumber: string;
  };
  invoiceDate: Date;
  dueDate: Date;
  dgQuotationNumber: mongoose.Types.ObjectId;
  poNumber?: string;
  poFromCustomer?: mongoose.Types.ObjectId;
  items: IInvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paymentTerms: string;
  notes?: string;
  deliveryNotes?: string;
  referenceNumber?: string;
  referenceDate?: Date;
  buyersOrderNumber?: string;
  buyersOrderDate?: Date;
  dispatchDocNo?: string;
  dispatchDocDate?: Date;
  destination?: string;
  deliveryNoteDate?: Date;
  dispatchedThrough?: string;
  termsOfDelivery?: string;
  additionalCharges?: {
    freight: number;
    insurance: number;
    packing: number;
    other: number;
  };
  transportCharges?: {
    amount: number;
    quantity: number;
    unitPrice: number;
    hsnNumber: string;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
  };
  invoicePdf?: string;
  irn?: string; // Invoice Reference Number
  ackNumber?: string; // Acknowledgement Number
  ackDate?: Date; // Acknowledgement Date
  qrCodeInvoice?: string; // QR Code image URL/path
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'GST Pending';
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string;
  paymentDate?: Date;
  paymentMethodDetails?: {
    cash?: {
      receivedBy?: string;
      receiptNumber?: string;
    };
    cheque?: {
      chequeNumber: string;
      bankName: string;
      branchName?: string;
      issueDate: string;
      clearanceDate?: string;
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
      transferDate: string;
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
      additionalDetails?: Record<string, any>;
    };
  };
  dgEnquiry?: mongoose.Types.ObjectId;
  proformaReference?: mongoose.Types.ObjectId; // Reference to the DG Proforma used to create this invoice
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice Item Schema
const invoiceItemSchema = new Schema({
  product: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  uom: {
    type: String,
    required: [true, 'UOM is required'],
    trim: true,
    default: 'nos'
  },
  discount: {
    type: Number,
    required: [true, 'Discount is required'],
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0
  },
  discountedAmount: {
    type: Number,
    required: [true, 'Discounted amount is required'],
    min: [0, 'Discounted amount cannot be negative'],
    default: 0
  },
  gstRate: {
    type: Number,
    required: false,
    min: [0, 'Product GST rate cannot be negative'],
    max: [100, 'Product GST rate cannot exceed 100%'],
    default: 18
  },
  gstAmount: {
    type: Number,
    required: false,
    min: [0, 'Product GST amount cannot be negative'],
    default: 0
  },
  kva: {
    type: String,
    required: [true, 'KVA is required'],
    trim: true
  },
  phase: {
    type: String,
    required: [true, 'Phase is required'],
    trim: true
  },
  annexureRating: {
    type: String,
    required: [true, 'Annexure rating is required'],
    trim: true
  },
  dgModel: {
    type: String,
    required: [true, 'DG Model is required'],
    trim: true
  },
  numberOfCylinders: {
    type: Number,
    required: [true, 'Number of cylinders is required'],
    min: [0, 'Number of cylinders cannot be negative']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  isActive: {
    type: Boolean,
    required: [true, 'Active status is required'],
    default: true
  },
  hsnNumber: {
    type: String,
    required: false,
    trim: true,
    default: ''
  }
}, { _id: false });

// Invoice Schema
const DGInvoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    required: false,
    unique: true,
    trim: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  customerEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  customerAddress: {
    address: {
      type: String,
      required: false,
      trim: true
    },
    district: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    pincode: {
      type: String,
      required: false,
      trim: true
    },
    addressId: {
      type: Number,
      required: false
    }
  },
  billingAddress: {
    address: {
      type: String,
      required: false,
      trim: true
    },
    district: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    pincode: {
      type: String,
      required: false,
      trim: true
    },
    addressId: {
      type: Number,
      required: false
    },
    gstNumber: {
      type: String,
      required: false,
      trim: true
    }
  },
  shippingAddress: {
    address: {
      type: String,
      required: false,
      trim: true
    },
    district: {
      type: String,
      required: false,
      trim: true
    },
    state: {
      type: String,
      required: false,
      trim: true
    },
    pincode: {
      type: String,
      required: false,
      trim: true
    },
    addressId: {
      type: Number,
      required: false
    },
    gstNumber: {
      type: String,
      required: false,
      trim: true
    }
  },
  invoiceDate: {
    type: Date,
    required: [true, 'Invoice date is required'],
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  dgQuotationNumber: {
    type: Schema.Types.ObjectId,
    ref: 'DGQuotation',
    required: [true, 'DG Quotation is required']
  },
  poNumber: {
    type: String,
    required: false,
    trim: true
  },
  poFromCustomer: {
    type: Schema.Types.ObjectId,
    ref: 'DGPoFromCustomer',
    required: false
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  totalDiscount: {
    type: Number,
    min: [0, 'Total discount cannot be negative'],
    default: 0
  },
  taxRate: {
    type: Number,
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 18
  },
  taxAmount: {
    type: Number,
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  totalAmount: {
    type: Number,
    min: [0, 'Total amount cannot be negative'],
    default: 0
  },
  additionalCharges: {
    freight: {
      type: Number,
      required: false,
      min: [0, 'Freight cannot be negative'],
      default: 0
    },
    insurance: {
      type: Number,
      required: false,
      min: [0, 'Insurance cannot be negative'],
      default: 0
    },
    packing: {
      type: Number,
      required: false,
      min: [0, 'Packing cannot be negative'],
      default: 0
    },
    other: {
      type: Number,
      required: false,
      min: [0, 'Other charges cannot be negative'],
      default: 0
    }
  },
  transportCharges: {
    amount: {
      type: Number,
      required: false,
      min: [0, 'Transport amount cannot be negative'],
      default: 0
    },
    quantity: {
      type: Number,
      required: false,
      min: [0, 'Transport quantity cannot be negative'],
      default: 0
    },
    unitPrice: {
      type: Number,
      required: false,
      min: [0, 'Transport unit price cannot be negative'],
      default: 0
    },
    hsnNumber: {
      type: String,
      required: false,
      trim: true,
      default: '998399'
    },
    gstRate: {
      type: Number,
      required: false,
      min: [0, 'Transport GST rate cannot be negative'],
      max: [100, 'Transport GST rate cannot exceed 100%'],
      default: 18
    },
    gstAmount: {
      type: Number,
      required: false,
      min: [0, 'Transport GST amount cannot be negative'],
      default: 0
    },
    totalAmount: {
      type: Number,
      required: false,
      min: [0, 'Transport total amount cannot be negative'],
      default: 0
    }
  },
  paymentTerms: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    required: false,
    trim: true
  },
  deliveryNotes: {
    type: String,
    required: false,
    trim: true
  },
  referenceNumber: {
    type: String,
    required: false,
    trim: true
  },
  referenceDate: {
    type: Date,
    required: false
  },
  buyersOrderNumber: {
    type: String,
    required: false,
    trim: true
  },
  buyersOrderDate: {
    type: Date,
    required: false
  },
  dispatchDocNo: {
    type: String,
    required: false,
    trim: true
  },
  dispatchDocDate: {
    type: Date,
    required: false
  },
  destination: {
    type: String,
    required: false,
    trim: true
  },
  deliveryNoteDate: {
    type: Date,
    required: false
  },
  dispatchedThrough: {
    type: String,
    required: false,
    trim: true
  },
  termsOfDelivery: {
    type: String,
    required: false,
    trim: true
  },
  invoicePdf: {
    type: String,
    required: false,
    trim: true
  },
  irn: {
    type: String,
    required: false,
    trim: true,
    unique: true,
    sparse: true // Allows multiple null values
  },
  ackNumber: {
    type: String,
    required: false,
    trim: true
  },
  ackDate: {
    type: Date,
    required: false
  },
  qrCodeInvoice: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['Pending', 'Partial', 'Paid', 'Overdue', 'GST Pending'],
    default: 'Pending'
  },
  paidAmount: {
    type: Number,
    required: [true, 'Paid amount is required'],
    min: [0, 'Paid amount cannot be negative'],
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: [true, 'Remaining amount is required'],
    min: [0, 'Remaining amount cannot be negative'],
    default: 0
  },
  paymentMethod: {
    type: String,
    required: false,
    trim: true
  },
  paymentDate: {
    type: Date,
    required: false
  },
  paymentMethodDetails: {
    cash: {
      receivedBy: { type: String },
      receiptNumber: { type: String }
    },
    cheque: {
      chequeNumber: { type: String },
      bankName: { type: String },
      branchName: { type: String },
      issueDate: { type: String },
      clearanceDate: { type: String },
      accountHolderName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String }
    },
    bankTransfer: {
      bankName: { type: String },
      branchName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      transactionId: { type: String },
      transferDate: { type: String },
      accountHolderName: { type: String },
      referenceNumber: { type: String }
    },
    upi: {
      upiId: { type: String },
      transactionId: { type: String },
      transactionReference: { type: String },
      payerName: { type: String },
      payerPhone: { type: String }
    },
    card: {
      cardType: { type: String, enum: ['credit', 'debit', 'prepaid'] },
      cardNetwork: { type: String, enum: ['visa', 'mastercard', 'amex', 'rupay', 'other'] },
      lastFourDigits: { type: String },
      transactionId: { type: String },
      authorizationCode: { type: String },
      cardHolderName: { type: String }
    },
    other: {
      methodName: { type: String },
      referenceNumber: { type: String },
      additionalDetails: { type: Schema.Types.Mixed }
    }
  },
  dgEnquiry: {
    type: Schema.Types.ObjectId,
    ref: 'DGEnquiry',
    required: false
  },
  proformaReference: {
    type: Schema.Types.ObjectId,
    ref: 'DGProforma',
    required: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

// Pre-save middleware to generate invoice number
DGInvoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    try {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      
      const prefix = `INV${year}${month}${day}`;
      
      // Find the highest sequence number for today
      const lastInvoice = await DGInvoice.findOne({
        invoiceNumber: new RegExp(`^${prefix}-`)
      }).sort({ invoiceNumber: -1 });
      
      let sequence = 1;
      if (lastInvoice && lastInvoice.invoiceNumber) {
        const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[1]);
        sequence = lastSequence + 1;
      }
      
      this.invoiceNumber = `${prefix}-${sequence.toString().padStart(5, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Pre-save middleware to calculate remaining amount
DGInvoiceSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  next();
});


// Index for better query performance
DGInvoiceSchema.index({ invoiceNumber: 1 });
DGInvoiceSchema.index({ customer: 1 });
DGInvoiceSchema.index({ dgQuotationNumber: 1 });
DGInvoiceSchema.index({ status: 1 });
DGInvoiceSchema.index({ paymentStatus: 1 });
DGInvoiceSchema.index({ invoiceDate: 1 });
DGInvoiceSchema.index({ createdBy: 1 });
DGInvoiceSchema.index({ irn: 1 });
DGInvoiceSchema.index({ proformaReference: 1 });

export const DGInvoice = mongoose.model<IInvoice>('DGInvoice', DGInvoiceSchema); 