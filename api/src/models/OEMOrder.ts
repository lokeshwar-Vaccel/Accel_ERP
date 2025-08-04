import mongoose, { Schema, Document } from 'mongoose';

export interface IOEMOrder extends Document {
  orderNumber: string;
  oem: any;
  dgPurchaseOrder: any;
  customer: any;
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  items: {
    model: string;
    kva: string;
    phase: string;
    fuelType: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specifications: string;
    serialNumbers?: string[];
  }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
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
  status: 'draft' | 'sent' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  deliveryStatus: 'pending' | 'partial' | 'completed';
  paymentStatus: 'pending' | 'advance_paid' | 'partial' | 'completed';
  notes: string;
  createdBy: any;
}

const OEMOrderSchema = new Schema<IOEMOrder>({
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  oem: { 
    type: Schema.Types.ObjectId, 
    ref: 'OEM', 
    required: true 
  },
  dgPurchaseOrder: { 
    type: Schema.Types.ObjectId, 
    ref: 'DGPurchaseOrder',
    required: true 
  },
  customer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  orderDate: { 
    type: Date, 
    required: true 
  },
  expectedDeliveryDate: { 
    type: Date, 
    required: true 
  },
  actualDeliveryDate: { 
    type: Date 
  },
  items: [{
    model: { type: String, required: true },
    kva: { type: String, required: true },
    phase: { type: String, required: true },
    fuelType: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    specifications: { type: String },
    serialNumbers: [{ type: String }]
  }],
  subtotal: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  advanceAmount: { type: Number, default: 0, min: 0 },
  balanceAmount: { type: Number, required: true, min: 0 },
  deliveryAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentTerms: { type: String, required: true },
  deliveryTerms: { type: String, required: true },
  warrantyTerms: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'],
    default: 'draft'
  },
  deliveryStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'completed'],
    default: 'pending'
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'advance_paid', 'partial', 'completed'],
    default: 'pending'
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

OEMOrderSchema.index({ orderNumber: 1 });
OEMOrderSchema.index({ oem: 1 });
OEMOrderSchema.index({ dgPurchaseOrder: 1 });
OEMOrderSchema.index({ customer: 1 });
OEMOrderSchema.index({ status: 1 });
OEMOrderSchema.index({ deliveryStatus: 1 });
OEMOrderSchema.index({ paymentStatus: 1 });

export const OEMOrder = mongoose.model<IOEMOrder>('OEMOrder', OEMOrderSchema); 