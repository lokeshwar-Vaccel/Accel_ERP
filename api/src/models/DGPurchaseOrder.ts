import mongoose, { Schema, Document, Types } from 'mongoose';

// DG Purchase order item interface
interface IDGPOItemSchema {
  product: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  receivedQuantity?: number;
  notes?: string;
}

// Main DG purchase order interface
interface IDGPurchaseOrderSchema extends Document {
  poNumber: string;
  dgQuotation?: mongoose.Types.ObjectId; // Reference to DGQuotation
  customer: {
    _id?: string; // DGCustomer ID for reference
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  supplier: string;
  supplierEmail: string;
  supplierAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  items: IDGPOItemSchema[];
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | 'partially_received';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  // New fields for shipping and documentation
  shipDate?: Date;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: Date;
  documentNumber?: string;
  documentDate?: Date;
  notes?: string;
  terms?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dgPOItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
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
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const dgPurchaseOrderSchema = new Schema({
  poNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  dgQuotation: {
    type: Schema.Types.ObjectId,
    ref: 'DGQuotation'
  },
  customer: {
    _id: { type: String },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    pan: { type: String, trim: true },
    corporateName: { type: String, trim: true },
    address: { type: String, trim: true },
    pinCode: { type: String, trim: true },
    tehsil: { type: String, trim: true },
    district: { type: String, trim: true }
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
  },
  supplierAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true }
  },
  items: [dgPOItemSchema],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received'],
    default: 'draft'
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  shipDate: {
    type: Date
  },
  docketNumber: {
    type: String,
    trim: true
  },
  noOfPackages: {
    type: Number,
    min: [0, 'Number of packages cannot be negative']
  },
  gstInvoiceNumber: {
    type: String,
    trim: true
  },
  invoiceDate: {
    type: Date
  },
  documentNumber: {
    type: String,
    trim: true
  },
  documentDate: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
dgPurchaseOrderSchema.index({ poNumber: 1 });
dgPurchaseOrderSchema.index({ dgQuotation: 1 });
dgPurchaseOrderSchema.index({ 'customer._id': 1 });
dgPurchaseOrderSchema.index({ supplier: 1 });
dgPurchaseOrderSchema.index({ status: 1 });
dgPurchaseOrderSchema.index({ orderDate: -1 });
dgPurchaseOrderSchema.index({ createdBy: 1 });

export const DGPurchaseOrder = mongoose.model<IDGPurchaseOrderSchema>('DGPurchaseOrder', dgPurchaseOrderSchema); 