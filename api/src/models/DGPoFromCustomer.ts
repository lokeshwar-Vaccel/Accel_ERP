import mongoose, { Schema, Document } from 'mongoose';

// DG PO from customer item interface
interface IDGPoFromCustomerItemSchema {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  // Optional fields for compatibility
  uom?: string;
  discount?: number;
  discountedAmount?: number;
  // DG Product specific fields
  kva: string;
  phase: string;
  annexureRating: string;
  dgModel: string;
  numberOfCylinders: number;
  subject: string;
  isActive: boolean;
  hsnNumber?: string;
}

// Main DG PO from customer interface
interface IDGPoFromCustomerSchema extends Document {
  poNumber: string;
  customer: mongoose.Types.ObjectId;
  customerEmail?: string;
  customerAddress: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber?: string;
    isPrimary: boolean;
  };
  dgQuotationNumber?: mongoose.Types.ObjectId;
  items: IDGPoFromCustomerItemSchema[];
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent_to_customer' | 'customer_approved' | 'in_production' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others';
  notes?: string;
  // Payment fields
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
  paymentMethod?: string;
  paymentDate?: Date;
  // Source tracking
  sourceType?: 'manual' | 'dg_quotation' | 'dg_enquiry' | 'inventory';
  sourceId?: string;
  // Priority and approval
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  approvedBy?: mongoose.Types.ObjectId;
  // User tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  // PDF upload
  poPdf?: string;
  // DG specific fields
  dgEnquiry?: mongoose.Types.ObjectId;
  kva?: string;
  phase?: string;
  fuelType?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// DG PO from customer item schema
const DGPoFromCustomerItemSchema = new Schema<IDGPoFromCustomerItemSchema>({
  product: {
    type: String,
    required: true,
    trim: true
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
  // Optional fields for compatibility
  uom: {
    type: String,
    trim: true,
    default: 'nos'
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // DG Product specific fields
  kva: {
    type: String,
    required: true,
    trim: true
  },
  phase: {
    type: String,
    required: true,
    trim: true
  },
  annexureRating: {
    type: String,
    required: true,
    trim: true
  },
  dgModel: {
    type: String,
    required: true,
    trim: true
  },
  numberOfCylinders: {
    type: Number,
    required: true,
    min: 0
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true
  },
  hsnNumber: {
    type: String,
    trim: true
  }
}, { _id: false });

// Main DG PO from customer schema
const DGPoFromCustomerSchema = new Schema<IDGPoFromCustomerSchema>({
  poNumber: {
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
  customerEmail: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    default: ''
  },
  customerAddress: {
    id: {
      type: Number,
      required: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    district: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    gstNumber: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  },
  dgQuotationNumber: {
    type: Schema.Types.ObjectId,
    ref: 'DGQuotation',
    required: false
  },
  items: [DGPoFromCustomerItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  totalDiscount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxRate: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 18
  },
  taxAmount: {
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
  status: {
    type: String,
    enum: ['draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'],
    default: 'draft'
  },
  orderDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  department: {
    type: String,
    enum: ['retail', 'corporate', 'industrial_marine', 'others'],
    required: true,
    default: 'retail'
  },
  notes: {
    type: String,
    trim: true
  },
  // Payment fields
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    trim: true
  },
  paymentDate: {
    type: Date
  },
  // Source tracking
  sourceType: {
    type: String,
    enum: ['manual', 'dg_quotation', 'dg_enquiry', 'inventory'],
    default: 'manual'
  },
  sourceId: {
    type: String,
    trim: true
  },
  // Priority and approval
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // User tracking
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  // PDF upload
  poPdf: {
    type: String,
    trim: true,
    default: ''
  },
  // DG specific fields
  dgEnquiry: {
    type: Schema.Types.ObjectId,
    ref: 'DGEnquiry'
  },
  kva: {
    type: String,
    trim: true
  },
  phase: {
    type: String,
    trim: true
  },
  fuelType: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
DGPoFromCustomerSchema.index({ poNumber: 1 });
DGPoFromCustomerSchema.index({ customer: 1 });
DGPoFromCustomerSchema.index({ status: 1 });
DGPoFromCustomerSchema.index({ orderDate: -1 });
DGPoFromCustomerSchema.index({ createdBy: 1 });
DGPoFromCustomerSchema.index({ department: 1 });
DGPoFromCustomerSchema.index({ dgQuotationNumber: 1 });
DGPoFromCustomerSchema.index({ dgEnquiry: 1 });

// Virtual for calculating remaining amount
DGPoFromCustomerSchema.virtual('calculatedRemainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

// Pre-save middleware to calculate remaining amount
DGPoFromCustomerSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  next();
});

// Pre-save middleware to generate PO number if not provided
DGPoFromCustomerSchema.pre('save', function(next) {
  if (!this.poNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.poNumber = `DGPO-${timestamp}-${random}`;
  }
  next();
});

// Static method to get next PO number
DGPoFromCustomerSchema.statics.getNextPONumber = async function() {
  const lastPO = await this.findOne({}, {}, { sort: { createdAt: -1 } });
  if (lastPO) {
    const lastNumber = parseInt(lastPO.poNumber.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `DGPO-${newNumber.toString().padStart(6, '0')}`;
  }
  return 'DGPO-000001';
};

// Export the model
const DGPoFromCustomer = mongoose.model<IDGPoFromCustomerSchema>('DGPoFromCustomer', DGPoFromCustomerSchema);

export default DGPoFromCustomer;
export { IDGPoFromCustomerSchema, IDGPoFromCustomerItemSchema };
