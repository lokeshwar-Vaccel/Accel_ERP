import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IDGQuotation extends Document {
  quotationNumber: string;
  issueDate: Date;
  validUntil: Date;
  dgEnquiry?: Types.ObjectId; // Reference to DGEnquiry
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
    fuelType?: string;
    engineModel?: string;
    alternatorModel?: string;
    fuelTankCapacity?: string;
    runtime?: string;
    noiseLevel?: string;
    emissionCompliance?: string;
  };
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
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
  services: Array<{
    serviceName: string;
    description: string;
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
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  validityPeriod: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  warrantyTerms?: string;
  installationTerms?: string;
  commissioningTerms?: string;
  createdBy: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  sentDate?: Date;
  acceptedDate?: Date;
  rejectedDate?: Date;
  rejectionReason?: string;
}

const DGQuotationSchema = new Schema<IDGQuotation>({
  quotationNumber: { type: String, unique: true, required: true },
  issueDate: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  dgEnquiry: { type: Schema.Types.ObjectId, ref: 'DGEnquiry' },
  customer: {
    _id: { type: String },
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
    fuelType: { type: String },
    engineModel: { type: String },
    alternatorModel: { type: String },
    fuelTankCapacity: { type: String },
    runtime: { type: String },
    noiseLevel: { type: String },
    emissionCompliance: { type: String },
  },
  items: [
    {
      product: { type: String, required: true },
      description: { type: String, required: true },
      hsnCode: { type: String },
      partNo: { type: String },
      quantity: { type: Number, required: true },
      uom: { type: String, required: true },
      unitPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      discountedAmount: { type: Number, required: true },
      taxRate: { type: Number, required: true },
      taxAmount: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],
  services: [
    {
      serviceName: { type: String, required: true },
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      uom: { type: String, required: true },
      unitPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      discountedAmount: { type: Number, required: true },
      taxRate: { type: Number, required: true },
      taxAmount: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, required: true },
  totalTax: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  roundOff: { type: Number, default: 0 },
  notes: { type: String },
  terms: { type: String },
  validityPeriod: { type: Number, required: true },
  deliveryTerms: { type: String },
  paymentTerms: { type: String },
  warrantyTerms: { type: String },
  installationTerms: { type: String },
  commissioningTerms: { type: String },
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
}, {
  timestamps: true,
});

// Index for better query performance
DGQuotationSchema.index({ quotationNumber: 1 });
DGQuotationSchema.index({ dgEnquiry: 1 });
DGQuotationSchema.index({ 'customer._id': 1 });
DGQuotationSchema.index({ status: 1 });
DGQuotationSchema.index({ issueDate: -1 });
DGQuotationSchema.index({ createdBy: 1 });

export const DGQuotation = mongoose.model<IDGQuotation>('DGQuotation', DGQuotationSchema); 