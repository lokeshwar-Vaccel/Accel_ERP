import Joi from 'joi';

// TypeScript interfaces for validation results
export interface POItemInput {
  product: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  totalPrice?: number;
  discount?: {
    type?: 'percentage' | 'fixed';
    value?: number;
  };
  tax?: {
    type?: 'percentage' | 'fixed';
    value?: number;
  };
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface CreatePurchaseOrderInput {
  supplier: string; // Can be ObjectId (from customers collection) or supplier name string
  supplierEmail?: string; // Optional, will be fetched from customer if supplier is ObjectId
  items: POItemInput[];
  expectedDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  deliveryLocation?: string;
  paymentTerms?: 'cod' | 'net_30' | 'net_60' | 'advance' | 'credit';
  shippingMethod?: 'standard' | 'express' | 'overnight' | 'pickup';
  // New fields for shipping and documentation
  shipDate?: string;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: string;
  documentNumber?: string;
  documentDate?: string;
  supplierContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  deliveryAddress?: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
    contactPerson?: string;
    phone?: string;
  };
  internalNotes?: string;
  supplierNotes?: string;
  attachment?: {
    filename?: string;
    url?: string;
    type?: 'quote' | 'specification' | 'drawing' | 'other';
  };
}

export interface UpdatePurchaseOrderInput {
  supplier?: string; // Can be ObjectId (from customers collection) or supplier name string
  supplierEmail?: string; // Optional, will be fetched from customer if supplier is ObjectId
  items: POItemInput[];
  expectedDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  deliveryLocation?: string;
  paymentTerms?: 'cod' | 'net_30' | 'net_60' | 'advance' | 'credit';
  shippingMethod?: 'standard' | 'express' | 'overnight' | 'pickup';
  // New fields for shipping and documentation
  shipDate?: string;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: string;
  documentNumber?: string;
  documentDate?: string;
  supplierContact?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  deliveryAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    contactPerson?: string;
    phone?: string;
  };
  internalNotes?: string;
  supplierNotes?: string;
}

export interface UpdatePOItemInput {
  items: POItemInput[];
}

export interface ApprovePOInput {
  approved: boolean;
  approvalNotes?: string;
  conditions?: string[];
}

export interface ReceivePOInput {
  location: string;
  receiptDate: string;
  inspectedBy: string;
  notes: string;
  receivedDate: string;
  receivedItems: {
    product: string;
    productId: string;
    orderedQuantity: number;
    receivedQuantity: number;
    quantityReceived: number;
    rejectedQuantity?: number;
    unitPrice?: number;
    condition?: 'good' | 'damaged' | 'defective';
    batchNumber?: string;
    batchNumbers?: string[];
    serialNumbers?: string[];
    expiryDate?: string;
    notes?: string;
  }[];
  deliveryNote?: string;
  invoice?: {
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceAmount?: number;
  };
  receivedBy?: string;
  qualityCheck?: {
    performed?: boolean;
    checkedBy?: string;
    checkDate?: string;
    result?: 'passed' | 'failed' | 'conditional';
    notes?: string;
  };
  discrepancies?: {
    type: 'quantity' | 'quality' | 'specification' | 'packaging' | 'other';
    description: string;
    severity?: 'minor' | 'major' | 'critical';
    action?: 'accept' | 'reject' | 'return' | 'rework';
  }[];
  images?: {
    url: string;
    description?: string;
    type?: 'delivery' | 'damage' | 'product' | 'packaging';
  }[];
}

export interface PurchaseOrderQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  supplier?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dateFrom?: string;
  dateTo?: string;
  deliveryDateFrom?: string;
  deliveryDateTo?: string;
  amountMin?: number;
  amountMax?: number;
  overdue?: boolean;
  pendingApproval?: boolean;
  deliveryLocation?: string;
}

export interface CancelPOInput {
  cancellationReason: 'supplier_unavailable' | 'price_change' | 'requirement_change' | 'budget_constraint' | 'duplicate_order' | 'other';
  notes: string;
  notifySupplier?: boolean;
  refundRequired?: boolean;
  refundAmount?: number;
}

export interface RevisePOInput {
  revisionReason: string;
  changes: {
    items?: POItemInput[];
    deliveryDate?: string;
    deliveryAddress?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    paymentTerms?: 'cod' | 'net_30' | 'net_60' | 'advance' | 'credit';
    shippingMethod?: 'standard' | 'express' | 'overnight' | 'pickup';
  };
  notifySupplier?: boolean;
  requiresApproval?: boolean;
}

export interface SupplierRatingInput {
  purchaseOrderId: string;
  ratings: {
    qualityRating: number;
    deliveryRating: number;
    serviceRating: number;
    priceRating: number;
    overallRating: number;
  };
  feedback?: string;
  wouldRecommend?: boolean;
  improvements?: string;
}

export interface PurchaseOrderReportInput {
  reportType: 'purchase_summary' | 'supplier_performance' | 'delivery_analysis' | 'cost_analysis' | 'overdue_orders';
  dateFrom: string;
  dateTo: string;
  supplier?: string;
  status?: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  deliveryLocation?: string;
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface PurchaseOrderImportInput {
  YEAR: string;
  month: string;
  DEPT: string;
  'ORDER NO': string;  // This will be the PO number
  'Part No': string;
  'Part Description': string;
  QTY: number;
  Price: number;
  'Ordered Qty': number;
  'HSN No'?: string;
  Tax?: string;
  'GST VALUE'?: number;
  TOTAL?: number;
  // Optional fields for processing
  supplier?: string;
  expectedDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  paymentTerms?: 'cod' | 'net_30' | 'net_60' | 'advance' | 'credit';
  notes?: string;
}

// Base purchase order fields
const basePOFields = {
  supplier: Joi.alternatives().try(
    Joi.string().hex().length(24), // ObjectId for supplier from customers collection
    Joi.string().max(200).trim()   // String for supplier name
  ),
  supplierEmail: Joi.string().email().max(200).trim(),
  totalAmount: Joi.number().min(0).precision(2),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled'),
  orderDate: Joi.date().iso(),
  expectedDeliveryDate: Joi.date().iso(),
  actualDeliveryDate: Joi.date().iso(),
  // New fields for shipping and documentation
  shipDate: Joi.date().iso(),
  docketNumber: Joi.string().max(100).trim(),
  noOfPackages: Joi.number().min(0).integer(),
  gstInvoiceNumber: Joi.string().max(100).trim(),
  invoiceDate: Joi.date().iso(),
  documentNumber: Joi.string().max(100).trim(),
  documentDate: Joi.date().iso(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
  deliveryLocation: Joi.string().hex().length(24), // Stock location ID
  paymentTerms: Joi.string().valid('cod', 'net_30', 'net_60', 'advance', 'credit'),
  shippingMethod: Joi.string().valid('standard', 'express', 'overnight', 'pickup')
};

// Purchase order item schema
const poItemSchema = Joi.object<POItemInput>({
  product: Joi.string().hex().length(24).required(),
  description: Joi.string().max(500), // Additional description if needed
  quantity: Joi.number().min(1).required(),
  unitPrice: Joi.number().min(0).precision(2).required(),
  totalPrice: Joi.number().min(0).precision(2),
  taxRate: Joi.number().min(0).precision(2).required(),
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0)
  }),
  tax: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0)
  }),
  expectedDeliveryDate: Joi.date().iso(),
  notes: Joi.string().max(500)
});

// Create purchase order schema
export const createPurchaseOrderSchema = Joi.object<CreatePurchaseOrderInput>({
  supplier: basePOFields.supplier.required(),
  supplierEmail: basePOFields.supplierEmail.optional(), // Optional since it can be fetched from customer
  items: Joi.array().items(poItemSchema).min(1).max(100).required(),
  expectedDeliveryDate: basePOFields.expectedDeliveryDate,
  priority: basePOFields.priority.default('medium'),
  deliveryLocation: basePOFields.deliveryLocation,
  paymentTerms: basePOFields.paymentTerms.default('net_30'),
  shippingMethod: basePOFields.shippingMethod.default('standard'),
  // New fields for shipping and documentation
  shipDate: basePOFields.shipDate,
  docketNumber: basePOFields.docketNumber,
  noOfPackages: basePOFields.noOfPackages,
  gstInvoiceNumber: basePOFields.gstInvoiceNumber,
  invoiceDate: basePOFields.invoiceDate,
  documentNumber: basePOFields.documentNumber,
  documentDate: basePOFields.documentDate,
  supplierContact: Joi.object({
    name: Joi.string().max(100),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
  }),
  deliveryAddress: Joi.object({
    street: Joi.string().max(200).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(100),
    zipCode: Joi.string().max(20),
    country: Joi.string().max(100).required(),
    contactPerson: Joi.string().max(100),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
  }),
  internalNotes: Joi.string().max(1000),
  supplierNotes: Joi.string().max(1000),
  attachment: Joi.object({
    filename: Joi.string().max(255),
    url: Joi.string().uri(),
    type: Joi.string().valid('quote', 'specification', 'drawing', 'other')
  })
});

// Update purchase order schema
export const updatePurchaseOrderSchema = Joi.object<UpdatePurchaseOrderInput>({
  supplier: basePOFields.supplier,
  supplierEmail: basePOFields.supplierEmail,
  items: Joi.array().items(poItemSchema).min(1).max(100).required(),
  expectedDeliveryDate: basePOFields.expectedDeliveryDate,
  priority: basePOFields.priority,
  status: basePOFields.status,
  deliveryLocation: basePOFields.deliveryLocation,
  paymentTerms: basePOFields.paymentTerms,
  shippingMethod: basePOFields.shippingMethod,
  // New fields for shipping and documentation
  shipDate: basePOFields.shipDate,
  docketNumber: basePOFields.docketNumber,
  noOfPackages: basePOFields.noOfPackages,
  gstInvoiceNumber: basePOFields.gstInvoiceNumber,
  invoiceDate: basePOFields.invoiceDate,
  documentNumber: basePOFields.documentNumber,
  documentDate: basePOFields.documentDate,
  supplierContact: Joi.object({
    name: Joi.string().max(100),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
  }),
  deliveryAddress: Joi.object({
    street: Joi.string().max(200),
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    zipCode: Joi.string().max(20),
    country: Joi.string().max(100),
    contactPerson: Joi.string().max(100),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/)
  }),
  internalNotes: Joi.string().max(1000),
  supplierNotes: Joi.string().max(1000)
});

// Add/Update purchase order item schema
export const updatePOItemSchema = Joi.object<UpdatePOItemInput>({
  items: Joi.array().items(poItemSchema).min(1).max(100).required()
});

// Purchase order approval schema
export const approvePOSchema = Joi.object<ApprovePOInput>({
  approved: Joi.boolean().required(),
  approvalNotes: Joi.string().max(1000),
  conditions: Joi.array().items(Joi.string().max(200)) // Approval conditions
});

// Purchase order delivery schema (for receiving goods)
export const receivePOSchema = Joi.object<ReceivePOInput>({
  location: Joi.string().required(), // Location where items are received
  receiptDate: Joi.alternatives().try(
    Joi.date().iso(),
    Joi.string().allow('').default(new Date().toISOString())
  ).default(new Date().toISOString()),
  inspectedBy: Joi.string().allow('').default('System'),
  notes: Joi.string().max(1000).allow(''),
  receivedDate: Joi.date().iso().default(() => new Date()),
  receivedItems: Joi.array().items(
    Joi.object({
      product: Joi.string().hex().length(24), // Original field name
      productId: Joi.string().hex().length(24), // Frontend field name
      orderedQuantity: Joi.number().min(1),
      receivedQuantity: Joi.number().min(0), // Original field name
      quantityReceived: Joi.number().min(0), // Frontend field name
      rejectedQuantity: Joi.number().min(0).default(0),
      unitPrice: Joi.number().min(0).precision(2),
      condition: Joi.string().valid('good', 'damaged', 'defective').default('good'),
      batchNumber: Joi.string().max(50).allow(''),
      batchNumbers: Joi.array().items(Joi.string().max(50)),
      serialNumbers: Joi.array().items(Joi.string().max(100)),
      expiryDate: Joi.date().iso(),
      notes: Joi.string().max(500).allow('')
    }).or('product', 'productId').or('receivedQuantity', 'quantityReceived')
  ).min(1).required(),
  deliveryNote: Joi.string().max(100).allow(''), // Delivery note number
  invoice: Joi.object({
    invoiceNumber: Joi.string().max(100),
    invoiceDate: Joi.date().iso(),
    invoiceAmount: Joi.number().min(0).precision(2)
  }),
  receivedBy: Joi.string().hex().length(24),
  qualityCheck: Joi.object({
    performed: Joi.boolean().default(false),
    checkedBy: Joi.string().hex().length(24),
    checkDate: Joi.date().iso(),
    result: Joi.string().valid('passed', 'failed', 'conditional'),
    notes: Joi.string().max(1000)
  }),
  discrepancies: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('quantity', 'quality', 'specification', 'packaging', 'other'),
      description: Joi.string().max(500).required(),
      severity: Joi.string().valid('minor', 'major', 'critical'),
      action: Joi.string().valid('accept', 'reject', 'return', 'rework')
    })
  ),
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri(),
      description: Joi.string().max(200),
      type: Joi.string().valid('delivery', 'damage', 'product', 'packaging')
    })
  ).max(20)
});

// Purchase order query schema
export const purchaseOrderQuerySchema = Joi.object<PurchaseOrderQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  status: basePOFields.status,
  supplier: Joi.string(),
  priority: basePOFields.priority,
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
  deliveryDateFrom: Joi.date().iso(),
  deliveryDateTo: Joi.date().iso().greater(Joi.ref('deliveryDateFrom')),
  amountMin: Joi.number().min(0),
  amountMax: Joi.number().min(Joi.ref('amountMin')),
  overdue: Joi.boolean(),
  pendingApproval: Joi.boolean(),
  deliveryLocation: basePOFields.deliveryLocation
});

// Purchase order cancellation schema
export const cancelPOSchema = Joi.object<CancelPOInput>({
  cancellationReason: Joi.string().valid(
    'supplier_unavailable',
    'price_change',
    'requirement_change',
    'budget_constraint',
    'duplicate_order',
    'other'
  ).required(),
  notes: Joi.string().max(1000).required(),
  notifySupplier: Joi.boolean().default(true),
  refundRequired: Joi.boolean().default(false),
  refundAmount: Joi.number().min(0).when('refundRequired', {
    is: true,
    then: Joi.required()
  })
});

// Purchase order revision schema
export const revisePOSchema = Joi.object<RevisePOInput>({
  revisionReason: Joi.string().max(500).required(),
  changes: Joi.object({
    items: Joi.array().items(poItemSchema),
    deliveryDate: basePOFields.expectedDeliveryDate,
    deliveryAddress: Joi.object({
      street: Joi.string().max(200),
      city: Joi.string().max(100),
      state: Joi.string().max(100),
      zipCode: Joi.string().max(20),
      country: Joi.string().max(100)
    }),
    paymentTerms: basePOFields.paymentTerms,
    shippingMethod: basePOFields.shippingMethod
  }).required(),
  notifySupplier: Joi.boolean().default(true),
  requiresApproval: Joi.boolean().default(false)
});

// Supplier performance rating schema
export const supplierRatingSchema = Joi.object<SupplierRatingInput>({
  purchaseOrderId: Joi.string().hex().length(24).required(),
  ratings: Joi.object({
    qualityRating: Joi.number().min(1).max(5).required(),
    deliveryRating: Joi.number().min(1).max(5).required(),
    serviceRating: Joi.number().min(1).max(5).required(),
    priceRating: Joi.number().min(1).max(5).required(),
    overallRating: Joi.number().min(1).max(5).required()
  }).required(),
  feedback: Joi.string().max(1000),
  wouldRecommend: Joi.boolean(),
  improvements: Joi.string().max(500)
});

// Purchase order report schema
export const purchaseOrderReportSchema = Joi.object<PurchaseOrderReportInput>({
  reportType: Joi.string().valid(
    'purchase_summary',
    'supplier_performance',
    'delivery_analysis',
    'cost_analysis',
    'overdue_orders'
  ).required(),
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).required(),
  supplier: Joi.string(),
  status: basePOFields.status,
  deliveryLocation: basePOFields.deliveryLocation,
  format: Joi.string().valid('json', 'csv', 'excel', 'pdf').default('json'),
  includeGraphs: Joi.boolean().default(false)
});

// Purchase order import schema (CSV/Excel) - matches Excel column headers exactly
export const purchaseOrderImportSchema = Joi.object<PurchaseOrderImportInput>({
  YEAR: Joi.string().required(),
  month: Joi.string().required(), 
  DEPT: Joi.string().required(),
  'ORDER NO': Joi.string().required(), // PO number
  'Part No': Joi.string().required(),
  'Part Description': Joi.string().required(),
  QTY: Joi.number().min(1).required(),
  Price: Joi.number().min(0).precision(2).required(),
  'Ordered Qty': Joi.number().min(1).required(),
  'HSN No': Joi.string().allow(''),
  Tax: Joi.string().allow(''),
  'GST VALUE': Joi.number().min(0).precision(2),
  TOTAL: Joi.number().min(0).precision(2),
  // Optional processing fields
  supplier: Joi.string().allow(''),
  expectedDeliveryDate: basePOFields.expectedDeliveryDate,
  priority: basePOFields.priority.default('medium'),
  paymentTerms: basePOFields.paymentTerms.default('net_30'),
  notes: Joi.string().max(500).allow('')
});

// Bulk purchase order import schema
export const bulkPurchaseOrderImportSchema = Joi.array().items(purchaseOrderImportSchema).min(1).max(1000); 