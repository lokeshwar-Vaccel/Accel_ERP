import mongoose, { Schema } from 'mongoose';
import { IStock, IStockLocation } from '../types';

// Stock Location Schema
const stockLocationSchema = new Schema<IStockLocation>({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true,
    maxlength: [100, 'Location name cannot exceed 100 characters']
  },
  address: {
    type: String,
    required: [true, 'Location address is required'],
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['main_office', 'warehouse', 'service_center'],
    required: [true, 'Location type is required']
  },
  contactPerson: {
    type: String,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Stock Schema
const stockSchema = new Schema<IStock>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: [true, 'Location is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0
  },
  reservedQuantity: {
    type: Number,
    min: [0, 'Reserved quantity cannot be negative'],
    default: 0
  },
  availableQuantity: {
    type: Number,
    min: [0, 'Available quantity cannot be negative'],
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for product and location
stockSchema.index({ product: 1, location: 1 }, { unique: true });
stockSchema.index({ product: 1 });
stockSchema.index({ location: 1 });

// Pre-save middleware to calculate available quantity
stockSchema.pre('save', function(next) {
  this.availableQuantity = this.quantity - this.reservedQuantity;
  this.lastUpdated = new Date();
  
  // Validate that reserved quantity doesn't exceed total quantity
  if (this.reservedQuantity > this.quantity) {
    throw new Error('Reserved quantity cannot exceed total quantity');
  }
  
  next();
});

// Static method to get total stock for a product across all locations
stockSchema.statics.getTotalStock = async function(productId: string) {
  const stocks = await this.find({ product: productId });
  return stocks.reduce((total, stock) => ({
    totalQuantity: total.totalQuantity + stock.quantity,
    totalReserved: total.totalReserved + stock.reservedQuantity,
    totalAvailable: total.totalAvailable + stock.availableQuantity
  }), { totalQuantity: 0, totalReserved: 0, totalAvailable: 0 });
};

// Static method to check low stock items
stockSchema.statics.getLowStockItems = async function(locationId?: string) {
  const pipeline: any[] = [
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    {
      $unwind: '$productInfo'
    },
    {
      $match: {
        $expr: {
          $lte: ['$availableQuantity', '$productInfo.minStockLevel']
        }
      }
    }
  ];

  if (locationId) {
    pipeline.unshift({
      $match: { location: new mongoose.Types.ObjectId(locationId) }
    });
  }

  return this.aggregate(pipeline);
};

// Instance method to reserve stock
stockSchema.methods.reserveStock = function(quantity: number) {
  if (quantity > this.availableQuantity) {
    throw new Error('Insufficient available stock');
  }
  
  this.reservedQuantity += quantity;
  return this.save();
};

// Instance method to release reserved stock
stockSchema.methods.releaseReservedStock = function(quantity: number) {
  if (quantity > this.reservedQuantity) {
    throw new Error('Cannot release more than reserved quantity');
  }
  
  this.reservedQuantity -= quantity;
  return this.save();
};

// Instance method to consume stock (reduce both quantity and reserved)
stockSchema.methods.consumeStock = function(quantity: number) {
  if (quantity > this.reservedQuantity) {
    throw new Error('Cannot consume more than reserved quantity');
  }
  
  this.quantity -= quantity;
  this.reservedQuantity -= quantity;
  return this.save();
};

export const StockLocation = mongoose.model<IStockLocation>('StockLocation', stockLocationSchema);
export const Stock = mongoose.model<IStock>('Stock', stockSchema); 