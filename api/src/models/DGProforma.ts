import mongoose, { Document, Schema } from 'mongoose';

// Interface for DG Proforma Item
export interface IDGProformaItemSchema {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  uom: string;
  discount: number;
  discountedAmount: number;
  kva: string;
  phase: string;
  annexureRating: string;
  dgModel: string;
  numberOfCylinders: number;
  subject: string;
  isActive: boolean;
  hsnNumber: string;
}

// Interface for DG Proforma
export interface IDGProformaSchema extends Document {
  proformaNumber?: string;
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
  };
  shippingAddress?: {
    address: string;
    district: string;
    state: string;
    pincode: string;
    addressId: number;
  };
  proformaDate: Date;
  validUntil: Date;
  dgQuotationNumber: mongoose.Types.ObjectId;
  poNumber?: string;
  poFromCustomer?: mongoose.Types.ObjectId;
  items: IDGProformaItemSchema[];
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  additionalCharges?: {
    freight: number;
    insurance: number;
    packing: number;
    other: number;
  };
  paymentTerms: string;
  notes: string;
  proformaPdf?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string;
  paymentDate?: Date;
  dgEnquiry?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// DG Proforma Item Schema
const DGProformaItemSchema = new Schema<IDGProformaItemSchema>({
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

// DG Proforma Schema
const DGProformaSchema = new Schema<IDGProformaSchema>({
  proformaNumber: {
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
    required: [true, 'Customer email is required'],
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
    }
  },
  proformaDate: {
    type: Date,
    required: [true, 'Proforma date is required'],
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
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
  items: [DGProformaItemSchema],
  subtotal: {
    type: Number,
    required: [true, 'Subtotal is required'],
    min: [0, 'Subtotal cannot be negative'],
    default: 0
  },
  totalDiscount: {
    type: Number,
    required: [true, 'Total discount is required'],
    min: [0, 'Total discount cannot be negative'],
    default: 0
  },
  taxRate: {
    type: Number,
    required: [true, 'Tax rate is required'],
    min: [0, 'Tax rate cannot be negative'],
    max: [100, 'Tax rate cannot exceed 100%'],
    default: 18
  },
  taxAmount: {
    type: Number,
    required: [true, 'Tax amount is required'],
    min: [0, 'Tax amount cannot be negative'],
    default: 0
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
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
  paymentTerms: {
    type: String,
    required: [true, 'Payment terms are required'],
    enum: ['Net 15', 'Net 30', 'Net 45', 'Immediate', 'Custom'],
    default: 'Net 30'
  },
  notes: {
    type: String,
    required: false,
    trim: true
  },
  proformaPdf: {
    type: String,
    required: false,
    trim: true
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'],
    default: 'Draft'
  },
  paymentStatus: {
    type: String,
    required: [true, 'Payment status is required'],
    enum: ['Pending', 'Partial', 'Paid', 'Overdue'],
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
  dgEnquiry: {
    type: Schema.Types.ObjectId,
    ref: 'DGEnquiry',
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

// Index for better query performance
DGProformaSchema.index({ proformaNumber: 1 });
DGProformaSchema.index({ customer: 1 });
DGProformaSchema.index({ dgQuotationNumber: 1 });
DGProformaSchema.index({ status: 1 });
DGProformaSchema.index({ paymentStatus: 1 });
DGProformaSchema.index({ proformaDate: 1 });
DGProformaSchema.index({ createdBy: 1 });

// Pre-save middleware to generate proforma number
DGProformaSchema.pre('save', async function(next) {
  if (this.isNew && !this.proformaNumber) {
    try {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      
      const prefix = `PF${year}${month}${day}`;
      
      // Find the highest sequence number for today
      const lastProforma = await DGProforma.findOne({
        proformaNumber: new RegExp(`^${prefix}-`)
      }).sort({ proformaNumber: -1 });
      
      let sequence = 1;
      if (lastProforma && lastProforma.proformaNumber) {
        const lastSequence = parseInt(lastProforma.proformaNumber.split('-')[1]);
        sequence = lastSequence + 1;
      }
      
      this.proformaNumber = `${prefix}-${sequence.toString().padStart(5, '0')}`;
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Pre-save middleware to calculate remaining amount
DGProformaSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  next();
});

export const DGProforma = mongoose.model<IDGProformaSchema>('DGProforma', DGProformaSchema);
