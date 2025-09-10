// Comprehensive Quotation Utilities
// Handles validation, calculations, and data transformation

export interface QuotationItem {
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
}

// New interface for service charges
export interface ServiceCharge {
  description: string;
  hsnNumber?: string; // Add HSN field for service charges
  quantity: number;
  unitPrice: number;
  discount: number;
  discountedAmount: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  uom?: string; // Add UOM field
}

// New interface for battery buy back
export interface BatteryBuyBack {
  description: string;
  hsnNumber?: string; // Add HSN field for battery buy back
  quantity: number;
  unitPrice: number;
  discount: number;
  discountedAmount: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  uom?: string; // Add UOM field
}

export interface QuotationCustomer {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  pan?: string;
}

export interface QuotationCompany {
  name: string;
  address: string;
  phone: string;
  email: string;
  pan?: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
}

export interface QuotationData {
  quotationNumber?: string;
  subject?: string; // Subject/Sub field for quotation
  issueDate?: Date;
  validUntil?: Date;
  validityPeriod?: number;
  customer: QuotationCustomer;
  customerAddress?: {
    address: string;
    state?: string;
    district?: string;
    pincode?: string;
    addressId?: number;
  };
  company?: QuotationCompany;
  location?: string;
  // Service Ticket related fields
  engineSerialNumber?: string; // Engine Serial Number from ServiceTicket
  kva?: string; // KVA rating from ServiceTicket
  hourMeterReading?: string; // Hour Meter Reading from ServiceTicket
  serviceRequestDate?: Date; // Service Request Date from ServiceTicket
  items: QuotationItem[];
  // New fields for service charges and battery buy back
  serviceCharges: ServiceCharge[];
  batteryBuyBack: BatteryBuyBack;
  subtotal: number;
  totalDiscount: number;
  overallDiscount?: number; // Overall discount percentage
  overallDiscountAmount?: number; // Calculated overall discount amount
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  qrCodeImage?: File | string; // QR code image file or base64 string
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
  assignedEngineer?: string; // Add assigned engineer field
  // Payment fields
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentDate?: Date;
  // Additional fields for display
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  dgEnquiry?: string;
  // Quotation reference fields for invoices created from quotations
  sourceQuotation?: string;
  quotationPaymentDetails?: {
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: string;
  };
  // PO From Customer fields
  poFromCustomer?: {
    _id: string;
    poNumber: string;
    status: string;
    totalAmount: number;
    orderDate: string;
    expectedDeliveryDate: string;
    pdfFile?: string; // PDF file URL or base64
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface CalculationResult {
  subtotal: number;
  totalDiscount: number;
  overallDiscount: number; // Overall discount percentage
  overallDiscountAmount: number; // Calculated overall discount amount
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  items: QuotationItem[];
  serviceCharges: ServiceCharge[];
  batteryBuyBack: BatteryBuyBack | null;
}

// Validation Functions
export const validateQuotationData = (data: Partial<QuotationData>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Customer validation
  if (!data.customer) {
    errors.push({ field: 'customer', message: 'Customer information is required' });
  } else {
    if (!data.customer.name || (typeof data.customer.name === 'string' && !data.customer.name.trim())) {
      errors.push({ field: 'customer.name', message: 'Customer name is required' });
    }
  }

  // Subject validation
  // if (!data.subject || (typeof data.subject === 'string' && !data.subject.trim())) {
  //   errors.push({ field: 'subject', message: 'Subject is required' });
  // }

  // Location validation
  if (!data.location || (typeof data.location === 'string' && !data.location.trim())) {
    errors.push({ field: 'location', message: 'From location is required' });
  }

  // Validate billToAddress
  if (!data.billToAddress || !data.billToAddress.address || (typeof data.billToAddress.address === 'string' && !data.billToAddress.address.trim())) {
    errors.push({ field: 'billToAddress.address', message: 'Bill to address is required' });
  }

  // Validate shipToAddress
  if (!data.shipToAddress || !data.shipToAddress.address || (typeof data.shipToAddress.address === 'string' && !data.shipToAddress.address.trim())) {
    errors.push({ field: 'shipToAddress.address', message: 'Ship to address is required' });
  }

  // Validate assigned engineer (optional)
  // No validation needed - field is optional

  // Company validation
  // if (!data.company) {
  //   errors.push({ field: 'company', message: 'Company information is required' });
  // } else {
  //   if (!data.company.name?.trim()) {
  //     errors.push({ field: 'company.name', message: 'Company name is required' });
  //   }
  //   if (!data.company.address?.trim()) {
  //     errors.push({ field: 'company.address', message: 'Company address is required' });
  //   }
    // if (!data.company.phone?.trim()) {
    //   errors.push({ field: 'company.phone', message: 'Company phone is required' });
    // }
    // if (!data.company.email?.trim()) {
    //   errors.push({ field: 'company.email', message: 'Company email is required' });
    // } else if (!isValidEmail(data.company.email)) {
    //   errors.push({ field: 'company.email', message: 'Invalid company email format' });
    // }
  // }

  // Items validation - Made optional to allow quotations without items
  // if (!data.items || data.items.length === 0) {
  //   errors.push({ field: 'items', message: 'At least one item is required' });
  // } else {
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, index) => {
      if (!item.product || (typeof item.product === 'string' && !item.product.trim())) {
        errors.push({ field: `items[${index}].product`, message: 'Product is required' });
      }
      // if (!item.description?.trim()) {
      //   errors.push({ field: `items[${index}].description`, message: 'Description is required' });
      // }
      if (!isValidNumber(item.quantity) || item.quantity <= 0) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
      }
      if (!isValidNumber(item.unitPrice) || item.unitPrice < 0) {
        errors.push({ field: `items[${index}].unitPrice`, message: 'Unit price must be non-negative' });
      }
      if (!isValidNumber(item.discount) || item.discount < 0 || item.discount > 100) {
        errors.push({ field: `items[${index}].discount`, message: 'Discount must be between 0 and 100%' });
      }
      if (!isValidNumber(item.taxRate) || item.taxRate < 0 || item.taxRate > 100) {
        errors.push({ field: `items[${index}].taxRate`, message: 'Tax rate must be between 0 and 100%' });
      }
      if (!item.uom || (typeof item.uom === 'string' && !item.uom.trim())) {
        errors.push({ field: `items[${index}].uom`, message: 'Unit of measure is required' });
      }
    });
  }

  // Financial validation - Allow 0 total for quotations without items
  // if (data.grandTotal !== undefined && data.grandTotal <= 0) {
  //   errors.push({ field: 'grandTotal', message: 'Grand total must be greater than 0' });
  // }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculation Functions
export const calculateQuotationTotals = (
  items: QuotationItem[], 
  serviceCharges: ServiceCharge[] = [], 
  batteryBuyBack: BatteryBuyBack | null = null,
  overallDiscount: number = 0
): CalculationResult => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  // Calculate main items
  const calculatedItems = items.map(item => {
    // Ensure all values are numbers
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountRate = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    // Calculate item totals
    const itemSubtotal = quantity * unitPrice;
    const discountAmount = (discountRate / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = (taxRate / 100) * discountedAmount;
    const totalPrice = discountedAmount + taxAmount;

    // Accumulate totals
    subtotal += itemSubtotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;

    return {
      ...item,
      discountedAmount: discountAmount,
      taxAmount: taxAmount,
      totalPrice: totalPrice
    };
  });

  // Calculate service charges
  const calculatedServiceCharges = serviceCharges.map(service => {
    const quantity = Number(service.quantity) || 0;
    const unitPrice = Number(service.unitPrice) || 0;
    const discountRate = Number(service.discount) || 0;
    const taxRate = Number(service.taxRate) || 0;

    const itemSubtotal = quantity * unitPrice;
    const discountAmount = (discountRate / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = (taxRate / 100) * discountedAmount;
    const totalPrice = discountedAmount + taxAmount;

    // Accumulate totals
    subtotal += itemSubtotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;

    return {
      ...service,
      discountedAmount: discountAmount,
      taxAmount: taxAmount,
      totalPrice: totalPrice
    };
  });

  // Calculate battery buy back (deduction from total)
  let calculatedBatteryBuyBack = null;
  if (batteryBuyBack) {
    const quantity = Number(batteryBuyBack.quantity) || 0;
    const unitPrice = Number(batteryBuyBack.unitPrice) || 0;
    const discountRate = Number(batteryBuyBack.discount) || 0;
    const taxRate = 0; // No GST for battery buy back

    const itemSubtotal = quantity * unitPrice;
    const discountAmount = (discountRate / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = 0; // No GST for battery buy back
    const totalPrice = discountedAmount; // No GST added

    // For battery buy back, we DON'T add to subtotal since it's a deduction
    // Instead, we'll subtract it from the final grand total
    // We still need to track the discount for the battery buy back itself
    // But these don't affect the main calculation

    calculatedBatteryBuyBack = {
      ...batteryBuyBack,
      discountedAmount: discountAmount,
      taxAmount: 0, // No GST for battery buy back
      totalPrice: totalPrice
    };
  }

  // Calculate grand total before overall discount and battery buy back
  const grandTotalBeforeOverallDiscount = subtotal - totalDiscount + totalTax;
  
  // Calculate overall discount amount as percentage of grand total
  const overallDiscountAmount = (overallDiscount / 100) * grandTotalBeforeOverallDiscount;
  
  // Apply overall discount to grand total
  let grandTotal = grandTotalBeforeOverallDiscount - overallDiscountAmount;
  
  // Subtract battery buy back amount from grand total (it's a deduction)
  if (calculatedBatteryBuyBack) {
    grandTotal -= calculatedBatteryBuyBack.totalPrice;
  }
  const roundOff = 0; // No rounding for now

  return {
    subtotal: subtotal,
    totalDiscount: totalDiscount,
    overallDiscount: overallDiscount, // Keep the percentage
    overallDiscountAmount: overallDiscountAmount, // Add the calculated amount
    totalTax: totalTax,
    grandTotal,
    roundOff,
    items: calculatedItems,
    serviceCharges: calculatedServiceCharges,
    batteryBuyBack: calculatedBatteryBuyBack
  };
};

// Data Transformation Functions
export const transformQuotationData = (data: any): QuotationData => {
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const validityPeriod = data.validityPeriod || 30;
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + validityPeriod);

  // Calculate totals
  const calculationResult = calculateQuotationTotals(
    data.items || [], 
    data.serviceCharges || [], 
    data.batteryBuyBack || null,
    data.overallDiscount || 0
  );

  return {
    quotationNumber: data.quotationNumber,
    subject: data.subject || '',
    issueDate,
    validUntil,
    validityPeriod,
    customer: {
      name: data.customer?.name || '',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      pan: data.customer?.pan || ''
    },
    customerAddress: data.customerAddress,
    company: {
      name: data.company?.name || '',
      address: data.company?.address || '',
      phone: data.company?.phone || '',
      email: data.company?.email || '',
      pan: data.company?.pan || '',
      bankDetails: data.company?.bankDetails
    },
    // Service Ticket related fields
    engineSerialNumber: data.engineSerialNumber || '',
    kva: data.kva || '',
    hourMeterReading: data.hourMeterReading || '',
    serviceRequestDate: data.serviceRequestDate ? new Date(data.serviceRequestDate) : undefined,
    items: calculationResult.items,
    // New fields for service charges and battery buy back
    serviceCharges: data.serviceCharges || [],
    batteryBuyBack: data.batteryBuyBack || {
      description: 'Battery Buy Back',
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      discountedAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalPrice: 0
    },
    subtotal: calculationResult.subtotal,
    totalDiscount: calculationResult.totalDiscount,
    overallDiscount: calculationResult.overallDiscount,
    overallDiscountAmount: calculationResult.overallDiscountAmount,
    totalTax: calculationResult.totalTax,
    grandTotal: calculationResult.grandTotal,
    roundOff: calculationResult.roundOff,
    notes: data.notes || '',
    terms: data.terms || '',
    billToAddress: data.billToAddress,
    shipToAddress: data.shipToAddress,
    assignedEngineer: data.assignedEngineer || ''
  };
};

// Validation Helper Functions
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// export const roundTo2Decimals = (value: number): number => {
//   return Math.round(value * 100) / 100;
// };

// Error Message Functions
export const getFieldErrorMessage = (field: string): string => {
  const errorMessages: Record<string, string> = {
    // 'subject': 'Subject is required',
    'customer.name': 'Customer name is required',
    'customer.email': 'Please enter a valid email address',
    'customer.phone': 'Please enter a valid phone number',
    'billToAddress.address': 'Bill to address is required',
    'shipToAddress.address': 'Ship to address is required',
    'assignedEngineer': 'Please select a valid engineer',
    // 'customerAddress.state': 'Customer state is required',
    // 'customerAddress.district': 'Customer district is required',
    // 'customerAddress.pincode': 'Customer pincode is required',
    // 'company.name': 'Company name is required',
    // 'company.email': 'Please enter a valid company email',
    // 'company.phone': 'Company phone is required',
    // 'company.address': 'Company address is required',
    'items': 'At least one item is required',
    'items[].product': 'Product selection is required',
    'items[].description': 'Item description is required',
    'items[].quantity': 'Quantity must be greater than 0',
    'items[].unitPrice': 'Unit price must be non-negative',
    'items[].discount': 'Discount must be between 0 and 100%',
    'items[].taxRate': 'Tax rate must be between 0 and 100%',
    'items[].uom': 'Unit of measure is required'
  };
  return errorMessages[field] || 'This field is invalid';
};

// Sanitization Functions
export const sanitizeQuotationData = (data: any): any => {
  return {
    ...data,
    subject: String(data.subject || '').trim(),
    customer: data.customer ? {
      _id: data.customer._id || undefined, // Preserve customer ID
      name: String(data.customer.name || '').trim(),
      email: String(data.customer.email || '').trim(),
      phone: String(data.customer.phone || '').trim(),
      pan: String(data.customer.pan || '').trim()
    } : undefined,
    customerAddress: data.customerAddress,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    // Service Ticket related fields
    engineSerialNumber: String(data.engineSerialNumber || '').trim(),
    kva: String(data.kva || '').trim(),
    hourMeterReading: String(data.hourMeterReading || '').trim(),
    serviceRequestDate: data.serviceRequestDate ? new Date(data.serviceRequestDate) : undefined,
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      product: String(item.product || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      hsnNumber: String(item.hsnNumber || '').trim(), // Added hsnNumber field
      partNo: String(item.partNo || '').trim(), // Added partNo field
      quantity: Number(item.quantity) || 0,
      uom: String(item.uom || 'nos').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0
    })) : [],
    // New fields for service charges and battery buy back
    serviceCharges: Array.isArray(data.serviceCharges) ? data.serviceCharges.map((service: any) => ({
      description: String(service.description || '').trim(),
      hsnNumber: String(service.hsnNumber || '').trim(), // Add HSN field for service charges
      quantity: Number(service.quantity) || 1,
      unitPrice: Number(service.unitPrice) || 0,
      discount: Number(service.discount) || 0,
      taxRate: Number(service.taxRate) || 18
    })) : [],
    batteryBuyBack: data.batteryBuyBack ? {
      description: String(data.batteryBuyBack.description || 'Battery Buy Back').trim(),
      hsnNumber: String(data.batteryBuyBack.hsnNumber || '').trim(), // Add HSN field for battery buy back
      quantity: Number(data.batteryBuyBack.quantity) || 0,
      unitPrice: Number(data.batteryBuyBack.unitPrice) || 0,
      discount: Number(data.batteryBuyBack.discount) || 0,
      taxRate: 0
    } : undefined,
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim(),
    qrCodeImage: data.qrCodeImage,
    billToAddress: data.billToAddress,
    shipToAddress: data.shipToAddress,
    assignedEngineer: String(data.assignedEngineer || '').trim(),
    // Preserve quotation reference fields for invoices created from quotations
    sourceQuotation: data.sourceQuotation,
    quotationNumber: data.quotationNumber,
    quotationPaymentDetails: data.quotationPaymentDetails,
    // Preserve PO From Customer data
    poFromCustomer: data.poFromCustomer
  };
};

// Default Values
export const getDefaultQuotationData = (): Partial<QuotationData> => ({
  subject: '', // Default subject
  customer: {
    _id: '',
    name: '',
    email: '',
    phone: '',
    pan: ''
  },
  customerAddress: {
    address: '',
    state: '',
    district: '',
    pincode: ''
  },
  company: {
    name: '',
    address: '',
    phone: '',
    email: '',
    pan: '',
  },
  // Service Ticket related fields
  engineSerialNumber: '',
  kva: '',
  hourMeterReading: '',
  serviceRequestDate: undefined,
  issueDate: new Date(),
  validityPeriod: 30,
  validUntil: (() => {
    const date = new Date();
    // Ensure we're working with local time to avoid timezone issues
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    localDate.setDate(localDate.getDate() + 30);
    return localDate;
  })(),
  items: [], // Start with empty items array to allow quotations without items
  // New fields for service charges and battery buy back
  serviceCharges: [], // Start with empty service charges array - users can add if needed
  batteryBuyBack: {
    description: 'Battery Buy Back',
    hsnNumber: '', // Add HSN field for battery buy back
    quantity: 0,
    unitPrice: 0,
    discount: 0,
    discountedAmount: 0,
    taxRate: 18, // Default GST rate
    taxAmount: 0,
    totalPrice: 0,
    uom: 'nos'
  },
  subtotal: 0,
  totalDiscount: 0,
  overallDiscount: 0,
  overallDiscountAmount: 0,
  totalTax: 0,
  grandTotal: 0,
  roundOff: 0,
      notes: '',
    terms: '',
    qrCodeImage: undefined,
        billToAddress: {
      address: '',
      state: '',
      district: '',
      pincode: '',
      gstNumber: ''
    },
    shipToAddress: {
      address: '',
      state: '',
      district: '',
      pincode: '',
      gstNumber: ''
    },
  assignedEngineer: '',
  // Payment fields
  paidAmount: 0,
  remainingAmount: 0,
  paymentStatus: 'pending' as const,
  paymentMethod: undefined,
  paymentDate: undefined
});

// Export all functions
export default {
  validateQuotationData,
  calculateQuotationTotals,
  transformQuotationData,
  isValidEmail,
  isValidPhone,
  isValidNumber,
//   roundTo2Decimals,
  getFieldErrorMessage,
  sanitizeQuotationData,
  getDefaultQuotationData
}; 