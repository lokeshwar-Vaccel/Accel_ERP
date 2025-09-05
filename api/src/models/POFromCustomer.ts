import mongoose, { Schema, Document } from 'mongoose';

// PO from customer item interface
interface IPOFromCustomerItemSchema {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  description?: string;
  uom?: string;
  hsnNumber?: string;
}

// Main PO from customer interface
interface IPOFromCustomerSchema extends Document {
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
  quotationNumber?: mongoose.Types.ObjectId;
  items: IPOFromCustomerItemSchema[];
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
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentDate?: Date;
  // Source tracking
  sourceType?: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  // Priority and approval
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  approvedBy?: mongoose.Types.ObjectId;
  // User tracking
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  // PDF upload
  poPdf?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// PO from customer item schema
const POFromCustomerItemSchema = new Schema<IPOFromCustomerItemSchema>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
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
    required: true,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    trim: true
  },
  uom: {
    type: String,
    default: 'nos'
  },
  hsnNumber: {
    type: String,
    trim: true
  }
}, { _id: false });

// Main PO from customer schema
const POFromCustomerSchema = new Schema<IPOFromCustomerSchema>({
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
  quotationNumber: {
    type: Schema.Types.ObjectId,
    ref: 'Quotation',
    required: false
  },
  items: [POFromCustomerItemSchema],
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
    enum: ['manual', 'amc', 'service', 'inventory'],
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
POFromCustomerSchema.index({ poNumber: 1 });
POFromCustomerSchema.index({ customer: 1 });
POFromCustomerSchema.index({ status: 1 });
POFromCustomerSchema.index({ orderDate: -1 });
POFromCustomerSchema.index({ createdBy: 1 });
POFromCustomerSchema.index({ department: 1 });

// Virtual for calculating remaining amount
POFromCustomerSchema.virtual('calculatedRemainingAmount').get(function() {
  return this.totalAmount - this.paidAmount;
});

// Pre-save middleware to calculate remaining amount
POFromCustomerSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - this.paidAmount;
  next();
});

// Pre-save middleware to generate PO number if not provided
POFromCustomerSchema.pre('save', function(next) {
  if (!this.poNumber) {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.poNumber = `POC-${timestamp}-${random}`;
  }
  next();
});

// Static method to get next PO number
POFromCustomerSchema.statics.getNextPONumber = async function() {
  const lastPO = await this.findOne({}, {}, { sort: { createdAt: -1 } });
  if (lastPO) {
    const lastNumber = parseInt(lastPO.poNumber.split('-')[1]);
    const newNumber = lastNumber + 1;
    return `POC-${newNumber.toString().padStart(6, '0')}`;
  }
  return 'POC-000001';
};

// Export the model
const POFromCustomer = mongoose.model<IPOFromCustomerSchema>('POFromCustomer', POFromCustomerSchema);

export default POFromCustomer;
export { IPOFromCustomerSchema, IPOFromCustomerItemSchema };
