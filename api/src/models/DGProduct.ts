import mongoose, { Schema } from 'mongoose';
import { IDGProduct, ProductCategory } from '../types';

const dgProductSchema = new Schema({
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Essential DG Fields Only
  kva: {
    type: String,
    required: [true, 'KVA rating is required'],
    trim: true
  },
  phase: {
    type: String,
    enum: ['single', 'three'],
    required: [true, 'Phase is required']
  },
  annexureRating: {
    type: String,
    required: [true, 'Annexure rating is required'],
    trim: true
  },
  dgModel: {
    type: String,
    required: [true, 'DG model is required'],
    trim: true
  },
  numberOfCylinders: {
    type: Number,
    required: [true, 'Number of cylinders is required'],
    min: [1, 'Number of cylinders must be at least 1']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [500, 'Subject cannot exceed 500 characters']
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

// Indexes for efficient querying
dgProductSchema.index({ description: 'text' });
dgProductSchema.index({ kva: 1 });
dgProductSchema.index({ phase: 1 });

// Virtual for product code (auto-generated)
dgProductSchema.virtual('productCode').get(function(this: any) {
  const idCode = this._id.toString().slice(-6).toUpperCase();
  return `DG-${idCode}`;
});

export const DGProduct = mongoose.model<IDGProduct>('DGProduct', dgProductSchema, 'dgproducts'); 