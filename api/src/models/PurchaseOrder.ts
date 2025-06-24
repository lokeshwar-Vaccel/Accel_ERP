import mongoose, { Schema } from 'mongoose';
import { IPurchaseOrder, IPOItem } from '../types';

const poItemSchema = new Schema<IPOItem>({
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
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  }
}, { _id: false });

const purchaseOrderSchema = new Schema<IPurchaseOrder>({
  poNumber: {
    type: String,
    required: [true, 'PO number is required'],
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
  items: {
    type: [poItemSchema],
    required: [true, 'At least one item is required'],
    validate: {
      validator: function(items: IPOItem[]) {
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
    enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
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
purchaseOrderSchema.virtual('deliveryStatus').get(function() {
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
purchaseOrderSchema.virtual('daysUntilDelivery').get(function() {
  if (!this.expectedDeliveryDate || this.status === 'received' || this.status === 'cancelled') {
    return null;
  }
  
  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);
  const diff = expected.getTime() - now.getTime();
  
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Generate unique PO number
purchaseOrderSchema.pre('save', async function(next) {
  if (this.isNew && !this.poNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last PO number for this month
    const lastPO = await this.constructor.findOne({
      poNumber: { $regex: `^PO-${year}${month}` }
    }).sort({ poNumber: -1 });
    
    let sequence = 1;
    if (lastPO) {
      const lastSequence = parseInt(lastPO.poNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.poNumber = `PO-${year}${month}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Calculate total amount from items
purchaseOrderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
    
    // Ensure each item's total price is correct
    this.items.forEach(item => {
      item.totalPrice = item.quantity * item.unitPrice;
    });
  }
  next();
});

// Validate that delivery date is not in the past for new orders
purchaseOrderSchema.pre('save', function(next) {
  if (this.expectedDeliveryDate && this.isNew) {
    const now = new Date();
    if (this.expectedDeliveryDate < now) {
      throw new Error('Expected delivery date cannot be in the past');
    }
  }
  next();
});

// Set actual delivery date when status changes to received
purchaseOrderSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'received' && !this.actualDeliveryDate) {
    this.actualDeliveryDate = new Date();
  }
  next();
});

// Method to add item to PO
purchaseOrderSchema.methods.addItem = function(itemData: Omit<IPOItem, 'totalPrice'>) {
  const totalPrice = itemData.quantity * itemData.unitPrice;
  
  this.items.push({
    ...itemData,
    totalPrice
  } as IPOItem);
  
  return this.save();
};

// Method to remove item from PO
purchaseOrderSchema.methods.removeItem = function(productId: string) {
  this.items = this.items.filter(item => item.product.toString() !== productId);
  return this.save();
};

// Method to update item quantity
purchaseOrderSchema.methods.updateItemQuantity = function(productId: string, newQuantity: number) {
  const item = this.items.find(item => item.product.toString() === productId);
  if (!item) {
    throw new Error('Item not found in purchase order');
  }
  
  item.quantity = newQuantity;
  item.totalPrice = item.quantity * item.unitPrice;
  
  return this.save();
};

// Method to confirm PO
purchaseOrderSchema.methods.confirm = function() {
  if (this.status !== 'sent') {
    throw new Error('Only sent purchase orders can be confirmed');
  }
  
  this.status = 'confirmed';
  return this.save();
};

// Method to receive PO
purchaseOrderSchema.methods.receive = function() {
  if (this.status !== 'confirmed') {
    throw new Error('Only confirmed purchase orders can be received');
  }
  
  this.status = 'received';
  this.actualDeliveryDate = new Date();
  
  return this.save();
};

// Static method to get overdue purchase orders
purchaseOrderSchema.statics.getOverduePOs = async function() {
  const now = new Date();
  
  return this.find({
    expectedDeliveryDate: { $lt: now },
    status: { $in: ['sent', 'confirmed'] }
  }).populate('items.product').populate('createdBy');
};

// Static method to get POs by status
purchaseOrderSchema.statics.getPOsByStatus = async function(status: string) {
  return this.find({ status }).populate('items.product').populate('createdBy');
};

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', purchaseOrderSchema); 