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
  supplier: string;
  supplierEmail: string;
  items: IPOItemSchema[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | 'partially_received';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
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
    type: String,
    required: [true, 'Supplier is required'],
    trim: true,
    maxlength: [200, 'Supplier name cannot exceed 200 characters']
  },
  supplierEmail: {
    type: String,
    trim: true,
    // maxlength: [100, 'Supplier Email cannot exceed 100 characters']
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
    enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received'],
    default: 'draft',
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

// Virtual for delivery status
purchaseOrderSchema.virtual('deliveryStatus').get(function (this: IPurchaseOrderSchema) {
  if (this.status === 'received') return 'delivered';
  if (this.status === 'cancelled') return 'cancelled';
  if (!this.expectedDeliveryDate) return 'no_delivery_date';

  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);

  if (now > expected) return 'overdue';
  if (now <= expected) return 'on_time';

  return 'pending';
});

// Virtual for days until delivery
purchaseOrderSchema.virtual('daysUntilDelivery').get(function (this: IPurchaseOrderSchema) {
  if (!this.expectedDeliveryDate || this.status === 'received' || this.status === 'cancelled') {
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
      console.log('Generated PO number:', this.poNumber);
    } catch (error) {
      console.error('Error generating PO number:', error);
      return next(error as Error);
    }
  }
  next();
});

// Calculate total amount from items
purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total: number, item: IPOItemSchema) => total + item.totalPrice, 0);

    // Ensure each item's total price is correct
    this.items.forEach((item: IPOItemSchema) => {
      item.totalPrice = item.quantity * item.unitPrice;
    });
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

// Set actual delivery date when status changes to received
purchaseOrderSchema.pre('save', function (this: IPurchaseOrderSchema, next) {
  if (this.isModified('status') && this.status === 'received' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
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

// Method to confirm PO
purchaseOrderSchema.methods.confirm = function (this: IPurchaseOrderSchema) {
  if (this.status !== 'sent') {
    throw new Error('Only sent purchase orders can be confirmed');
  }

  this.status = 'confirmed';
  return this.save();
};

// Method to receive PO
purchaseOrderSchema.methods.receive = function (this: IPurchaseOrderSchema) {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed purchase orders can be received');
  }

  this.status = 'received';
  this.actualDeliveryDate = new Date();

  return this.save();
};

// Static method to get overdue purchase orders
purchaseOrderSchema.statics.getOverduePOs = async function () {
  const now = new Date();

  return this.find({
    expectedDeliveryDate: { $lt: now },
    status: { $in: ['sent', 'confirmed'] }
  }).populate('items.product').populate('createdBy');
};

// Static method to get POs by status
purchaseOrderSchema.statics.getPOsByStatus = async function (status: string) {
  return this.find({ status }).populate('items.product').populate('createdBy');
};

export const PurchaseOrder = mongoose.model<IPurchaseOrderSchema>('PurchaseOrder', purchaseOrderSchema); 