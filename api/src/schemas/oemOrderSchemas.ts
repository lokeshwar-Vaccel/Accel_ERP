import Joi from 'joi';

export interface OEMOrderItemInput {
  product: string; // DGProduct ID
  quantity: number;
  unitPrice: number;
  discountRate?: number;
  discountAmount?: number;
  taxRate?: number;
  specifications?: string;
  serialNumbers?: string[];
}

export interface CreateOEMOrderInput {
  oem: string; // OEM ID
  customer: string; // Customer ID
  orderDate?: string;
  expectedDeliveryDate?: string;
  items: OEMOrderItemInput[];
  deliveryAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactPerson: string;
    phone: string;
  };
  paymentTerms: string;
  deliveryTerms: string;
  warrantyTerms: string;
  notes?: string;
  // Payment fields
  paidAmount?: number;
  paymentMethod?: string;
  paymentMethodDetails?: {
    bankName?: string;
    accountNumber?: string;
    transactionId?: string;
    chequeNumber?: string;
    chequeDate?: string;
    upiId?: string;
    walletName?: string;
    cardLastFour?: string;
    cardType?: string;
    referenceNumber?: string;
  };
  paymentDate?: string;
}

export interface UpdateOEMOrderInput {
  oem?: string;
  customer?: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  items?: OEMOrderItemInput[];
  deliveryAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    contactPerson: string;
    phone: string;
  };
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
  status?: 'draft' | 'sent' | 'confirmed' | 'in_production' | 'ready_to_ship' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  // Payment fields
  paidAmount?: number;
  paymentMethod?: string;
  paymentMethodDetails?: {
    bankName?: string;
    accountNumber?: string;
    transactionId?: string;
    chequeNumber?: string;
    chequeDate?: string;
    upiId?: string;
    walletName?: string;
    cardLastFour?: string;
    cardType?: string;
    referenceNumber?: string;
  };
  paymentDate?: string;
}

export interface OEMOrderQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: string;
  oem?: string;
  customer?: string;
  dateFrom?: string;
  dateTo?: string;
}

// Base OEM order fields
const baseOEMOrderFields = {
  oem: Joi.string().hex().length(24).required(), // OEM ObjectId
  customer: Joi.string().hex().length(24).required(), // Customer ObjectId
  orderDate: Joi.date().iso(),
  expectedDeliveryDate: Joi.date().iso(),
  totalAmount: Joi.number().min(0).precision(2),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'),
};

// OEM order item schema
const oemOrderItemSchema = Joi.object({
  product: Joi.string().hex().length(24).required(), // DGProduct ObjectId
  quantity: Joi.number().positive().required(),
  unitPrice: Joi.number().positive().required(),
  discountRate: Joi.number().min(0).max(100).default(0),
  discountAmount: Joi.number().min(0).default(0),
  taxRate: Joi.number().min(0).max(100).default(0),
  specifications: Joi.string().max(1000).allow(''),
  serialNumbers: Joi.array().items(Joi.string().trim()).default([])
});

// Delivery address schema
const deliveryAddressSchema = Joi.object({
  address: Joi.string().max(500).required().trim(),
  city: Joi.string().max(100).required().trim(),
  state: Joi.string().max(100).required().trim(),
  pincode: Joi.string().max(20).required().trim(),
  contactPerson: Joi.string().max(100).required().trim(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required().trim()
});

// Payment method details schema
const paymentMethodDetailsSchema = Joi.object({
  bankName: Joi.string().max(100).trim(),
  accountNumber: Joi.string().max(50).trim(),
  transactionId: Joi.string().max(100).trim(),
  chequeNumber: Joi.string().max(50).trim(),
  chequeDate: Joi.date().iso(),
  upiId: Joi.string().max(100).trim(),
  walletName: Joi.string().max(100).trim(),
  cardLastFour: Joi.string().max(4).trim(),
  cardType: Joi.string().max(50).trim(),
  referenceNumber: Joi.string().max(100).trim()
});

// Create OEM order schema
export const createOEMOrderSchema = Joi.object<CreateOEMOrderInput>({
  oem: baseOEMOrderFields.oem,
  customer: baseOEMOrderFields.customer,
  orderDate: baseOEMOrderFields.orderDate.default(() => new Date().toISOString()),
  expectedDeliveryDate: baseOEMOrderFields.expectedDeliveryDate,
  items: Joi.array().items(oemOrderItemSchema).min(1).max(100).required(),
  deliveryAddress: deliveryAddressSchema.required(),
  paymentTerms: Joi.string().max(500).required().trim(),
  deliveryTerms: Joi.string().max(500).required().trim(),
  warrantyTerms: Joi.string().max(500).required().trim(),
  notes: Joi.string().max(1000).allow(''),
  // Payment fields
  paidAmount: Joi.number().min(0).precision(2).default(0),
  paymentMethod: Joi.string().max(100).trim(),
  paymentMethodDetails: paymentMethodDetailsSchema,
  paymentDate: Joi.date().iso()
});

// Update OEM order schema
export const updateOEMOrderSchema = Joi.object<UpdateOEMOrderInput>({
  oem: baseOEMOrderFields.oem.optional(),
  customer: baseOEMOrderFields.customer.optional(),
  orderDate: baseOEMOrderFields.orderDate,
  expectedDeliveryDate: baseOEMOrderFields.expectedDeliveryDate,
  items: Joi.array().items(oemOrderItemSchema).min(1).max(100),
  deliveryAddress: deliveryAddressSchema,
  paymentTerms: Joi.string().max(500).trim(),
  deliveryTerms: Joi.string().max(500).trim(),
  warrantyTerms: Joi.string().max(500).trim(),
  status: baseOEMOrderFields.status,
  notes: Joi.string().max(1000).allow(''),
  // Payment fields
  paidAmount: Joi.number().min(0).precision(2),
  paymentMethod: Joi.string().max(100).trim(),
  paymentMethodDetails: paymentMethodDetailsSchema,
  paymentDate: Joi.date().iso()
});

// OEM order query schema
export const oemOrderQuerySchema = Joi.object<OEMOrderQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().max(200).trim(),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled'),
  oem: Joi.string().hex().length(24),
  customer: Joi.string().hex().length(24),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso()
});

// Status update schema
export const updateOEMOrderStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'delivered', 'cancelled').required()
});

// Payment update schema
export const updateOEMOrderPaymentSchema = Joi.object({
  paidAmount: Joi.number().min(0).precision(2).required(),
  paymentMethod: Joi.string().max(100).trim().required(),
  paymentMethodDetails: paymentMethodDetailsSchema.required(),
  paymentDate: Joi.date().iso().default(() => new Date().toISOString())
});
