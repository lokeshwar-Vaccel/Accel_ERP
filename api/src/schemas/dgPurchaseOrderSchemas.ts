import Joi from 'joi';

// Base item schema for DG Purchase Order items
const baseDGPOItemSchema = Joi.object({
  product: Joi.string().required().trim(),
  description: Joi.string().required().trim(),
  quantity: Joi.number().positive().required(),
  unitPrice: Joi.number().positive().required(),
  taxRate: Joi.number().min(0).max(100).default(0),
  totalPrice: Joi.number().positive().required(),
  receivedQuantity: Joi.number().min(0).default(0),
  notes: Joi.string().optional().trim().allow('')
});

// Create DG Purchase Order Schema
export const createDGPurchaseOrderSchema = Joi.object({
  poNumber: Joi.string().required().trim(),
  dgQuotation: Joi.string().optional().trim().allow(''),
  customer: Joi.object({
    _id: Joi.string().optional(),
    name: Joi.string().required().trim(),
    email: Joi.string().email().optional().allow(''),
    phone: Joi.string().optional().allow(''),
    pan: Joi.string().optional().allow(''),
    corporateName: Joi.string().optional().allow(''),
    address: Joi.string().optional().allow(''),
    pinCode: Joi.string().optional().allow(''),
    tehsil: Joi.string().optional().allow(''),
    district: Joi.string().optional().allow('')
  }).required(),
  supplier: Joi.string().required().trim(),
  supplierEmail: Joi.string().email().optional().allow(''),
  supplierAddress: Joi.object({
    address: Joi.string().optional().trim().allow(''),
    state: Joi.string().optional().trim().allow(''),
    district: Joi.string().optional().trim().allow(''),
    pincode: Joi.string().optional().trim().allow('')
  }).optional(),
  items: Joi.array().items(baseDGPOItemSchema).min(1).required(),
  totalAmount: Joi.number().positive().required(),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received').default('draft'),
  orderDate: Joi.date().required(),
  expectedDeliveryDate: Joi.date().optional(),
  actualDeliveryDate: Joi.date().optional(),
  shipDate: Joi.date().optional(),
  docketNumber: Joi.string().optional().trim().allow(''),
  noOfPackages: Joi.number().min(0).optional(),
  gstInvoiceNumber: Joi.string().optional().trim().allow(''),
  invoiceDate: Joi.date().optional(),
  documentNumber: Joi.string().optional().trim().allow(''),
  documentDate: Joi.date().optional(),
  notes: Joi.string().optional().trim().allow(''),
  terms: Joi.string().optional().trim().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium')
}).messages({
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} cannot be empty',
  'number.positive': '{{#label}} must be positive',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'number.max': '{{#label}} must be at most {{#limit}}',
  'array.min': 'At least one item is required',
});

// Update DG Purchase Order Schema (all fields optional)
export const updateDGPurchaseOrderSchema = Joi.object({
  poNumber: Joi.string().optional().trim(),
  dgQuotation: Joi.string().optional().trim().allow(''),
  customer: Joi.object({
    _id: Joi.string().optional(),
    name: Joi.string().optional().trim(),
    email: Joi.string().email().optional().allow(''),
    phone: Joi.string().optional().allow(''),
    pan: Joi.string().optional().allow(''),
    corporateName: Joi.string().optional().allow(''),
    address: Joi.string().optional().allow(''),
    pinCode: Joi.string().optional().allow(''),
    tehsil: Joi.string().optional().allow(''),
    district: Joi.string().optional().allow('')
  }).optional(),
  supplier: Joi.string().optional().trim(),
  supplierEmail: Joi.string().email().optional().allow(''),
  supplierAddress: Joi.object({
    address: Joi.string().optional().trim().allow(''),
    state: Joi.string().optional().trim().allow(''),
    district: Joi.string().optional().trim().allow(''),
    pincode: Joi.string().optional().trim().allow('')
  }).optional(),
  items: Joi.array().items(baseDGPOItemSchema).optional(),
  totalAmount: Joi.number().positive().optional(),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received').optional(),
  orderDate: Joi.date().optional(),
  expectedDeliveryDate: Joi.date().optional(),
  actualDeliveryDate: Joi.date().optional(),
  shipDate: Joi.date().optional(),
  docketNumber: Joi.string().optional().trim().allow(''),
  noOfPackages: Joi.number().min(0).optional(),
  gstInvoiceNumber: Joi.string().optional().trim().allow(''),
  invoiceDate: Joi.date().optional(),
  documentNumber: Joi.string().optional().trim().allow(''),
  documentDate: Joi.date().optional(),
  notes: Joi.string().optional().trim().allow(''),
  terms: Joi.string().optional().trim().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional()
}).min(1).messages({
  'any.required': '{{#label}} is required',
  'string.empty': '{{#label}} cannot be empty',
  'number.positive': '{{#label}} must be positive',
  'number.min': '{{#label}} must be at least {{#limit}}',
  'number.max': '{{#label}} must be at most {{#limit}}',
  'object.min': 'At least one field must be provided for update'
});

// Query parameters schema for getting DG Purchase Orders
export const getDGPurchaseOrdersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().trim().allow(''),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received').optional(),
  supplier: Joi.string().optional().trim().allow(''),
  customerId: Joi.string().optional().trim().allow(''),
  dgQuotation: Joi.string().optional().trim().allow(''),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  sortBy: Joi.string().valid('poNumber', 'orderDate', 'totalAmount', 'status', 'createdAt').default('orderDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Receive items schema
export const receiveDGPOSchema = Joi.object({
  receivedItems: Joi.array().items(Joi.object({
    productId: Joi.string().required(),
    quantityReceived: Joi.number().positive().required(),
    condition: Joi.string().valid('good', 'damaged', 'defective').default('good'),
    batchNumber: Joi.string().optional().trim().allow(''),
    notes: Joi.string().optional().trim().allow('')
  })).min(1).required(),
  location: Joi.string().required(),
  receiptDate: Joi.date().required(),
  inspectedBy: Joi.string().required(),
  notes: Joi.string().optional().trim().allow(''),
  supplierName: Joi.string().optional().trim().allow(''),
  supplierEmail: Joi.string().email().optional().allow(''),
  supplierAddress: Joi.object({
    address: Joi.string().optional().trim().allow(''),
    state: Joi.string().optional().trim().allow(''),
    district: Joi.string().optional().trim().allow(''),
    pincode: Joi.string().optional().trim().allow('')
  }).optional(),
  externalInvoiceTotal: Joi.number().positive().optional(),
  shipDate: Joi.date().optional(),
  docketNumber: Joi.string().optional().trim().allow(''),
  noOfPackages: Joi.number().min(0).optional(),
  gstInvoiceNumber: Joi.string().optional().trim().allow(''),
  invoiceDate: Joi.date().optional(),
  documentNumber: Joi.string().optional().trim().allow(''),
  documentDate: Joi.date().optional()
});

// Status update schema
export const updateDGPurchaseOrderStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled', 'partially_received').required(),
  notes: Joi.string().optional().trim().allow('')
}); 