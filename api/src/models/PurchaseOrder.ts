import mongoose, { Schema, Document } from 'mongoose';

// Purchase order item interface
interface IPOItemSchema {
  product: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  receivedQuantity?: number;
}

// Main purchase order interface
interface IPurchaseOrderSchema extends Document {
  poNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierEmail: string;
  supplierAddress: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber: string;
    isPrimary: boolean;
  };
  items: IPOItemSchema[];
  totalAmount: number;
  status: 'approved_order_sent_sap' | 'credit_not_available' | 'fully_invoiced' | 'order_under_process' | 'partially_invoiced' | 'rejected';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  // New fields for shipping and documentation
  shipDate?: Date;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: Date;
  documentNumber?: string;
  documentDate?: Date;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others'; // Department for this purchase order
  notes?: string;
  // Purchase Order Type field
  purchaseOrderType: 'commercial' | 'breakdown_order';
  // Payment fields - same structure as Invoice and Quotation models
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
  paymentMethod?: string;
  paymentMethodDetails?: any; // Will store payment method specific details
  paymentDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const poItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative']
  },
  taxRate: {
    type: Number,
    default: 0,
    min: [0, 'GST cannot be negative'],
    max: [100, 'GST cannot exceed 100']
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Received quantity cannot be negative']
  }
}, { _id: false });

const purchaseOrderSchema = new Schema({
  poNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    // required: [true, 'Supplier is required'],
  },
  supplierEmail: {
    type: String,
    trim: true,
    // maxlength: [100, 'Supplier Email cannot exceed 100 characters']
  },
  supplierAddress: {
    id: { type: Number, required: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false }
  },
  items: {
    type: [poItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function (items: IPOItemSchema[]) {
        return items && items.length > 0;
      },
      message: 'Purchase order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['approved_order_sent_sap', 'credit_not_available', 'fully_invoiced', 'order_under_process', 'partially_invoiced', 'rejected'],
    default: 'order_under_process',
    required: [true, 'Status is required']
  },
  orderDate: {
    type: Date,
    required: [true, 'Order date is required'],
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  // New fields for shipping and documentation
  shipDate: {
    type: Date
  },
  docketNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Docket number cannot exceed 100 characters']
  },
  noOfPackages: {
    type: Number,
    min: [0, 'Number of packages cannot be negative']
  },
  gstInvoiceNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'GST invoice number cannot exceed 100 characters']
  },
  invoiceDate: {
    type: Date
  },
  documentNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Document number cannot exceed 100 characters']
  },
  documentDate: {
    type: Date
  },
  department: {
    type: String,
    enum: ['retail', 'corporate', 'industrial_marine', 'others'],
    required: [true, 'Department is required'],
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  // Purchase Order Type field
  purchaseOrderType: {
    type: String,
    enum: ['commercial', 'breakdown_order'],
    required: [true, 'Purchase order type is required']
  },
  // Payment fields - same structure as Invoice and Quotation models
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  remainingAmount: {
    type: Number,
    // required: [true, 'Remaining amount is required'],
    min: [0, 'Remaining amount cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'failed'],
    default: 'pending',
    required: [true, 'Payment status is required']
  },
  paymentMethod: {
    type: String,
    trim: true,
    maxlength: [100, 'Payment method cannot exceed 100 characters']
  },
  paymentMethodDetails: {
    type: Schema.Types.Mixed,
    default: {}
  },
  paymentDate: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'PO creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching and performance
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ purchaseOrderType: 1 });

// Virtual for delivery status
purchaseOrderSchema.virtual('deliveryStatus').get(function (this: IPurchaseOrderSchema) {
  if (this.status === 'fully_invoiced') return 'delivered';
  if (this.status === 'rejected') return 'cancelled';
  if (!this.expectedDeliveryDate) return 'no_delivery_date';

  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);

  if (now > expected) return 'overdue';
  if (now <= expected) return 'on_time';

  return 'pending';
});

// Virtual for days until delivery
purchaseOrderSchema.virtual('daysUntilDelivery').get(function (this: IPurchaseOrderSchema) {
  if (!this.expectedDeliveryDate || this.status === 'fully_invoiced' || this.status === 'rejected') {
    return null;
  }

  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);
  const diff = expected.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Generate unique PO number
purchaseOrderSchema.pre('save', async function (this: IPurchaseOrderSchema, next) {
  if (this.isNew && !this.poNumber) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      // Find the last PO number for this month
      const PurchaseOrderModel = this.constructor as mongoose.Model<IPurchaseOrderSchema>;
      const lastPO = await PurchaseOrderModel.findOne({
        poNumber: { $regex: `^PO-${year}${month}` }
      }).sort({ poNumber: -1 });

      let sequence = 1;
      if (lastPO && lastPO.poNumber) {
        const poNumberParts = lastPO.poNumber.split('-');
        if (poNumberParts.length >= 3) {
          const lastSequence = parseInt(poNumberParts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }

      this.poNumber = `PO-${year}${month}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating PO number:', error);
      return next(error as Error);
    }
  }
  next();
});

purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.items && this.items.length > 0) {
    // First: calculate and update each item's totalPrice with tax
    this.items.forEach((item: IPOItemSchema) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const taxRate = item.taxRate || 0;
      item.totalPrice = quantity * unitPrice * (1 + taxRate / 100);
    });

    // Then: sum up totalAmount from updated item.totalPrice
    this.totalAmount = this.items.reduce(
      (total: number, item: IPOItemSchema) => total + (item.totalPrice || 0),
      0
    );
  }
  next();
});


// Validate that delivery date is not in the past for new orders
purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.expectedDeliveryDate && this.isNew) {
    const now = new Date();
    if (this.expectedDeliveryDate < now) {
      throw new Error('Expected delivery date cannot be in the past');
    }
  }
  next();
});

// Set actual delivery date when status changes to fully_invoiced
purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.isModified('status') && this.status === 'fully_invoiced' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }
  next();
});

// Calculate remaining amount based on totalAmount and paidAmount
purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.remainingAmount = Math.max(0, this.totalAmount - (this.paidAmount || 0));
  }
  next();
});

// Method to add item to PO
purchaseOrderSchema.methods.addItem = function (this: IPurchaseOrderSchema, itemData: Omit<IPOItemSchema, 'totalPrice'>) {
  const totalPrice = itemData.quantity * itemData.unitPrice;

  this.items.push({
    ...itemData,
    totalPrice
  } as IPOItemSchema);

  return this.save();
};

// Method to remove item from PO
purchaseOrderSchema.methods.removeItem = function (this: IPurchaseOrderSchema, productId: string) {
  this.items = this.items.filter((item: IPOItemSchema) => item.product.toString() !== productId);
  return this.save();
};

// Method to update item quantity
purchaseOrderSchema.methods.updateItemQuantity = function (this: IPurchaseOrderSchema, productId: string, newQuantity: number) {
  const item = this.items.find((item: IPOItemSchema) => item.product.toString() === productId);
  if (!item) {
    throw new Error('Item not found in purchase order');
  }

  item.quantity = newQuantity;
  item.totalPrice = item.quantity * item.unitPrice;

  return this.save();
};

// Method to approve PO
purchaseOrderSchema.methods.approve = function (this: IPurchaseOrderSchema) {
  if (this.status !== 'order_under_process') {
    throw new Error('Only orders under process can be approved');
  }

  this.status = 'approved_order_sent_sap';
  return this.save();
};

// Method to mark PO as fully invoiced
purchaseOrderSchema.methods.markFullyInvoiced = function (this: IPurchaseOrderSchema) {
  if (this.status !== 'approved_order_sent_sap') {
    throw new Error('Only approved purchase orders can be marked as fully invoiced');
  }

  this.status = 'fully_invoiced';
  this.actualDeliveryDate = new Date();

  return this.save();
};

// Static method to get overdue purchase orders
purchaseOrderSchema.statics.getOverduePOs = async function () {
  const now = new Date();

  return this.find({
    expectedDeliveryDate: { $lt: now },
    status: { $in: ['order_under_process', 'approved_order_sent_sap'] }
  }).populate('items.product').populate('createdBy');
};

// Static method to get POs by status
purchaseOrderSchema.statics.getPOsByStatus = async function (status: string) {
  return this.find({ status }).populate('items.product').populate('createdBy');
};

export const PurchaseOrder = mongoose.model<IPurchaseOrderSchema>('PurchaseOrder', purchaseOrderSchema); 