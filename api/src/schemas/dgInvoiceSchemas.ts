import Joi from 'joi';

// Schema for DG Invoice Item
export const dgInvoiceItemSchema = Joi.object({
  product: Joi.string().required().trim().messages({
    'string.empty': 'Product name is required',
    'any.required': 'Product name is required'
  }),
  description: Joi.string().required().trim().messages({
    'string.empty': 'Product description is required',
    'any.required': 'Product description is required'
  }),
  quantity: Joi.number().required().min(0).messages({
    'number.min': 'Quantity cannot be negative',
    'any.required': 'Quantity is required'
  }),
  unitPrice: Joi.number().required().min(0).messages({
    'number.min': 'Unit price cannot be negative',
    'any.required': 'Unit price is required'
  }),
  totalPrice: Joi.number().required().min(0).messages({
    'number.min': 'Total price cannot be negative',
    'any.required': 'Total price is required'
  }),
  uom: Joi.string().default('nos').trim(),
  discount: Joi.number().min(0).max(100).default(0).messages({
    'number.min': 'Discount cannot be negative',
    'number.max': 'Discount cannot exceed 100%'
  }),
  discountedAmount: Joi.number().min(0).default(0).messages({
    'number.min': 'Discounted amount cannot be negative'
  }),
  gstRate: Joi.number().min(0).max(100).default(18).messages({
    'number.min': 'GST rate cannot be negative',
    'number.max': 'GST rate cannot exceed 100%'
  }),
  gstAmount: Joi.number().min(0).default(0).messages({
    'number.min': 'GST amount cannot be negative'
  }),
  kva: Joi.string().required().trim().messages({
    'string.empty': 'KVA is required',
    'any.required': 'KVA is required'
  }),
  phase: Joi.string().required().trim().messages({
    'string.empty': 'Phase is required',
    'any.required': 'Phase is required'
  }),
  annexureRating: Joi.string().required().trim().messages({
    'string.empty': 'Annexure rating is required',
    'any.required': 'Annexure rating is required'
  }),
  dgModel: Joi.string().required().trim().messages({
    'string.empty': 'DG Model is required',
    'any.required': 'DG Model is required'
  }),
  numberOfCylinders: Joi.number().required().min(0).messages({
    'number.min': 'Number of cylinders cannot be negative',
    'any.required': 'Number of cylinders is required'
  }),
  subject: Joi.string().required().trim().messages({
    'string.empty': 'Subject is required',
    'any.required': 'Subject is required'
  }),
  isActive: Joi.boolean().default(true),
  hsnNumber: Joi.string().allow('').trim()
});

// Address schema
const addressSchema = Joi.object({
  address: Joi.string().required().trim().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  district: Joi.string().required().trim().messages({
    'string.empty': 'District is required',
    'any.required': 'District is required'
  }),
  state: Joi.string().required().trim().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required'
  }),
  pincode: Joi.string().required().trim().messages({
    'string.empty': 'Pincode is required',
    'any.required': 'Pincode is required'
  }),
  gstNumber: Joi.string().allow('').trim()
});

// Billing/Shipping address schema
const billingShippingAddressSchema = Joi.object({
  address: Joi.string().required().trim().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  district: Joi.string().required().trim().messages({
    'string.empty': 'District is required',
    'any.required': 'District is required'
  }),
  state: Joi.string().required().trim().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required'
  }),
  pincode: Joi.string().required().trim().messages({
    'string.empty': 'Pincode is required',
    'any.required': 'Pincode is required'
  }),
  gstNumber: Joi.string().allow('').trim()
});

// Additional charges schema
const additionalChargesSchema = Joi.object({
  freight: Joi.number().min(0).default(0).messages({
    'number.min': 'Freight cannot be negative'
  }),
  insurance: Joi.number().min(0).default(0).messages({
    'number.min': 'Insurance cannot be negative'
  }),
  packing: Joi.number().min(0).default(0).messages({
    'number.min': 'Packing cannot be negative'
  }),
  other: Joi.number().min(0).default(0).messages({
    'number.min': 'Other charges cannot be negative'
  })
});

// Transport charges schema
const transportChargesSchema = Joi.object({
  amount: Joi.number().min(0).default(0).messages({
    'number.min': 'Transport amount cannot be negative'
  }),
  quantity: Joi.number().min(0).default(0).messages({
    'number.min': 'Transport quantity cannot be negative'
  }),
  unitPrice: Joi.number().min(0).default(0).messages({
    'number.min': 'Transport unit price cannot be negative'
  }),
  hsnNumber: Joi.string().allow('').trim().default('998399'),
  gstRate: Joi.number().min(0).max(100).default(18).messages({
    'number.min': 'Transport GST rate cannot be negative',
    'number.max': 'Transport GST rate cannot exceed 100%'
  }),
  gstAmount: Joi.number().min(0).default(0).messages({
    'number.min': 'Transport GST amount cannot be negative'
  }),
  totalAmount: Joi.number().min(0).default(0).messages({
    'number.min': 'Transport total amount cannot be negative'
  })
});

// Schema for creating DG Invoice
export const createDGInvoiceSchema = Joi.object({
  customer: Joi.string().required().messages({
    'string.empty': 'Customer is required',
    'any.required': 'Customer is required'
  }),
  customerEmail: Joi.string().email().allow('').optional().trim(),
  customerAddress: addressSchema,
  billingAddress: billingShippingAddressSchema,
  shippingAddress: billingShippingAddressSchema,
  dgQuotationNumber: Joi.string().required().messages({
    'string.empty': 'DG Quotation is required',
    'any.required': 'DG Quotation is required'
  }),
  poNumber: Joi.string().allow('').trim(),
  poFromCustomer: Joi.string().allow(null),
  invoiceDate: Joi.date().required().messages({
    'date.base': 'Invoice date must be a valid date',
    'any.required': 'Invoice date is required'
  }),
  dueDate: Joi.date().required().messages({
    'date.base': 'Due date must be a valid date',
    'any.required': 'Due date is required'
  }),
  status: Joi.string().valid('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled').default('Draft'),
  paymentStatus: Joi.string().valid('Pending', 'Partial', 'Paid', 'Overdue').default('Pending'),
  paymentTerms: Joi.string().allow('').optional().trim(),
  notes: Joi.string().allow('').trim(),
  deliveryNotes: Joi.string().allow('').trim(),
  referenceNumber: Joi.string().allow('').trim(),
  referenceDate: Joi.date().allow(null, '').optional(),
  buyersOrderNumber: Joi.string().allow('').trim(),
  buyersOrderDate: Joi.date().allow(null, '').optional(),
  dispatchDocNo: Joi.string().allow('').trim(),
  dispatchDocDate: Joi.date().allow(null, '').optional(),
  destination: Joi.string().allow('').trim(),
  deliveryNoteDate: Joi.date().allow(null, '').optional(),
  dispatchedThrough: Joi.string().allow('').trim(),
  termsOfDelivery: Joi.string().allow('').trim(),
  items: Joi.array().items(dgInvoiceItemSchema).min(1).required().messages({
    'array.min': 'At least one item is required',
    'any.required': 'Items are required'
  }),
  additionalCharges: additionalChargesSchema,
  transportCharges: transportChargesSchema,
  taxRate: Joi.number().min(0).max(100).default(18).messages({
    'number.min': 'Tax rate cannot be negative',
    'number.max': 'Tax rate cannot exceed 100%'
  }),
  dgEnquiry: Joi.string().allow('').optional(),
  irn: Joi.string().allow('').optional().trim().messages({
    'string.empty': 'IRN cannot be empty if provided'
  }),
  ackNumber: Joi.string().allow('').optional().trim(),
  ackDate: Joi.date().allow(null, '').optional().messages({
    'date.base': 'ACK Date must be a valid date'
  }),
  qrCodeInvoice: Joi.string().allow('').optional().trim(),
  proformaReference: Joi.string().allow('').optional().trim()
});

// Schema for updating DG Invoice
export const updateDGInvoiceSchema = Joi.object({
  customer: Joi.string(),
  customerEmail: Joi.string().email().allow('').optional().trim(),
  customerAddress: addressSchema,
  billingAddress: billingShippingAddressSchema,
  shippingAddress: billingShippingAddressSchema,
  dgQuotationNumber: Joi.string(),
  poNumber: Joi.string().allow('').trim(),
  poFromCustomer: Joi.string().allow(null),
  invoiceDate: Joi.date().messages({
    'date.base': 'Invoice date must be a valid date'
  }),
  dueDate: Joi.date().messages({
    'date.base': 'Due date must be a valid date'
  }),
  status: Joi.string().valid('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'),
  paymentStatus: Joi.string().valid('Pending', 'Partial', 'Paid', 'Overdue'),
  paymentTerms: Joi.string().trim(),
  notes: Joi.string().allow('').trim(),
  deliveryNotes: Joi.string().allow('').trim(),
  referenceNumber: Joi.string().allow('').trim(),
  referenceDate: Joi.date().allow(null, '').optional(),
  buyersOrderNumber: Joi.string().allow('').trim(),
  buyersOrderDate: Joi.date().allow(null, '').optional(),
  dispatchDocNo: Joi.string().allow('').trim(),
  dispatchDocDate: Joi.date().allow(null, '').optional(),
  destination: Joi.string().allow('').trim(),
  deliveryNoteDate: Joi.date().allow(null, '').optional(),
  dispatchedThrough: Joi.string().allow('').trim(),
  termsOfDelivery: Joi.string().allow('').trim(),
  items: Joi.array().items(dgInvoiceItemSchema).min(1).messages({
    'array.min': 'At least one item is required'
  }),
  additionalCharges: additionalChargesSchema,
  transportCharges: transportChargesSchema,
  taxRate: Joi.number().min(0).max(100).messages({
    'number.min': 'Tax rate cannot be negative',
    'number.max': 'Tax rate cannot exceed 100%'
  }),
  dgEnquiry: Joi.string().allow('').optional(),
  irn: Joi.string().allow('').optional().trim().messages({
    'string.empty': 'IRN cannot be empty if provided'
  }),
  ackNumber: Joi.string().allow('').optional().trim(),
  ackDate: Joi.date().allow(null, '').optional().messages({
    'date.base': 'ACK Date must be a valid date'
  }),
  qrCodeInvoice: Joi.string().allow('').optional().trim(),
  proformaReference: Joi.string().allow('').optional().trim()
});

// Schema for query parameters
export const getDGInvoicesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow(''),
  status: Joi.string().valid('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled').allow(''),
  paymentStatus: Joi.string().valid('Pending', 'Partial', 'Paid', 'Overdue').allow(''),
  customer: Joi.string().allow(''),
  startDate: Joi.string().allow(''),
  endDate: Joi.string().allow('')
});

// Schema for export query parameters
export const exportDGInvoicesQuerySchema = Joi.object({
  search: Joi.string().allow(''),
  status: Joi.string().valid('Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled').allow(''),
  paymentStatus: Joi.string().valid('Pending', 'Partial', 'Paid', 'Overdue').allow(''),
  startDate: Joi.string().allow(''),
  endDate: Joi.string().allow('')
});
