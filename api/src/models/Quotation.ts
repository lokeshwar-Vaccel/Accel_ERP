import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuotation extends Document {
  quotationNumber: string;
  subject?: string; // Subject/Sub field for quotation
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
  // Service Ticket related fields
  engineSerialNumber?: string; // Engine Serial Number from ServiceTicket
  kva?: string; // KVA rating from ServiceTicket
  hourMeterReading?: string; // Hour Meter Reading from ServiceTicket
  serviceRequestDate?: Date; // Service Request Date from ServiceTicket
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
  // New fields for service charges and battery buy back
  serviceCharges: Array<{
    description: string;
    hsnNumber?: string; // Add HSN field for service charges
    quantity: number;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  batteryBuyBack: {
    description: string;
    hsnNumber?: string; // Add HSN field for battery buy back
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
  overallDiscountAmount?: number; // Calculated overall discount amount
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  qrCodeImage?: string; // QR code image URL or base64 string
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
  dgEnquiry?: string;
  assignedEngineer?: string | Types.ObjectId;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
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
  // Service Ticket related fields will be available from the main IQuotation interface
}

const QuotationSchema = new Schema<IQuotation>({
  quotationNumber: { type: String, unique: true },
  subject: { type: String, default: '' },
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
  // Service Ticket related fields
  engineSerialNumber: { type: String },
  kva: { type: String },
  hourMeterReading: { type: String },
  serviceRequestDate: { type: Date },
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
  // New fields for service charges and battery buy back
  serviceCharges: [
    {
      description: { type: String, required: true },
      hsnNumber: { type: String, required: false }, // Add HSN field for service charges
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      discountedAmount: { type: Number, default: 0 }, // Made optional, will be calculated
      taxRate: { type: Number, required: true },
      taxAmount: { type: Number, default: 0 }, // Made optional, will be calculated
      totalPrice: { type: Number, default: 0 }, // Made optional, will be calculated
    },
  ],
  batteryBuyBack: {
    description: { type: String, required: true },
    hsnNumber: { type: String, required: false }, // Add HSN field for battery buy back
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountedAmount: { type: Number, default: 0 }, // Made optional, will be calculated
    taxRate: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 }, // Made optional, will be calculated
    totalPrice: { type: Number, default: 0 }, // Made optional, will be calculated
  },
  subtotal: { type: Number, },
  totalDiscount: { type: Number, },
  overallDiscount: { type: Number, required: false },
  overallDiscountAmount: { type: Number, required: false }, // Calculated overall discount amount
  totalTax: { type: Number, },
  grandTotal: { type: Number, },
  roundOff: { type: Number, },
  notes: { type: String },
  terms: { type: String },
  qrCodeImage: { type: String }, // QR code image URL or base64 string
  validityPeriod: { type: Number, },
  billToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number },
    gstNumber: { type: String, trim: true, maxlength: [50, 'GST number cannot exceed 50 characters'] }
  },
  shipToAddress: {
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    pincode: { type: String, trim: true },
    addressId: { type: Number },
    gstNumber: { type: String, trim: true, maxlength: [50, 'GST number cannot exceed 50 characters'] }
  },
  dgEnquiry: { type: Schema.Types.ObjectId, ref: 'DGEnquiry', required: false } as any,
  assignedEngineer: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  // Payment fields - same structure as Invoice model
  paidAmount: { type: Number, default: 0, min: 0 },
  remainingAmount: { type: Number, default: 0, min: 0 },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid', 'failed'], 
    default: 'pending' 
  },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft' 
  },
});

// Pre-save middleware to calculate all required fields
QuotationSchema.pre('save', function(next) {
  const doc = this as any; // Type assertion to access dynamic properties
  
  // Only recalculate if the values haven't been set by QuotationService
  // Check if grandTotal is already calculated (indicates QuotationService has run)
  if (doc.grandTotal !== undefined && doc.grandTotal !== null) {
    // Values are already calculated by QuotationService, just ensure remaining amount and payment status
    if (!doc.paidAmount) doc.paidAmount = 0;
    doc.remainingAmount = Math.max(0, Math.round((doc.grandTotal - doc.paidAmount) * 100) / 100);

    // --- Auto set paymentStatus based on amounts ---
    if (doc.paidAmount === 0) {
      doc.paymentStatus = 'pending';
    } else if (doc.paidAmount < doc.grandTotal) {
      doc.paymentStatus = 'partial';
    } else if (doc.paidAmount >= doc.grandTotal) {
      doc.paymentStatus = 'paid';
    }
    
    next();
    return;
  }
  
  // --- Service Charges calculation ---
  if (doc.serviceCharges && doc.serviceCharges.length > 0) {
    doc.serviceCharges.forEach((service: any) => {
      const itemSubtotal = service.quantity * service.unitPrice;
      const discountAmount = (service.discount / 100) * itemSubtotal;
      const discountedAmount = itemSubtotal - discountAmount;
      const taxAmount = (service.taxRate / 100) * discountedAmount;
      const totalPrice = discountedAmount + taxAmount;
      
      service.discountedAmount = Math.round(discountAmount * 100) / 100;
      service.taxAmount = Math.round(taxAmount * 100) / 100;
      service.totalPrice = Math.round(totalPrice * 100) / 100;
    });
  }

  // --- Battery Buy Back calculation ---
  if (doc.batteryBuyBack) {
    const itemSubtotal = doc.batteryBuyBack.quantity * doc.batteryBuyBack.unitPrice;
    const discountAmount = (doc.batteryBuyBack.discount / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = 0; // No GST for battery buy back
    const totalPrice = discountedAmount; // No GST added
    
    doc.batteryBuyBack.discountedAmount = Math.round(discountAmount * 100) / 100;
    doc.batteryBuyBack.taxAmount = 0; // No GST for battery buy back
    doc.batteryBuyBack.totalPrice = Math.round(totalPrice * 100) / 100;
  }

  // --- Overall Discount calculation ---
  if (doc.overallDiscount && doc.overallDiscount > 0) {
    // Use the grand total before overall discount that was calculated by QuotationService
    let grandTotalBeforeOverallDiscount = doc.subtotal - doc.totalDiscount + doc.totalTax;
    
    doc.overallDiscountAmount =
      Math.round((doc.overallDiscount / 100) * grandTotalBeforeOverallDiscount * 100) / 100;
  } else {
    doc.overallDiscountAmount = 0;
  }

  // --- Grand Total calculation ---
  // Use the values already calculated by QuotationService
  let grandTotal = doc.subtotal - doc.totalDiscount + doc.totalTax;

  if (doc.overallDiscountAmount && doc.overallDiscountAmount > 0) {
    grandTotal -= doc.overallDiscountAmount;
  }

  if (doc.batteryBuyBack && doc.batteryBuyBack.totalPrice) {
    grandTotal -= doc.batteryBuyBack.totalPrice;
  }

  console.log("____step 3", grandTotal);
  
  doc.grandTotal = Math.round(grandTotal * 100) / 100;

  // --- Remaining Amount calculation ---
  // remainingAmount = grandTotal - paidAmount
  if (!doc.paidAmount) doc.paidAmount = 0;
  doc.remainingAmount = Math.max(0, Math.round((doc.grandTotal - doc.paidAmount) * 100) / 100);

  // --- Auto set paymentStatus based on amounts ---
  if (doc.paidAmount === 0) {
    doc.paymentStatus = 'pending';
  } else if (doc.paidAmount < doc.grandTotal) {
    doc.paymentStatus = 'partial';
  } else if (doc.paidAmount >= doc.grandTotal) {
    doc.paymentStatus = 'paid';
  }

  next();
});
// Virtual populate for PO from Customers that reference this quotation (array)
QuotationSchema.virtual('pofromcustomers', {
  ref: 'POFromCustomer',
  localField: '_id',
  foreignField: 'quotationNumber'
});

// Virtual populate for single PO from Customer instance
QuotationSchema.virtual('pofromcustomer', {
  ref: 'POFromCustomer',
  localField: '_id',
  foreignField: 'quotationNumber',
  justOne: true
});

// Ensure virtual fields are serialized
QuotationSchema.set('toJSON', { virtuals: true });
QuotationSchema.set('toObject', { virtuals: true });

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema); 