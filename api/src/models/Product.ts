import mongoose, { Schema } from 'mongoose';
import { IProduct, ProductCategory } from '../types';

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: String,
    enum: Object.values(ProductCategory),
    required: [true, 'Product category is required']
  },
  brand: {
    type: String,
    maxlength: [100, 'Brand cannot exceed 100 characters']
  },
  modelNumber: {
    type: String,
    maxlength: [100, 'Model number cannot exceed 100 characters']
  },
  minStockLevel: {
    type: Number,
    required: [true, 'Minimum stock level is required'],
    min: [0, 'Minimum stock level cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  partNo: {
    type: String,
    required: [true, 'Part number is required'],
    trim: true,
    maxlength: [100, 'Part number cannot exceed 100 characters'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: false,
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: 'Room',
    required: false,
  },
  rack: {
    type: Schema.Types.ObjectId,
    ref: 'Rack',
    required: false,
  },
  hsnNumber: {
    type: String,
    maxlength: [50, 'HSN number cannot exceed 50 characters'],
  },
  dept: {
    type: String,
    maxlength: [100, 'Department cannot exceed 100 characters'],
  },
  productType1: {
    type: String,
    maxlength: [100, 'Product Type 1 cannot exceed 100 characters'],
  },
  productType2: {
    type: String,
    maxlength: [100, 'Product Type 2 cannot exceed 100 characters'],
  },
  productType3: {
    type: String,
    maxlength: [100, 'Product Type 3 cannot exceed 100 characters'],
  },
  make: {
    type: String,
    maxlength: [100, 'Make cannot exceed 100 characters'],
  },
  gst: {
    type: Number,
    min: [0, 'GST cannot be negative'],
    max: [100, 'GST cannot exceed 100'],
  },
  gndp: {
    type: Number,
    min: [0, 'GNDP cannot be negative'],
  },
  price: {
    type: Number,
    min: [0, 'Price cannot be negative'],
  },
  gndpTotal: {
    type: Number,
    min: [0, 'GNDP Total cannot be negative'],
  },
  uom: {
    type: String,
    enum: ['pcs', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'],
    default: null
  },
  cpcbNo: {
    type: String,
    maxlength: [100, 'CPCB number cannot exceed 100 characters'],
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Product creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching
productSchema.index({ name: 'text', brand: 'text', modelNumber: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });

// Virtual for product code (auto-generated)
// productSchema.virtual('productCode').get(function(this: any) {
//   const categoryCode = this.category.toUpperCase().substring(0, 3);
//   const idCode = this._id.toString().slice(-6).toUpperCase();
//   return `${categoryCode}-${idCode}`;
// });

// Virtual to get current stock levels (populated from Stock model)
productSchema.virtual('stockLevels', {
  ref: 'Stock',
  localField: '_id',
  foreignField: 'product'
});

// Method to check if stock is below minimum level
productSchema.methods.isLowStock = async function(this: any) {
  const Stock = mongoose.model('Stock');
  const stocks = await Stock.find({ product: this._id });
  const totalStock = stocks.reduce((total: number, stock: any) => total + stock.availableQuantity, 0);
  return totalStock <= this.minStockLevel;
};

// Pre-save middleware for validation
productSchema.pre('save', function(this: any, next) {
  // Ensure price is a valid number
  if (this.price < 0) {
    throw new Error('Price cannot be negative');
  }
  
  // Ensure minimum stock level is valid
  if (this.minStockLevel < 0) {
    throw new Error('Minimum stock level cannot be negative');
  }
  
  next();
});

export const Product = mongoose.model<IProduct>('Product', productSchema); 