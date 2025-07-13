import mongoose, { Schema } from 'mongoose';
import { IRack, IRoom, IStock, IStockLocation } from '../types';

// --- Stock Location Schema ---
const stockLocationSchema = new Schema({
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
}, { timestamps: true });

// --- Room Schema ---
const roomSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Room name is required'],
    trim: true,
    maxlength: [100, 'Room name cannot exceed 100 characters'],
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: [true, 'Location is required'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

roomSchema.index({ location: 1 });

// --- Rack Schema ---
const rackSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Rack name is required'],
    trim: true,
    maxlength: [100, 'Rack name cannot exceed 100 characters'],
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: [true, 'Location is required'],
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: [true, 'Room is required'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

rackSchema.index({ location: 1 });
rackSchema.index({ room: 1 });

// --- Stock Schema ---
const stockSchema = new Schema({
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
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },
  rack: {
    type: Schema.Types.ObjectId,
    ref: 'Rack',
    default: null
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
}, { timestamps: true });

// ✅ Compound unique index: product + location + room + rack
stockSchema.index(
  { product: 1, location: 1, room: 1, rack: 1 },
  { unique: true }
);

// Other helpful indexes
stockSchema.index({ product: 1 });
stockSchema.index({ location: 1 });

// --- Pre-save Middleware ---
stockSchema.pre('save', function (this: any, next) {
  this.availableQuantity = this.quantity - this.reservedQuantity;
  this.lastUpdated = new Date();

  if (this.reservedQuantity > this.quantity) {
    throw new Error('Reserved quantity cannot exceed total quantity');
  }

  next();
});

// --- Static Methods ---
stockSchema.statics.getTotalStock = async function (productId: string) {
  const stocks = await this.find({ product: productId });
  return stocks.reduce((total: any, stock: any) => ({
    totalQuantity: total.totalQuantity + stock.quantity,
    totalReserved: total.totalReserved + stock.reservedQuantity,
    totalAvailable: total.totalAvailable + stock.availableQuantity
  }), { totalQuantity: 0, totalReserved: 0, totalAvailable: 0 });
};

stockSchema.statics.getLowStockItems = async function (locationId?: string) {
  const pipeline: any[] = [
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'productInfo'
      }
    },
    { $unwind: '$productInfo' },
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

// --- Instance Methods ---
stockSchema.methods.reserveStock = function (quantity: number) {
  if (quantity > this.availableQuantity) {
    throw new Error('Insufficient available stock');
  }

  this.reservedQuantity += quantity;
  return this.save();
};

stockSchema.methods.releaseReservedStock = function (quantity: number) {
  if (quantity > this.reservedQuantity) {
    throw new Error('Cannot release more than reserved quantity');
  }

  this.reservedQuantity -= quantity;
  return this.save();
};

stockSchema.methods.consumeStock = function (quantity: number) {
  if (quantity > this.reservedQuantity) {
    throw new Error('Cannot consume more than reserved quantity');
  }

  this.quantity -= quantity;
  this.reservedQuantity -= quantity;
  return this.save();
};

// --- Export Models ---
export const StockLocation = mongoose.model<IStockLocation>('StockLocation', stockLocationSchema);
export const Room = mongoose.model<IRoom>('Room', roomSchema);
export const Rack = mongoose.model<IRack>('Rack', rackSchema);
export const Stock = mongoose.model<IStock>('Stock', stockSchema);
