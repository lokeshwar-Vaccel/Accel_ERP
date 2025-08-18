import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuotation extends Document {
  quotationNumber: string;
  invoiceId?: string | Types.ObjectId;
  issueDate: Date;
  validUntil: Date;
  customer: string | Types.ObjectId; // Reference to Customer model
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
  location?: string | Types.ObjectId;
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    hsnNumber?: string;
    partNo?: string;
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
  overallDiscount?: number;
  overallDiscountAmount?: number; // Calculated overall discount amount
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
  dgEnquiry?: string;
  assignedEngineer?: string | Types.ObjectId;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentDate?: Date;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

// Interface for populated quotations (used in controllers)
export interface IPopulatedQuotation extends Omit<IQuotation, 'customer'> {
  customer: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    pan?: string;
    addresses?: Array<{
      id: number;
      address: string;
      state: string;
      district: string;
      pincode: string;
      isPrimary: boolean;
      gstNumber?: string;
    }>;
  };
}

const QuotationSchema = new Schema<IQuotation>({
  quotationNumber: { type: String, unique: true },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  issueDate: { type: Date, },
  validUntil: { type: Date, },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },

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
  overallDiscountAmount: { type: Number, required: false }, // Calculated overall discount amount
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
  // Payment fields - same structure as Invoice model
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'failed'], 
    default: 'pending' 
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'razorpay', 'other']
  },
  paymentDate: { type: Date },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft' 
  },
});

// Pre-save middleware to calculate overallDiscountAmount
QuotationSchema.pre('save', function(next) {
  // Calculate overallDiscountAmount if overallDiscount is set
  if (this.overallDiscount && this.overallDiscount > 0) {
    // Calculate grand total before overall discount
    const grandTotalBeforeOverallDiscount = this.subtotal + this.totalTax - this.totalDiscount;
    this.overallDiscountAmount = Math.round((this.overallDiscount / 100) * grandTotalBeforeOverallDiscount * 100) / 100;
  } else {
    this.overallDiscountAmount = 0;
  }
  next();
});

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema); 