import mongoose, { Schema, Types } from 'mongoose';
import { IDGDetails } from '../types';

const dgDetailsSchema = new Schema({
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer reference is required']
  },
  dgSerialNumbers: {
    type: String,
    required: [true, 'DG Serial Number is required'],
    trim: true
  },
  alternatorMake: {
    type: String,
    required: false,
    trim: true,
    maxlength: [100, 'Alternator make cannot exceed 100 characters']
  },
  alternatorSerialNumber: {
    type: String,
    required: false,
    trim: true,
    maxlength: [100, 'Alternator serial number cannot exceed 100 characters']
  },
  dgMake: {
    type: String,
    required: [true, 'DG make is required'],
    trim: true,
    maxlength: [100, 'DG make cannot exceed 100 characters']
  },
  engineSerialNumber: {
    type: String,
    required: [true, 'Engine serial number is required'],
    trim: true,
    maxlength: [100, 'Engine serial number cannot exceed 100 characters']
  },
  dgModel: {
    type: String,
    required: [true, 'DG model is required'],
    trim: true,
    maxlength: [100, 'DG model cannot exceed 100 characters']
  },
  dgRatingKVA: {
    type: Number,
    required: [true, 'DG rating in KVA is required'],
    min: [0.1, 'DG rating must be greater than 0']
  },
  salesDealerName: {
    type: String,
    required: false,
    trim: true,
    maxlength: [200, 'Sales dealer name cannot exceed 200 characters']
  },
  commissioningDate: {
    type: Date,
    required: false
  },
  warrantyStatus: {
    type: String,
    enum: ['warranty', 'non_warranty'],
    required: [true, 'Warranty status is required']
  },
  cluster: {
    type: String,
    required: [true, 'Cluster is required'],
    trim: true,
    maxlength: [100, 'Cluster cannot exceed 100 characters']
  },
  // Optional reference to the customer's address where this DG is located
  locationAddressId: {
    type: Number,
    required: false
  },
  locationAddress: {
    type: String,
    trim: true,
    required: false,
    maxlength: [500, 'Location address cannot exceed 500 characters']
  },
  warrantyStartDate: {
    type: Date,
    required: false
  },
  warrantyEndDate: {
    type: Date,
    required: false
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
dgDetailsSchema.index({ dgSerialNumbers: 1 });
dgDetailsSchema.index({ dgMake: 1 });
dgDetailsSchema.index({ dgModel: 1 });
dgDetailsSchema.index({ commissioningDate: 1 });
dgDetailsSchema.index({ warrantyStatus: 1 });

// Compound index for customer and DG serial numbers
dgDetailsSchema.index({ customer: 1, dgSerialNumbers: 1 });

// Virtual for customer information
dgDetailsSchema.virtual('customerInfo', {
  ref: 'Customer',
  localField: 'customer',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware to validate DG serial number is not empty
dgDetailsSchema.pre('save', function(this: any, next) {
  if (!this.dgSerialNumbers || this.dgSerialNumbers.trim() === '') {
    return next(new Error('DG Serial Number cannot be empty'));
  }
  next();
});

export const DGDetails = mongoose.model<IDGDetails>('DGDetails', dgDetailsSchema); 