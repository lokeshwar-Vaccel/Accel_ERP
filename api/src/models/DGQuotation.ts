import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDGQuotation extends Document {
  quotationNumber: string;
  issueDate: Date;
  validUntil: Date;
  quotationRevisionNo: string;
  // DG Product Selection fields
  subject: string;
  annexureRating: string;
  dgModel: string;
  cylinder: string;
  // Warranty fields
  warrantyFromInvoice: string;
  warrantyFromCommissioning: string;
  warrantyHours: string;
  // Terms & Conditions fields
  taxRate: string;
  freightTerms: string;
  deliveryPeriod: string;
  validityDays: string;
  dgEnquiry?: Types.ObjectId; // Reference to DGEnquiry
  enquiryDetails?: {
    enquiryNo: string;
    enquiryDate: Date;
    enquiryType: string;
    enquiryStatus: string;
    enquiryStage: string;
    assignedEmployeeName: string;
    plannedFollowUpDate: Date;
    numberOfFollowUps: number;
  };
  // Sales Engineer assignment
  salesEngineer?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    salesEmployeeCode: string;
  };
  location?: string; // Reference to StockLocation
  customer: {
    _id?: string; // Customer ID for reference
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
  dgSpecifications: {
    kva: string;
    phase: string;
    quantity: number;
  };
  dgItems: Array<{
    product: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    kva: string;
    phase: string;
    annexureRating: string;
    dgModel: string;
    numberOfCylinders: number;
    subject: string;
    isActive: boolean;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  grandTotalInWords: string;
  notes?: string;
  terms?: string;
  paymentTerms?: string;
  warrantyTerms?: string;
  installationTerms?: string;
  commissioningTerms?: string;
  validityPeriod: number;
  deliveryTerms?: string;
  createdBy: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  sentDate?: Date;
  acceptedDate?: Date;
  rejectedDate?: Date;
  rejectionReason?: string;
  fromDateInvoice?: string;
  fromCommissingDate?: string;
  hours:string;
  taxes:string;
  freight:string;
  validity: string;
  employeeDetails: string;
  // Payment fields - same structure as Invoice model
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
}

const DGQuotationSchema = new Schema<IDGQuotation>({
  quotationNumber: { type: String, unique: true, required: true },
  issueDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  quotationRevisionNo: { type: String, required: true, default: '01' },
  // DG Product Selection fields
  subject: { type: String },
  annexureRating: { type: String },
  dgModel: { type: String },
  cylinder: { type: String },
  // Warranty fields
  warrantyFromInvoice: { type: String, default: '30' },
  warrantyFromCommissioning: { type: String, default: '24' },
  warrantyHours: { type: String, default: '5000' },
  // Terms & Conditions fields
  taxRate: { type: String, default: '18' },
  freightTerms: { type: String, default: 'extra' },
  deliveryPeriod: { type: String, default: '6' },
  validityDays: { type: String, default: '30' },
  dgEnquiry: { type: Schema.Types.ObjectId, ref: 'DGEnquiry' },
  enquiryDetails: {
    enquiryNo: { type: String },
    enquiryDate: { type: Date },
    enquiryType: { type: String },
    enquiryStatus: { type: String },
    enquiryStage: { type: String },
    assignedEmployeeName: { type: String },
    plannedFollowUpDate: { type: Date, required: false ,default: null},
    numberOfFollowUps: { type: Number, default: 0 },
  },
  // Sales Engineer assignment
  salesEngineer: {
    _id: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    fullName: { type: String },
    email: { type: String },
    phone: { type: String },
    salesEmployeeCode: { type: String },
  },
  location: { type: Schema.Types.ObjectId, ref: 'StockLocation' },
  customer: {
    _id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    pan: { type: String },
    corporateName: { type: String },
    address: { type: String },
    pinCode: { type: String },
    tehsil: { type: String },
    district: { type: String },
  },
  billToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number },
  },
  shipToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number },
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
      branch: { type: String },
    },
  },
  dgSpecifications: {
    kva: { type: String, required: true },
    phase: { type: String, required: true },
    quantity: { type: Number, required: true },
    segment: { type: String },
    subSegment: { type: String },
    dgOwnership: { type: String },
  },
  dgItems: [
    {
      product: { type: String, required: true },
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      kva: { type: String, required: true },
      phase: { type: String, required: true },
      annexureRating: { type: String, required: true },
      dgModel: { type: String, required: true },
      numberOfCylinders: { type: Number, required: true },
      subject: { type: String, required: true },
      isActive: { type: Boolean, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  grandTotalInWords: { type: String },
  notes: { type: String },
  terms: { type: String },
  validityPeriod: { type: Number, default: 30 },
  deliveryTerms: { type: String },
  paymentTerms: { type: String },
  warrantyTerms: { type: String },
  installationTerms: { type: String },
  commissioningTerms: { type: String },
  fromDateInvoice: { type: String },
  fromCommissingDate: { type: String },
  hours: { type: String },
  taxes: { type: String },
  freight: { type: String },
  validity: { type: String },
  employeeDetails: { type: String },
  createdBy: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'], 
    default: 'Draft' 
  },
  sentDate: { type: Date },
  acceptedDate: { type: Date },
  rejectedDate: { type: Date },
  rejectionReason: { type: String },
  // Payment fields - same structure as Invoice model
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Partial', 'Paid', 'Overdue'], 
    default: 'Pending' 
  },
}, {
  timestamps: true,
});

// Pre-save middleware to calculate remaining amount
DGQuotationSchema.pre('save', function(next) {
  if (this.grandTotal !== undefined && this.paidAmount !== undefined) {
    this.remainingAmount = Math.max(0, this.grandTotal - this.paidAmount);
  }
  next();
});

// Index for better query performance
DGQuotationSchema.index({ quotationNumber: 1 });
DGQuotationSchema.index({ dgEnquiry: 1 });
DGQuotationSchema.index({ 'customer._id': 1 });
DGQuotationSchema.index({ status: 1 });
DGQuotationSchema.index({ issueDate: -1 });
DGQuotationSchema.index({ createdBy: 1 });
DGQuotationSchema.index({ paymentStatus: 1 });

export const DGQuotation = mongoose.model<IDGQuotation>('DGQuotation', DGQuotationSchema); 