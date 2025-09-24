import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAMCOfferItem {
  make: string;
  engineSlNo: string;
  dgRatingKVA: number;
  typeOfVisits: string;
  qty: number;
  amcCostPerDG: number;
  totalAMCAmountPerDG: number;
  gst18: number;
  totalAMCCost: number;
}

export interface IAMCSpareItem {
  srNo: number;
  partNo: string;
  description: string;
  hsnCode: string;
  qty: number;
  productId?: string | Types.ObjectId;
  uom?: string;
  unitPrice?: number;
  gstRate?: number;
  discount?: number;
  discountedAmount?: number;
  taxAmount?: number;
  totalPrice?: number;
  availableQuantity?: number;
}

export interface IAMCQuotation extends Document {
  quotationNumber: string;
  quotationType: 'amc';
  issueDate: Date;
  validUntil: Date;
  customer: {
    _id?: string | Types.ObjectId;
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
  location?: string | Types.ObjectId;
  assignedEngineer?: string | Types.ObjectId;
  
  // AMC-specific fields
  amcType: 'AMC' | 'CAMC';
  contractDuration: number; // in months
  contractStartDate: Date;
  contractEndDate: Date;
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  numberOfVisits: number;
  numberOfOilServices: number;
  responseTime: number; // in hours
  coverageArea: string;
  emergencyContactHours: string;
  exclusions: string[];
  performanceMetrics: {
    avgResponseTime: number;
    customerSatisfaction: number;
    issueResolutionRate: number;
  };
  warrantyTerms: string;
  paymentTerms: string;
  renewalTerms: string;
  discountPercentage: number;
  
  // AMC Offer specific fields
  offerItems: IAMCOfferItem[];
  sparesItems: IAMCSpareItem[];
  selectedCustomerDG: any;
  subject?: string;
  refOfQuote: string;
  paymentTermsText: string;
  validityText: string;
  amcPeriodFrom: Date;
  amcPeriodTo: Date;
  gstIncluded: boolean;
  
  // Standard quotation fields
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
  serviceCharges: Array<{
    description: string;
    hsnNumber?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  batteryBuyBack?: {
    description: string;
    hsnNumber?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  };
  subtotal: number;
  totalDiscount: number;
  overallDiscount?: number;
  overallDiscountAmount?: number;
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
    gstNumber?: string;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
    gstNumber?: string;
  };
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdBy?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AMCOfferItemSchema = new Schema<IAMCOfferItem>({
  make: { type: String, required: true },
  engineSlNo: { type: String, required: true },
  dgRatingKVA: { type: Number, required: true },
  typeOfVisits: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
  amcCostPerDG: { type: Number, required: true, default: 0 },
  totalAMCAmountPerDG: { type: Number, required: true, default: 0 },
  gst18: { type: Number, required: true, default: 0 },
  totalAMCCost: { type: Number, required: true, default: 0 }
}, { _id: false });

const AMCSpareItemSchema = new Schema<IAMCSpareItem>({
  srNo: { type: Number, required: true },
  partNo: { type: String, required: true },
  description: { type: String, required: true },
  hsnCode: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  uom: { type: String, default: 'nos' },
  unitPrice: { type: Number, default: 0 },
  gstRate: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  discountedAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 }
}, { _id: false });

const AMCQuotationSchema = new Schema<IAMCQuotation>({
  quotationNumber: { type: String, unique: true, required: true },
  quotationType: { type: String, default: 'amc', enum: ['amc'] },
  issueDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  
  customer: {
    _id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    pan: { type: String }
  },
  
  company: {
    name: { type: String },
    logo: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    pan: { type: String },
    bankDetails: {
      bankName: { type: String },
      accountNo: { type: String },
      ifsc: { type: String },
      branch: { type: String }
    }
  },
  
  location: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  assignedEngineer: { type: Schema.Types.ObjectId, ref: 'User' },
  
  // AMC-specific fields
  amcType: { type: String, required: true, enum: ['AMC', 'CAMC'], default: 'AMC' },
  contractDuration: { type: Number, required: true, default: 12 },
  contractStartDate: { type: Date, required: true },
  contractEndDate: { type: Date, required: true },
  billingCycle: { type: String, required: true, enum: ['monthly', 'quarterly', 'half-yearly', 'yearly'], default: 'yearly' },
  numberOfVisits: { type: Number, required: true, default: 12 },
  numberOfOilServices: { type: Number, required: true, default: 4 },
  responseTime: { type: Number, required: true, default: 24 },
  coverageArea: { type: String, default: '' },
  emergencyContactHours: { type: String, default: '24/7' },
  exclusions: [{ type: String }],
  performanceMetrics: {
    avgResponseTime: { type: Number, default: 4 },
    customerSatisfaction: { type: Number, default: 95 },
    issueResolutionRate: { type: Number, default: 98 }
  },
  warrantyTerms: { type: String, default: '' },
  paymentTerms: { type: String, default: '' },
  renewalTerms: { type: String, default: '' },
  discountPercentage: { type: Number, default: 0 },
  
  // AMC Offer specific fields
  offerItems: [AMCOfferItemSchema],
  sparesItems: [AMCSpareItemSchema],
  selectedCustomerDG: { type: Schema.Types.Mixed },
  subject: { type: String },
  refOfQuote: { type: String, default: '' },
  paymentTermsText: { type: String, default: '' },
  validityText: { type: String, default: '' },
  amcPeriodFrom: { type: Date, required: true },
  amcPeriodTo: { type: Date, required: true },
  gstIncluded: { type: Boolean, default: true },
  
  // Standard quotation fields
  items: [{
    product: { type: String, required: true },
    description: { type: String, required: true },
    hsnCode: { type: String },
    hsnNumber: { type: String },
    partNo: { type: String },
    quantity: { type: Number, required: true },
    uom: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  }],
  
  serviceCharges: [{
    description: { type: String, required: true },
    hsnNumber: { type: String },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 18 },
    taxAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  }],
  
  batteryBuyBack: {
    description: { type: String },
    hsnNumber: { type: String },
    quantity: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 }
  },
  
  subtotal: { type: Number, default: 0 },
  totalDiscount: { type: Number, default: 0 },
  overallDiscount: { type: Number, default: 0 },
  overallDiscountAmount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  roundOff: { type: Number, default: 0 },
  notes: { type: String },
  terms: { type: String },
  validityPeriod: { type: Number, default: 30 },
  
  billToAddress: {
    address: { type: String },
    state: { type: String },
    district: { type: String },
    pincode: { type: String },
    addressId: { type: Number },
    gstNumber: { type: String }
  },
  
  shipToAddress: {
    address: { type: String },
    state: { type: String },
    district: { type: String },
    pincode: { type: String },
    addressId: { type: Number },
    gstNumber: { type: String }
  },
  
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid', 'gst_pending'], default: 'pending' },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for better query performance
AMCQuotationSchema.index({ quotationNumber: 1 });
AMCQuotationSchema.index({ 'customer._id': 1 });
AMCQuotationSchema.index({ issueDate: -1 });
AMCQuotationSchema.index({ status: 1 });
AMCQuotationSchema.index({ paymentStatus: 1 });
AMCQuotationSchema.index({ amcType: 1 });

// Pre-save middleware to calculate totals
AMCQuotationSchema.pre('save', function(next) {
  // Calculate AMC offer totals
  if (this.offerItems && this.offerItems.length > 0) {
    this.offerItems.forEach(item => {
      item.totalAMCAmountPerDG = item.qty * item.amcCostPerDG;
      item.gst18 = item.totalAMCAmountPerDG * 0.18;
      item.totalAMCCost = item.totalAMCAmountPerDG + item.gst18;
    });
  }
  
  // Calculate spares totals
  if (this.sparesItems && this.sparesItems.length > 0) {
    this.sparesItems.forEach(item => {
      const itemSubtotal = item.qty * (item.unitPrice || 0);
      const discountAmount = ((item.discount || 0) / 100) * itemSubtotal;
      item.discountedAmount = itemSubtotal - discountAmount;
      item.taxAmount = ((item.gstRate || 0) / 100) * item.discountedAmount;
      item.totalPrice = item.discountedAmount + item.taxAmount;
    });
  }
  
  // Calculate AMC totals from offerItems
  let amcSubtotal = 0;
  let amcTotalTax = 0;
  let amcGrandTotal = 0;

  if (this.offerItems && this.offerItems.length > 0) {
    const gstIncluded = this.gstIncluded !== false; // Default to true if not specified
    
    this.offerItems.forEach(item => {
      const qty = Number(item.qty) || 0;
      const costPerDG = Number(item.amcCostPerDG) || 0;
      const itemSubtotal = qty * costPerDG;
      
      let itemTax = 0;
      let itemTotal = itemSubtotal;
      
      if (gstIncluded) {
        // GST is included in the cost per DG
        itemTax = itemSubtotal * 0.18; // 18% GST
        itemTotal = itemSubtotal + itemTax;
      } else {
        // GST is not included, so the cost per DG is the final amount
        itemTotal = itemSubtotal;
      }

      amcSubtotal += itemSubtotal;
      amcTotalTax += itemTax;
      amcGrandTotal += itemTotal;
    });
  }

  // Set AMC totals
  this.subtotal = Math.round(amcSubtotal * 100) / 100;
  this.totalTax = Math.round(amcTotalTax * 100) / 100;
  this.grandTotal = Math.round(amcGrandTotal * 100) / 100;
  
  // Calculate remaining amount
  this.remainingAmount = Math.max(0, this.grandTotal - (this.paidAmount || 0));
  
  next();
});

export const AMCQuotation = mongoose.model<IAMCQuotation>('AMCQuotation', AMCQuotationSchema);
