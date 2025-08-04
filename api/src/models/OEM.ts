import mongoose, { Schema, Document } from 'mongoose';

export interface IOEM extends Document {
  oemCode: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  gstNumber?: string;
  panNumber?: string;
  bankDetails: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  products: {
    model: string;
    kva: string;
    phase: string;
    fuelType: 'diesel' | 'petrol' | 'gas' | 'hybrid';
    price: number;
    specifications: string;
    availability: 'in_stock' | 'out_of_stock' | 'on_order';
    leadTime: number; // in days
  }[];
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  creditLimit: number;
  creditDays: number;
  status: 'active' | 'inactive' | 'blacklisted';
  rating: number; // 1-5 stars
  notes: string;
  createdBy: any;
}

const OEMSchema = new Schema<IOEM>({
  oemCode: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    uppercase: true
  },
  companyName: { 
    type: String, 
    required: true,
    trim: true
  },
  contactPerson: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  alternatePhone: { 
    type: String,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  gstNumber: { 
    type: String,
    trim: true,
    uppercase: true
  },
  panNumber: { 
    type: String,
    trim: true,
    uppercase: true
  },
  bankDetails: {
    bankName: { type: String, required: true },
    accountNo: { type: String, required: true },
    ifsc: { type: String, required: true, uppercase: true },
    branch: { type: String, required: true }
  },
  products: [{
    model: { type: String, required: true },
    kva: { type: String, required: true },
    phase: { type: String, enum: ['single', 'three'], required: true },
    fuelType: { type: String, enum: ['diesel', 'petrol', 'gas', 'hybrid'], default: 'diesel' },
    price: { type: Number, required: true, min: 0 },
    specifications: { type: String },
    availability: { type: String, enum: ['in_stock', 'out_of_stock', 'on_order'], default: 'in_stock' },
    leadTime: { type: Number, default: 0, min: 0 }
  }],
  paymentTerms: { type: String, default: 'Net 30 days' },
  deliveryTerms: { type: String, default: 'FOB Destination' },
  warrantyTerms: { type: String, default: '12 months comprehensive warranty' },
  creditLimit: { type: Number, default: 0, min: 0 },
  creditDays: { type: Number, default: 30, min: 0 },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'blacklisted'],
    default: 'active'
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    default: 3 
  },
  notes: { type: String },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

OEMSchema.index({ oemCode: 1 });
OEMSchema.index({ companyName: 1 });
OEMSchema.index({ status: 1 });
OEMSchema.index({ 'products.kva': 1 });
OEMSchema.index({ 'products.availability': 1 });

export const OEM = mongoose.model<IOEM>('OEM', OEMSchema); 