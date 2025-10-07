import Joi from 'joi';

// DG PO from customer item validation schema
export const dgPoFromCustomerItemSchema = Joi.object({
  product: Joi.string().required().trim().messages({
    'string.empty': 'Product is required',
    'any.required': 'Product is required'
  }),
  description: Joi.string().required().trim().messages({
    'string.empty': 'Description is required',
    'any.required': 'Description is required'
  }),
  quantity: Joi.number().required().min(0).messages({
    'number.min': 'Quantity must be greater than or equal to 0',
    'any.required': 'Quantity is required'
  }),
  unitPrice: Joi.number().required().min(0).messages({
    'number.min': 'Unit price must be greater than or equal to 0',
    'any.required': 'Unit price is required'
  }),
  totalPrice: Joi.number().required().min(0).messages({
    'number.min': 'Total price must be greater than or equal to 0',
    'any.required': 'Total price is required'
  }),
  uom: Joi.string().optional().trim().default('nos'),
  discount: Joi.number().optional().min(0).default(0),
  discountedAmount: Joi.number().optional().min(0).default(0),
  // DG Product specific fields
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
    'number.min': 'Number of cylinders must be greater than or equal to 0',
    'any.required': 'Number of cylinders is required'
  }),
  subject: Joi.string().required().trim().messages({
    'string.empty': 'Subject is required',
    'any.required': 'Subject is required'
  }),
  isActive: Joi.boolean().required().default(true),
  hsnNumber: Joi.string().optional().trim()
});

// Address validation schema
export const addressSchema = Joi.object({
  id: Joi.number().required().messages({
    'number.base': 'Address ID must be a number',
    'any.required': 'Address ID is required'
  })
});

// Create DG PO from customer validation schema
export const createDGPoFromCustomerSchema = Joi.object({
  poNumber: Joi.string().optional().trim().messages({
    'string.empty': 'PO number cannot be empty'
  }),
  customer: Joi.string().required().messages({
    'string.empty': 'Customer is required',
    'any.required': 'Customer is required'
  }),
  customerEmail: Joi.string().optional().email().trim().lowercase().messages({
    'string.email': 'Please provide a valid email address'
  }),
  billToAddress: addressSchema.required().messages({
    'any.required': 'Bill to address is required'
  }),
  shipToAddress: addressSchema.required().messages({
    'any.required': 'Ship to address is required'
  }),
  dgQuotationNumber: Joi.string().optional().messages({
    'string.empty': 'DG quotation number cannot be empty'
  }),
  items: Joi.array().items(dgPoFromCustomerItemSchema).required().min(1).messages({
    'array.min': 'At least one item is required',
    'any.required': 'Items are required'
  }),
  subtotal: Joi.number().optional().min(0).default(0),
  totalDiscount: Joi.number().optional().min(0).default(0),
  taxRate: Joi.number().optional().min(0).max(100).default(18),
  taxAmount: Joi.number().optional().min(0).default(0),
  totalAmount: Joi.number().optional().min(0).default(0),
  status: Joi.string().optional().valid('draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled').default('draft'),
  orderDate: Joi.date().optional().default(Date.now),
  expectedDeliveryDate: Joi.date().optional(),
  actualDeliveryDate: Joi.date().optional(),
  department: Joi.string().optional().valid('retail', 'corporate', 'industrial_marine', 'others').default('retail'),
  notes: Joi.string().optional().trim(),
  transport: Joi.string().optional().trim(),
  unloading: Joi.string().optional().trim(),
  scopeOfWork: Joi.string().optional().trim(),
  // Payment fields
  paidAmount: Joi.number().optional().min(0).default(0),
  remainingAmount: Joi.number().optional().min(0).default(0),
  paymentStatus: Joi.string().optional().valid('pending', 'partial', 'paid', 'gst_pending').default('pending'),
  paymentMethod: Joi.string().optional().trim(),
  paymentDate: Joi.date().optional(),
  // Priority and approval
  priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent').default('medium'),
  // PDF upload
  poPdf: Joi.string().optional().trim(),
  // DG specific fields
  dgEnquiry: Joi.string().optional().messages({
    'string.empty': 'DG enquiry cannot be empty'
  })
});

// Update DG PO from customer validation schema
export const updateDGPoFromCustomerSchema = Joi.object({
  poNumber: Joi.string().optional().trim().messages({
    'string.empty': 'PO number cannot be empty'
  }),
  customer: Joi.string().optional().messages({
    'string.empty': 'Customer cannot be empty'
  }),
  customerEmail: Joi.string().optional().email().trim().lowercase().messages({
    'string.email': 'Please provide a valid email address'
  }),
  billToAddress: addressSchema.optional(),
  shipToAddress: addressSchema.optional(),
  dgQuotationNumber: Joi.string().optional().messages({
    'string.empty': 'DG quotation number cannot be empty'
  }),
  items: Joi.array().items(dgPoFromCustomerItemSchema).optional().min(1).messages({
    'array.min': 'At least one item is required'
  }),
  subtotal: Joi.number().optional().min(0),
  totalDiscount: Joi.number().optional().min(0),
  taxRate: Joi.number().optional().min(0).max(100),
  taxAmount: Joi.number().optional().min(0),
  totalAmount: Joi.number().optional().min(0),
  status: Joi.string().optional().valid('draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'),
  orderDate: Joi.date().optional(),
  expectedDeliveryDate: Joi.date().optional(),
  actualDeliveryDate: Joi.date().optional(),
  department: Joi.string().optional().valid('retail', 'corporate', 'industrial_marine', 'others'),
  notes: Joi.string().optional().trim(),
  transport: Joi.string().optional().trim().messages({
    'string.empty': 'Transport cannot be empty'
  }),
  unloading: Joi.string().optional().trim().messages({
    'string.empty': 'Unloading cannot be empty'
  }),
  scopeOfWork: Joi.string().optional().trim().messages({
    'string.empty': 'Scope of work cannot be empty'
  }),
  // Payment fields
  paidAmount: Joi.number().optional().min(0),
  remainingAmount: Joi.number().optional().min(0),
  paymentStatus: Joi.string().optional().valid('pending', 'partial', 'paid', 'gst_pending'),
  paymentMethod: Joi.string().optional().trim(),
  paymentDate: Joi.date().optional(),
  // Priority and approval
  priority: Joi.string().optional().valid('low', 'medium', 'high', 'urgent'),
  // PDF upload
  poPdf: Joi.string().optional().trim(),
  // DG specific fields
  dgEnquiry: Joi.string().optional().messages({
    'string.empty': 'DG enquiry cannot be empty'
  })
});

// Update status validation schema
export const updateDGPoFromCustomerStatusSchema = Joi.object({
  status: Joi.string().required().valid('draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled').messages({
    'any.required': 'Status is required',
    'any.only': 'Status must be one of: draft, sent_to_customer, customer_approved, in_production, ready_for_delivery, delivered, cancelled'
  }),
  notes: Joi.string().optional().trim()
});

// Query parameters validation schema
export const getDGPoFromCustomersQuerySchema = Joi.object({
  page: Joi.number().optional().min(1).default(1),
  limit: Joi.number().optional().min(1).max(100).default(10),
  sort: Joi.string().optional().default('-createdAt'),
  search: Joi.string().optional().trim(),
  status: Joi.string().optional().valid('draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'),
  customer: Joi.string().optional(),
  department: Joi.string().optional().valid('retail', 'corporate', 'industrial_marine', 'others'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional()
});

// Export query parameters validation schema
export const exportDGPoFromCustomersQuerySchema = Joi.object({
  search: Joi.string().optional().trim(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  status: Joi.string().optional().valid('draft', 'sent_to_customer', 'customer_approved', 'in_production', 'ready_for_delivery', 'delivered', 'cancelled'),
  customer: Joi.string().optional(),
  department: Joi.string().optional().valid('retail', 'corporate', 'industrial_marine', 'others')
});
