import mongoose, { Schema, Document, Types } from 'mongoose';


export interface IAMCInvoice extends Document {
  // Invoice identification
  invoiceNumber: string;
  invoiceType: 'amc';
  issueDate: Date;
  dueDate: Date;
  
  // Reference fields (from tax invoice)
  irn?: string; // Invoice Reference Number
  ackNo?: string; // Acknowledgement Number
  ackDate?: Date; // Acknowledgement Date
  deliveryNote?: string;
  referenceNo?: string;
  referenceDate?: Date;
  buyerOrderNo?: string;
  buyerOrderDate?: Date;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  termsOfPayment?: string;
  otherReferences?: string;
  deliveryNoteDate?: Date;
  destination?: string;
  termsOfDelivery?: string;
  
  // Customer and addresses
  customer: {
    _id?: string | Types.ObjectId;
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
      email?: string;
      phone?: string;
      contactPersonName?: string;
      designation?: string;
      registrationStatus?: string;
    }>;
  };
  
  billToAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
    gstNumber?: string;
    email?: string;
    phone?: string;
    contactPersonName?: string;
    designation?: string;
    registrationStatus?: string;
  };
  
  shipToAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
    gstNumber?: string;
    email?: string;
    phone?: string;
    contactPersonName?: string;
    designation?: string;
    registrationStatus?: string;
  };
  
  // Company details
  company: {
    name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    pan?: string;
    gstin?: string;
    stateName?: string;
    stateCode?: string;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifsc?: string;
      branch?: string;
    };
  };
  
  // AMC specific
  amcType: 'AMC' | 'CAMC';
  sourceQuotation: string | Types.ObjectId; // Reference to AMCQuotation
  quotationNumber: string;
  
  // AMC Offer Items
  offerItems: Array<{
    make: string;
    engineSlNo: string;
    dgRatingKVA?: number;
    typeOfVisits?: number;
    qty?: number;
    amcCostPerDG?: number;
    totalAMCAmountPerDG: number;
    gst18: number;
    totalAMCCost: number;
  }>;
  
  // AMC Spare Items (for CAMC)
  sparesItems: Array<{
    srNo: number;
    partNo: string;
    description: string;
    hsnCode: string;
    qty: number;
    productId?: string;
    uom?: string;
    unitPrice?: number;
    gstRate?: number;
    discount?: number;
    discountedAmount?: number;
    taxAmount?: number;
    totalPrice?: number;
    availableQuantity?: number;
  }>;
  
  
  // Financial details
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  
  // Tax summary
  taxSummary: Array<{
    hsnSac: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTaxAmount: number;
  }>;
  
  // Payment tracking
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Additional fields
  notes?: string;
  terms?: string;
  createdBy?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AMCInvoiceSchema = new Schema<IAMCInvoice>({
  // Invoice identification
  invoiceNumber: { type: String, unique: true, required: true },
  invoiceType: { type: String, default: 'amc', enum: ['amc'] },
  issueDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  
  // Reference fields
  irn: { type: String },
  ackNo: { type: String },
  ackDate: { type: Date },
  deliveryNote: { type: String },
  referenceNo: { type: String },
  referenceDate: { type: Date },
  buyerOrderNo: { type: String },
  buyerOrderDate: { type: Date },
  dispatchDocNo: { type: String },
  dispatchedThrough: { type: String },
  termsOfPayment: { type: String },
  otherReferences: { type: String },
  deliveryNoteDate: { type: Date },
  destination: { type: String },
  termsOfDelivery: { type: String },
  
  // Customer and addresses
  customer: {
    _id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    pan: { type: String }
  },
  
  billToAddress: {
    address: { type: String },
    state: { type: String },
    district: { type: String },
    pincode: { type: String },
    addressId: { type: Number },
    gstNumber: { type: String },
    email: { type: String },
    phone: { type: String },
    contactPersonName: { type: String },
    designation: { type: String },
    registrationStatus: { type: String }
  },
  
  shipToAddress: {
    address: { type: String },
    state: { type: String },
    district: { type: String },
    pincode: { type: String },
    addressId: { type: Number },
    gstNumber: { type: String },
    email: { type: String },
    phone: { type: String },
    contactPersonName: { type: String },
    designation: { type: String },
    registrationStatus: { type: String }
  },
  
  // Company details
  company: {
    name: { type: String },
    logo: { type: String },
    address: { type: String },
    phone: { type: String },
    email: { type: String },
    pan: { type: String },
    gstin: { type: String },
    stateName: { type: String },
    stateCode: { type: String },
    bankDetails: {
      bankName: { type: String },
      accountNo: { type: String },
      ifsc: { type: String },
      branch: { type: String }
    }
  },
  
  // AMC specific
  amcType: { type: String, required: true, enum: ['AMC', 'CAMC'] },
  sourceQuotation: { type: Schema.Types.ObjectId, ref: 'AMCQuotation' },
  quotationNumber: { type: String },
  
  // AMC Offer Items
  offerItems: [{
    make: { type: String, required: true },
    engineSlNo: { type: String, required: true },
    dgRatingKVA: { type: Number },
    typeOfVisits: { type: Number },
    qty: { type: Number, default: 1 },
    hsnCode: { type: String, default: '' }, // Default HSN code for maintenance services
    uom: { type: String, default: 'nos' }, // Unit of measurement
    amcCostPerDG: { type: Number },
    totalAMCAmountPerDG: { type: Number, default: 0 },
    gst18: { type: Number, default: 0 },
    totalAMCCost: { type: Number, default: 0 }
  }],
  
  // AMC Spare Items (for CAMC)
  sparesItems: [{
    srNo: { type: Number, required: true },
    partNo: { type: String, required: true },
    description: { type: String, required: true },
    hsnCode: { type: String, required: true },
    qty: { type: Number, required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    uom: { type: String, default: 'nos' },
    unitPrice: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 }
  }],
  
  // Financial details
  subtotal: { type: Number, default: 0 },
  cgst: { type: Number, default: 0 },
  sgst: { type: Number, default: 0 },
  igst: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountInWords: { type: String },
  
  // Tax summary
  taxSummary: [{
    hsnSac: { type: String, required: true },
    taxableValue: { type: Number, required: true },
    cgstRate: { type: Number, required: true },
    cgstAmount: { type: Number, required: true },
    sgstRate: { type: Number, required: true },
    sgstAmount: { type: Number, required: true },
    igstRate: { type: Number, required: true },
    igstAmount: { type: Number, required: true },
    totalTaxAmount: { type: Number, required: true }
  }],
  
  // Payment tracking
  paidAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['pending', 'partial', 'paid', 'overdue'], default: 'pending' },
  
  // Status
  status: { type: String, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'], default: 'draft' },
  
  // Additional fields
  notes: { type: String },
  terms: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for better query performance
AMCInvoiceSchema.index({ invoiceNumber: 1 });
AMCInvoiceSchema.index({ 'customer._id': 1 });
AMCInvoiceSchema.index({ issueDate: -1 });
AMCInvoiceSchema.index({ status: 1 });
AMCInvoiceSchema.index({ paymentStatus: 1 });
AMCInvoiceSchema.index({ amcType: 1 });
AMCInvoiceSchema.index({ sourceQuotation: 1 });


export const AMCInvoice = mongoose.model<IAMCInvoice>('AMCInvoice', AMCInvoiceSchema);
