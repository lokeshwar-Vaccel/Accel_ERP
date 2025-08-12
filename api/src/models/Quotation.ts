import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuotation extends Document {
  quotationNumber: string;
  invoiceId?: string | Types.ObjectId;
  issueDate: Date;
  validUntil: Date;
  customer: {
    _id?: string; // Customer ID for reference
    name: string;
    email?: string;
    phone?: string;
    pan?: string;
  };
  company: {
    name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    pan?: string;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifsc?: string;
      branch?: string;
    };
  };
  location?: string | Types.ObjectId; // Added location field as reference
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    hsnNumber?: string; // Added hsnNumber field
    partNo?: string; // Added partNo field
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  overallDiscount?: number; // Add overall discount field
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  validityPeriod: number;
  billToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
  };
  dgEnquiry?: string; // Add reference to DGEnquiry
  assignedEngineer?: string | Types.ObjectId; // Add reference to assigned engineer (Field Operator)
  // Advance payment fields
  advanceAmount?: number;
  remainingAmount?: number;
  advancePaymentStatus?: 'pending' | 'partial' | 'paid';
  advancePaymentDate?: Date;
  advancePaymentMethod?: string;
  advancePaymentNotes?: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

const QuotationSchema = new Schema<IQuotation>({
  quotationNumber: { type: String, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  issueDate: { type: Date, },
  validUntil: { type: Date, },
  customer: {
    _id: { type: String }, // Customer ID for reference
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    pan: { type: String }
  },

  company: {
    name: { type: String, },
    logo: { type: String },
    address: { type: String, },
    phone: { type: String, },
    email: { type: String, },
    pan: { type: String },
    bankDetails: {
      bankName: { type: String },
      accountNo: { type: String },
      ifsc: { type: String },
      branch: { type: String },
    },
  },
  location: { type: Schema.Types.ObjectId, ref: 'StockLocation' }, // Added location field as reference
  items: [
    {
      product: { type: String, },
      description: { type: String, },
      hsnCode: { type: String },
      hsnNumber: { type: String }, // Added hsnNumber field
      partNo: { type: String }, // Added partNo field
      quantity: { type: Number, },
      uom: { type: String, },
      unitPrice: { type: Number, },
      discount: { type: Number, },
      discountedAmount: { type: Number, },
      taxRate: { type: Number, },
      taxAmount: { type: Number, },
      totalPrice: { type: Number, },
    },
  ],
  subtotal: { type: Number, },
  totalDiscount: { type: Number, },
  overallDiscount: { type: Number, required: false },
  totalTax: { type: Number, },
  grandTotal: { type: Number, },
  roundOff: { type: Number, },
  notes: { type: String },
  terms: { type: String },
  validityPeriod: { type: Number, },
  billToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number }
  },
  shipToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number }
  },
  dgEnquiry: { type: Schema.Types.ObjectId, ref: 'DGEnquiry', required: false },
  assignedEngineer: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  // Advance payment fields
  advanceAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  advancePaymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid'], 
    default: 'pending' 
  },
  advancePaymentDate: { type: Date },
  advancePaymentMethod: { type: String },
  advancePaymentNotes: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft' 
  },
});

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema); 