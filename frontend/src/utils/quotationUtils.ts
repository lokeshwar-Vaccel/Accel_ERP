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

export interface QuotationCustomer {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addressId?: string; // Add address ID field
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
  issueDate?: Date;
  validUntil?: Date;
  validityPeriod?: number;
  customer: QuotationCustomer;
  company?: QuotationCompany;
  items: QuotationItem[];
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
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
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  items: QuotationItem[];
}

// Validation Functions
export const validateQuotationData = (data: Partial<QuotationData>): ValidationResult => {
  const errors: ValidationError[] = [];

  // Customer validation
  if (!data.customer) {
    errors.push({ field: 'customer', message: 'Customer information is required' });
  } else {
    if (!data.customer.name?.trim()) {
      errors.push({ field: 'customer.name', message: 'Customer name is required' });
    }
    if (!data.customer.address?.trim()) {
      errors.push({ field: 'customer.address', message: 'Customer address is required' });
    }
    // if (data.customer.email && !isValidEmail(data.customer.email)) {
    //   errors.push({ field: 'customer.email', message: 'Invalid email format' });
    // }
    // if (data.customer.phone && !isValidPhone(data.customer.phone)) {
    //   errors.push({ field: 'customer.phone', message: 'Invalid phone number format' });
    // }
  }

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

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item is required' });
  } else {
    data.items.forEach((item, index) => {
      if (!item.product?.trim()) {
        errors.push({ field: `items[${index}].product`, message: 'Product is required' });
      }
      if (!item.description?.trim()) {
        errors.push({ field: `items[${index}].description`, message: 'Description is required' });
      }
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
      if (!item.uom?.trim()) {
        errors.push({ field: `items[${index}].uom`, message: 'Unit of measure is required' });
      }
    });
  }

  // Financial validation
  if (data.grandTotal !== undefined && data.grandTotal <= 0) {
    errors.push({ field: 'grandTotal', message: 'Grand total must be greater than 0' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Calculation Functions
export const calculateQuotationTotals = (items: QuotationItem[]): CalculationResult => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

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

  const grandTotalBeforeRound = subtotal - totalDiscount + totalTax;
  const grandTotal = grandTotalBeforeRound;
  const roundOff = grandTotal - grandTotalBeforeRound;

  return {
    subtotal: subtotal,
    totalDiscount: totalDiscount,
    totalTax: totalTax,
    grandTotal,
    roundOff,
    items: calculatedItems
  };
};

// Data Transformation Functions
export const transformQuotationData = (data: any): QuotationData => {
  const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
  const validityPeriod = data.validityPeriod || 30;
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + validityPeriod);

  // Calculate totals
  const calculationResult = calculateQuotationTotals(data.items || []);

  return {
    quotationNumber: data.quotationNumber,
    issueDate,
    validUntil,
    validityPeriod,
    customer: {
      name: data.customer?.name || '',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      address: data.customer?.address || '',
      addressId: data.customer?.addressId || '', // Include address ID
      pan: data.customer?.pan || ''
    },
    company: {
      name: data.company?.name || '',
      address: data.company?.address || '',
      phone: data.company?.phone || '',
      email: data.company?.email || '',
      pan: data.company?.pan || '',
      bankDetails: data.company?.bankDetails
    },
    items: calculationResult.items,
    subtotal: calculationResult.subtotal,
    totalDiscount: calculationResult.totalDiscount,
    totalTax: calculationResult.totalTax,
    grandTotal: calculationResult.grandTotal,
    roundOff: calculationResult.roundOff,
    notes: data.notes || '',
    terms: data.terms || ''
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
    'customer.name': 'Customer name is required',
    'customer.email': 'Please enter a valid email address',
    'customer.phone': 'Please enter a valid phone number',
    'customer.address': 'Customer address is required',
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
    customer: data.customer ? {
      _id: data.customer._id || undefined, // Preserve customer ID
      name: String(data.customer.name || '').trim(),
      email: String(data.customer.email || '').trim(),
      phone: String(data.customer.phone || '').trim(),
      address: String(data.customer.address || '').trim(), // Store actual address text
      addressId: data.customer.addressId || undefined, // Preserve address ID for reference
      pan: String(data.customer.pan || '').trim()
    } : undefined,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      product: String(item.product || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      hsnNumber: String(item.hsnNumber || '').trim(), // Added hsnNumber field
      partNo: String(item.partNo || '').trim(), // Added partNo field
      quantity: Number(item.quantity) || 0,
      uom: String(item.uom || 'pcs').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0
    })) : [],
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim()
  };
};

// Default Values
export const getDefaultQuotationData = (): Partial<QuotationData> => ({
  customer: {
    _id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    addressId: '', // Add address ID field
    pan: ''
  },
  company: {
    name: '',
    address: '',
    phone: '',
    email: '',
    pan: '',
  },
  issueDate: new Date(),
  validityPeriod: 30,
  items: [{
    product: '',
    description: '',
    hsnCode: '',
    hsnNumber: '',
    partNo: '',
    quantity: 1,
    uom: 'pcs',
    unitPrice: 0,
    discount: 0,
    discountedAmount: 0,
    taxRate: 18,
    taxAmount: 0,
    totalPrice: 0
  }],
  subtotal: 0,
  totalDiscount: 0,
  totalTax: 0,
  grandTotal: 0,
  roundOff: 0,
  notes: '',
  terms: ''
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