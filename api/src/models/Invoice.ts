import mongoose, { Schema } from 'mongoose';

// Invoice Item Interface
export interface IInvoiceItem {
  product: mongoose.Types.ObjectId;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate?: number;
  taxAmount?: number;
  uom?: string;
  discount?: number;
  discountedAmount?: number;
  hsnNumber?: string;
  partNo?: string;
}

// Invoice Interface
export interface IInvoice extends mongoose.Document {
  invoiceNumber: string;
  // New fields from quotation
  subject?: string; // Subject/Sub field for invoice
  engineSerialNumber?: string; // Engine Serial Number from ServiceTicket
  kva?: string; // KVA rating from ServiceTicket
  hourMeterReading?: string; // Hour Meter Reading from ServiceTicket
  serviceRequestDate?: Date; // Service Request Date from ServiceTicket
  qrCodeImage?: string; // QR code image URL or base64 string
  // Service charges and battery buy back
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
  batteryBuyBack?: {
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
  user: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  issueDate: Date;
  dueDate: Date;
  items: IInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  overallDiscount?: number; // Overall discount percentage
  overallDiscountAmount?: number; // Calculated overall discount amount
  totalAmount: number;
  paidAmount: number; // Amount paid so far
  remainingAmount: number; // Calculated: totalAmount - paidAmount
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
  notes?: string;
  terms?: string;
  invoiceType: 'sale' | 'purchase' | 'challan' | 'quotation' | 'proforma';
  referenceId?: string; // Service ticket, AMC contract, etc.
  dgSalesEnquiry?: mongoose.Types.ObjectId; // Link to DG Sales Enquiry
  sourceQuotation?: mongoose.Types.ObjectId; // Reference to the quotation this invoice was created from
  quotationNumber?: string; // Quotation number for display purposes
  quotationPaymentDetails?: {
    paidAmount: number; // Amount already paid in quotation
    remainingAmount: number; // Remaining amount from quotation
    paymentStatus: string; // Payment status from quotation
  };
  sourceProforma?: mongoose.Types.ObjectId; // Reference to the proforma this invoice was created from
  proformaNumber?: string; // Proforma number for display purposes
  proformaPaymentDetails?: {
    paidAmount: number; // Amount already paid in proforma
    remainingAmount: number; // Remaining amount from proforma
    paymentStatus: string; // Payment status from proforma
  };
  poFromCustomer?: mongoose.Types.ObjectId; // Reference to PO From Customer
  poPdf?: string; // PO PDF file URL or base64
  location: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  poNumber: string;
  supplier: mongoose.Types.ObjectId;
  supplierEmail: string;
  externalInvoiceNumber?: string; // External/hardcopy invoice number
  externalInvoiceTotal?: number;  // External/hardcopy invoice total
  // Bank details and PAN
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  bankBranch?: string;
  // Company information with bank details
  company?: {
    name?: string;
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
  // Customer address details
  customerAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  billToAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  shipToAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  supplierAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  assignedEngineer?: mongoose.Types.ObjectId; // Reference to User with Field Engineer role
  referenceNo?: string;
  referenceDate?: Date;
  // Additional invoice fields for tax invoice compliance
  irn?: string; // Invoice Reference Number
  ackNumber?: string; // Acknowledgement Number
  ackDate?: Date; // Acknowledgement Date
  deliveryNote?: string; // Delivery Note
  buyersOrderNumber?: string; // Buyer's Order Number
  buyersOrderDate?: Date; // Buyer's Order Date
  dispatchDocNo?: string; // Dispatch Document Number
  dispatchDocDate?: Date; // Dispatch Document Date
  dispatchedThrough?: string; // Dispatched through
  termsOfPayment?: string; // Terms of Payment
  otherReferences?: string; // Other References
  deliveryNoteDate?: Date; // Delivery Note Date
  destination?: string; // Destination
  termsOfDelivery?: string; // Terms of Delivery
}

// Invoice Item Schema
const invoiceItemSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  uom: {
    type: String,
    enum: ['kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos', 'eu'],
    default: 'nos'
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  hsnNumber: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  partNo: {
    type: String,
    required: false,
    trim: true,
    default: ''
  }
});

// Invoice Schema
const invoiceSchema = new Schema<IInvoice>({
  invoiceNumber: {
    type: String,
    // required: true,
    unique: true,
    trim: true
  },
  // New fields from quotation
  subject: { 
    type: String, 
    default: '' 
  },
  engineSerialNumber: { 
    type: String 
  },
  kva: { 
    type: String 
  },
  hourMeterReading: { 
    type: String 
  },
  serviceRequestDate: { 
    type: Date 
  },
  qrCodeImage: { 
    type: String 
  },
  // Service charges and battery buy back
  serviceCharges: {
    type: [
      {
        description: { type: String, required: true },
        hsnNumber: { type: String, required: false }, // Add HSN field for service charges
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        discountedAmount: { type: Number, default: 0 },
        taxRate: { type: Number, required: true },
        taxAmount: { type: Number, default: 0 },
        totalPrice: { type: Number, default: 0 },
      },
    ],
    default: []
  },
  batteryBuyBack: {
    type: {
      description: { type: String, required: true },
      hsnNumber: { type: String, required: false }, // Add HSN field for battery buy back
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      discountedAmount: { type: Number, default: 0 },
      taxRate: { type: Number, required: true },
      taxAmount: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    },
    required: false
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default:null
    // required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default:null
    // required: true
  },
  issueDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  items: [invoiceItemSchema],
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  discountAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  overallDiscount: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  overallDiscountAmount: {
    type: Number,
    required: false,
    min: 0,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  paidAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  remainingAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'gst_pending'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  terms: {
    type: String,
    trim: true,
    default: ''
  },
  invoiceType: {
    type: String,
    enum: ['sale', 'quotation', 'purchase', 'challan', 'proforma'],
    required: true
  },
  referenceId: {
    type: String,
    trim: true
  },
  dgSalesEnquiry: {
    type: Schema.Types.ObjectId,
    ref: 'DGSalesEnquiry',
    required: false
  },
  sourceQuotation: {
    type: Schema.Types.ObjectId,
    ref: 'Quotation',
    required: false
  },
  quotationNumber: {
    type: String,
    trim: true,
    required: false
  },
  quotationPaymentDetails: {
    paidAmount: {
      type: Number,
      required: false,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: false,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'failed'],
      required: false
    }
  },
  sourceProforma: {
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
    required: false
  },
  proformaNumber: {
    type: String,
    trim: true,
    required: false
  },
  proformaPaymentDetails: {
    paidAmount: {
      type: Number,
      required: false,
      min: 0
    },
    remainingAmount: {
      type: Number,
      required: false,
      min: 0
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'failed'],
      required: false
    }
  },
  // PO From Customer reference
  poFromCustomer: {
    type: Schema.Types.ObjectId,
    ref: 'POFromCustomer',
    required: false
  },
  poNumber: {
    type: String,
    trim: true,
    required: false
  },
  poPdf: {
    type: String,
    required: false
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    // required: true
  },
  externalInvoiceNumber: {
    type: String,
    required: false,
    trim: true
  },
  supplier: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  supplierEmail: {
    type: String,
    trim: true
  },
  externalInvoiceTotal: {
    type: Number,
    required: false,
    min: 0
  },
  // Bank details and PAN
  pan: {
    type: String,
    trim: true
  },
  bankName: {
    type: String,
    trim: true
  },
  bankAccountNo: {
    type: String,
    trim: true
  },
  bankIFSC: {
    type: String,
    trim: true
  },
  bankBranch: {
    type: String,
    trim: true
  },
  // Company information with bank details
  company: {
    name: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    pan: {
      type: String,
      trim: true
    },
    bankDetails: {
      bankName: {
        type: String,
        trim: true
      },
      accountNo: {
        type: String,
        trim: true
      },
      ifsc: {
        type: String,
        trim: true
      },
      branch: {
        type: String,
        trim: true
      }
    }
  },
  // Customer address details
  customerAddress: {
    id: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      maxlength: [100, 'State cannot exceed 100 characters'],
      trim: true
    },
    district: {
      type: String,
      maxlength: [100, 'District cannot exceed 100 characters'],
      trim: true
    },
    pincode: {
      type: String,
      match: [/^\d{6}$/, 'Pincode must be 6 digits'],
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    gstNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'GST number cannot exceed 50 characters']
    }
  },
  billToAddress: {
    id: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      maxlength: [100, 'State cannot exceed 100 characters'],
      trim: true
    },
    district: {
      type: String,
      maxlength: [100, 'District cannot exceed 100 characters'],
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    gstNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'GST number cannot exceed 50 characters']
    }
  },
  shipToAddress: {
    id: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      maxlength: [100, 'District cannot exceed 100 characters'],
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    gstNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'GST number cannot exceed 50 characters']
    }
  },
  supplierAddress: {
    id: {
      type: Number,
      required: false
    },
    address: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      maxlength: [100, 'State cannot exceed 100 characters'],
      trim: true
    },
    district: {
      type: String,
      maxlength: [100, 'District cannot exceed 100 characters'],
      trim: true
    },
    pincode: {
      type: String,
      trim: true
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    gstNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'GST number cannot exceed 50 characters']
    }
  },
  referenceNo: {
    type: String,
    trim: true
  },
  referenceDate: {
    type: Date,
    required: false
  },
  // Additional invoice fields for tax invoice compliance
  irn: {
    type: String,
    trim: true,
    required: false
  },
  ackNumber: {
    type: String,
    trim: true,
    required: false
  },
  ackDate: {
    type: Date,
    required: false
  },
  deliveryNote: {
    type: String,
    trim: true,
    required: false
  },
  buyersOrderNumber: {
    type: String,
    trim: true,
    required: false
  },
  buyersOrderDate: {
    type: Date,
    required: false
  },
  dispatchDocNo: {
    type: String,
    trim: true,
    required: false
  },
  dispatchDocDate: {
    type: Date,
    required: false
  },
  dispatchedThrough: {
    type: String,
    trim: true,
    required: false
  },
  termsOfPayment: {
    type: String,
    trim: true,
    required: false
  },
  otherReferences: {
    type: String,
    trim: true,
    required: false
  },
  deliveryNoteDate: {
    type: Date,
    required: false
  },
  destination: {
    type: String,
    trim: true,
    required: false
  },
  termsOfDelivery: {
    type: String,
    trim: true,
    required: false
  },
  assignedEngineer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function (this: IInvoice, next) {
  // Skip recalculation for purchase invoices created from POs
  if ((this as any)._skipAmountRecalculation) {
    console.log("Skipping amount recalculation for PO-created invoice");
    // Remove the flag after use
    delete (this as any)._skipAmountRecalculation;
    return next();
  }

  const round2 = (n: number): number => Number(n.toFixed(2));

  // 1. Recalculate subtotal and taxAmount from items
  this.subtotal = round2(this.items.reduce((sum, item) => sum + round2(item.totalPrice), 0));
  this.taxAmount = round2(this.items.reduce((sum, item) => sum + round2(item.taxAmount || 0), 0));

  // 2. Calculate service charges totals (same as QuotationSchema)
  if (this.serviceCharges && this.serviceCharges.length > 0) {
    this.serviceCharges.forEach((service: any) => {
      const itemSubtotal = service.quantity * service.unitPrice;
      const discountAmount = (service.discount / 100) * itemSubtotal;
      const discountedAmount = itemSubtotal - discountAmount;
      const taxAmount = (service.taxRate / 100) * discountedAmount;
      const totalPrice = discountedAmount + taxAmount;
      
      service.discountedAmount = round2(discountAmount);
      service.taxAmount = round2(taxAmount);
      service.totalPrice = round2(totalPrice);
    });
  }

  // 3. Calculate battery buy back totals (same as QuotationSchema)
  if (this.batteryBuyBack && this.batteryBuyBack.description) {
    const itemSubtotal = this.batteryBuyBack.quantity * this.batteryBuyBack.unitPrice;
    const discountAmount = (this.batteryBuyBack.discount / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = (this.batteryBuyBack.taxRate / 100) * discountedAmount;
    const totalPrice = discountedAmount + taxAmount;
    
    this.batteryBuyBack.discountedAmount = round2(discountAmount);
    this.batteryBuyBack.taxAmount = round2(taxAmount);
    this.batteryBuyBack.totalPrice = round2(totalPrice);
    
    console.log('Pre-save middleware - Battery Buy Back Calculation:', {
      quantity: this.batteryBuyBack.quantity,
      unitPrice: this.batteryBuyBack.unitPrice,
      itemSubtotal: itemSubtotal.toFixed(2),
      discount: this.batteryBuyBack.discount,
      discountAmount: discountAmount.toFixed(2),
      discountedAmount: discountedAmount.toFixed(2),
      taxRate: this.batteryBuyBack.taxRate,
      taxAmount: taxAmount.toFixed(2),
      totalPrice: totalPrice.toFixed(2)
    });
  } else {
    console.log('Pre-save middleware - No battery buyback data found');
  }

  // 4. Calculate grand total BEFORE overall discount (same as QuotationSchema)
  let grandTotal = this.subtotal + this.taxAmount - (this.discountAmount || 0);

  // Add service charges to grand total
  if (this.serviceCharges && this.serviceCharges.length > 0) {
    this.serviceCharges.forEach((service: any) => {
      grandTotal += service.totalPrice;
    });
  }

  // 5. Calculate overall discount amount if not set (same as QuotationSchema)
  if (this.overallDiscountAmount === undefined || this.overallDiscountAmount === null) {
    this.overallDiscountAmount = round2((this.overallDiscount || 0) / 100 * grandTotal);
  }

  // 6. Apply overall discount to grand total (same as QuotationSchema)
  if (this.overallDiscountAmount && this.overallDiscountAmount > 0) {
    grandTotal -= this.overallDiscountAmount;
  }

  // 7. FINALLY, subtract battery buyback from grand total (same as QuotationSchema)
  if (this.batteryBuyBack && this.batteryBuyBack.totalPrice) {
    grandTotal -= this.batteryBuyBack.totalPrice; // ✅ SUBTRACTS battery buyback (deduction)
  }

  // 8. Set the final total amount
  this.totalAmount = round2(grandTotal);

  console.log('Pre-save middleware - Final Calculation (matching QuotationSchema):', {
    itemsSubtotal: this.subtotal.toFixed(2),
    itemsTax: this.taxAmount.toFixed(2),
    discountAmount: (this.discountAmount || 0).toFixed(2),
    grandTotalBeforeOverallDiscount: (this.subtotal + this.taxAmount - (this.discountAmount || 0)).toFixed(2),
    serviceChargesTotal: this.serviceCharges?.reduce((sum, service) => sum + service.totalPrice, 0).toFixed(2) || '0.00',
    grandTotalAfterServiceCharges: (this.subtotal + this.taxAmount - (this.discountAmount || 0) + (this.serviceCharges?.reduce((sum, service) => sum + service.totalPrice, 0) || 0)).toFixed(2),
    overallDiscountAmount: (this.overallDiscountAmount || 0).toFixed(2),
    grandTotalAfterOverallDiscount: (this.subtotal + this.taxAmount - (this.discountAmount || 0) + (this.serviceCharges?.reduce((sum, service) => sum + service.totalPrice, 0) || 0) - (this.overallDiscountAmount || 0)).toFixed(2),
    batteryBuyBackTotal: (this.batteryBuyBack?.totalPrice || 0).toFixed(2),
    finalTotalAmount: this.totalAmount.toFixed(2)
  });

  // 9. Ensure paidAmount doesn't exceed total
  if (this.paidAmount > this.totalAmount) {
    this.paidAmount = this.totalAmount;
  }

  // 10. Remaining amount = total - paid (same as QuotationSchema)
  this.remainingAmount = round2(Math.max(0, this.totalAmount - this.paidAmount));

  // 11. Auto-update payment status (same as QuotationSchema)
  if (this.totalAmount === 0) {
    this.paymentStatus = 'paid';
    this.paidAmount = 0;
    this.remainingAmount = 0;
  } else if (this.paidAmount === 0) {
    this.paymentStatus = 'pending';
  } else if (this.paidAmount >= this.totalAmount) {
    this.paymentStatus = 'paid';
    this.remainingAmount = 0;
  } else {
    this.paymentStatus = 'partial';
  }

  next();
});

// Post-save hook to log invoice data for debugging
invoiceSchema.post('save', function (this: IInvoice) {
  console.log("Invoice saved successfully:", {
    invoiceNumber: this.invoiceNumber,
    poNumber: this.poNumber,
    invoiceType: this.invoiceType,
    subtotal: this.subtotal,
    taxAmount: this.taxAmount,
    discountAmount: this.discountAmount,
    totalAmount: this.totalAmount,
    paidAmount: this.paidAmount,
    remainingAmount: this.remainingAmount,
    paymentStatus: this.paymentStatus
  });
});

// Index for efficient queries
invoiceSchema.index({ customer: 1, issueDate: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema); 