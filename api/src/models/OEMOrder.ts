import mongoose, { Schema, Document } from 'mongoose';

// OEM Order item interface
interface IOEMOrderItemSchema {
  product: mongoose.Types.ObjectId; // Reference to DGProduct
  quantity: number;
  unitPrice: number;
  discountRate?: number; // Discount percentage (0-100)
  discountAmount?: number; // Calculated discount amount
  totalPrice: number;
  taxRate: number;
  receivedQuantity?: number;
  specifications?: string;
  serialNumbers?: string[];
}

// Payment method details interface
interface PaymentMethodDetails {
  bankName?: string;
  accountNumber?: string;
  transactionId?: string;
  chequeNumber?: string;
  chequeDate?: string;
  upiId?: string;
  walletName?: string;
  cardLastFour?: string;
  cardType?: string;
  referenceNumber?: string;
}

export interface IOEMOrder extends Document {
  orderNumber: string;
  oem: mongoose.Types.ObjectId; // Reference to OEM
  customer: mongoose.Types.ObjectId; // Reference to Customer
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  items: IOEMOrderItemSchema[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  deliveryAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactPerson: string;
    phone: string;
  };
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  notes?: string;
  // Payment fields - same structure as PurchaseOrder
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentMethodDetails?: any;
  paymentDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtual fields
  deliveryStatus?: string;
  daysUntilDelivery?: number;
}

// OEM Order item schema
const oemOrderItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'DGProduct',
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
  discountRate: {
    type: Number,
    default: 0,
    min: [0, 'Discount rate cannot be negative'],
    max: [100, 'Discount rate cannot exceed 100%']
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: [0, 'Discount amount cannot be negative']
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
  },
  specifications: {
    type: String,
    trim: true
  },
  serialNumbers: [{ 
    type: String, 
    trim: true 
  }]
}, { _id: false });

const OEMOrderSchema = new Schema<IOEMOrder>({
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  oem: {
    type: Schema.Types.ObjectId,
    ref: 'OEM',
    required: [true, 'OEM is required']
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
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
  items: {
    type: [oemOrderItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function (items: IOEMOrderItemSchema[]) {
        return items && items.length > 0;
      },
      message: 'OEM order must have at least one item'
    }
  },
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'],
    default: 'draft',
    required: [true, 'Status is required']
  },
  deliveryAddress: {
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true }
  },
  paymentTerms: { 
    type: String, 
    required: true, 
    trim: true 
  },
  deliveryTerms: { 
    type: String, 
    required: true, 
    trim: true 
  },
  warrantyTerms: { 
    type: String, 
    required: true, 
    trim: true 
  },
  notes: {
    type: String,
    trim: true
  },
  // Payment fields - same structure as PurchaseOrder
  paidAmount: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  remainingAmount: {
    type: Number,
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
    required: [true, 'OEM order creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching and performance
OEMOrderSchema.index({ orderNumber: 1 });
OEMOrderSchema.index({ oem: 1 });
OEMOrderSchema.index({ customer: 1 });
OEMOrderSchema.index({ status: 1 });
OEMOrderSchema.index({ orderDate: -1 });
OEMOrderSchema.index({ expectedDeliveryDate: 1 });

// Virtual for delivery status
OEMOrderSchema.virtual('deliveryStatus').get(function (this: IOEMOrder) {
  if (this.status === 'delivered') return 'delivered';
  if (this.status === 'cancelled') return 'cancelled';
  if (!this.expectedDeliveryDate) return 'no_delivery_date';

  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);

  if (now > expected) return 'overdue';
  if (now <= expected) return 'on_time';

  return 'pending';
});

// Virtual for days until delivery
OEMOrderSchema.virtual('daysUntilDelivery').get(function (this: IOEMOrder) {
  if (!this.expectedDeliveryDate || this.status === 'delivered' || this.status === 'cancelled') {
    return null;
  }

  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);
  const diff = expected.getTime() - now.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Generate unique order number
OEMOrderSchema.pre('save', async function (this: IOEMOrder, next) {
  if (this.isNew && !this.orderNumber) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      // Find the last order number for this month
      const OEMOrderModel = this.constructor as mongoose.Model<IOEMOrder>;
      const lastOrder = await OEMOrderModel.findOne({
        orderNumber: { $regex: `^OEM-${year}${month}` }
      }).sort({ orderNumber: -1 });

      let sequence = 1;
      if (lastOrder && lastOrder.orderNumber) {
        const orderNumberParts = lastOrder.orderNumber.split('-');
        if (orderNumberParts.length >= 3) {
          const lastSequence = parseInt(orderNumberParts[2]);
          if (!isNaN(lastSequence)) {
            sequence = lastSequence + 1;
          }
        }
      }

      this.orderNumber = `OEM-${year}${month}-${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating OEM order number:', error);
      return next(error as Error);
    }
  }
  next();
});

// Calculate totals and apply discounts/taxes
OEMOrderSchema.pre('save', function (this: IOEMOrder, next) {
  if (this.items && this.items.length > 0) {
    // First: calculate and update each item's totalPrice with discount and tax
    this.items.forEach((item: IOEMOrderItemSchema) => {
      const quantity = item.quantity || 0;
      const unitPrice = item.unitPrice || 0;
      const discountRate = item.discountRate || 0;
      const taxRate = item.taxRate || 0;
      const subtotal = quantity * unitPrice;
      
      // GST inclusive price (base + GST)
      const gstInclusiveSubtotal = subtotal * (1 + taxRate / 100);
      
      // Calculate discount on GST-inclusive subtotal
      const calculatedDiscountAmount = Math.round((gstInclusiveSubtotal * discountRate) / 100);
      
      // Use provided discount amount or calculated amount
      const discountAmount = item.discountAmount ? Math.round(item.discountAmount) : calculatedDiscountAmount;
      
      // Update both fields
      item.discountRate = discountRate;
      item.discountAmount = discountAmount;
      
      // Final total after discount (discount applied after GST)
      item.totalPrice = Math.round(gstInclusiveSubtotal - discountAmount);
    });

    // Then: sum up totalAmount from updated item.totalPrice
    this.totalAmount = this.items.reduce(
      (total: number, item: IOEMOrderItemSchema) => total + (item.totalPrice || 0),
      0
    );
  }
  next();
});

// Validate that delivery date is not in the past for new orders
OEMOrderSchema.pre('save', function (this: IOEMOrder, next) {
  if (this.expectedDeliveryDate && this.isNew) {
    const now = new Date();
    if (this.expectedDeliveryDate < now) {
      throw new Error('Expected delivery date cannot be in the past');
    }
  }
  next();
});

// Set actual delivery date when status changes to delivered
OEMOrderSchema.pre('save', function (this: IOEMOrder, next) {
  if (this.isModified('status') && this.status === 'delivered' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }
  next();
});

// Calculate remaining amount based on totalAmount and paidAmount
OEMOrderSchema.pre('save', function (this: IOEMOrder, next) {
  if (this.isModified('totalAmount') || this.isModified('paidAmount')) {
    this.remainingAmount = Math.max(0, this.totalAmount - (this.paidAmount || 0));
  }
  next();
});

// Method to add item to OEM order
OEMOrderSchema.methods.addItem = function (this: IOEMOrder, itemData: Omit<IOEMOrderItemSchema, 'totalPrice'>) {
  const totalPrice = itemData.quantity * itemData.unitPrice;

  this.items.push({
    ...itemData,
    totalPrice
  } as IOEMOrderItemSchema);

  return this.save();
};

// Method to remove item from OEM order
OEMOrderSchema.methods.removeItem = function (this: IOEMOrder, productId: string) {
  this.items = this.items.filter((item: IOEMOrderItemSchema) => item.product.toString() !== productId);
  return this.save();
};

// Method to update item quantity
OEMOrderSchema.methods.updateItemQuantity = function (this: IOEMOrder, productId: string, newQuantity: number) {
  const item = this.items.find((item: IOEMOrderItemSchema) => item.product.toString() === productId);
  if (!item) {
    throw new Error('Item not found in OEM order');
  }

  item.quantity = newQuantity;
  item.totalPrice = item.quantity * item.unitPrice;

  return this.save();
};

// Method to confirm OEM order
OEMOrderSchema.methods.confirm = function (this: IOEMOrder) {
  if (this.status !== 'sent') {
    throw new Error('Only sent orders can be confirmed');
  }

  this.status = 'confirmed';
  return this.save();
};

// Method to mark OEM order as delivered
OEMOrderSchema.methods.markDelivered = function (this: IOEMOrder) {
  if (this.status !== 'shipped') {
    throw new Error('Only shipped orders can be marked as delivered');
  }

  this.status = 'delivered';
  this.actualDeliveryDate = new Date();

  return this.save();
};

// Static method to get overdue OEM orders
OEMOrderSchema.statics.getOverdueOrders = async function () {
  const now = new Date();

  return this.find({
    expectedDeliveryDate: { $lt: now },
    status: { $in: ['sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped'] }
  }).populate('items.product').populate('createdBy');
};

// Static method to get orders by status
OEMOrderSchema.statics.getOrdersByStatus = async function (status: string) {
  return this.find({ status }).populate('items.product').populate('createdBy');
};

export const OEMOrder = mongoose.model<IOEMOrder>('OEMOrder', OEMOrderSchema); 