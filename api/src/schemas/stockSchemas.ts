import Joi from 'joi';
import { StockTransactionType } from '../types';

// Base stock location fields
const baseStockLocationFields = {
  name: Joi.string().min(2).max(100).trim(),
  address: Joi.string().max(500).trim(),
  type: Joi.string().valid('main_office', 'warehouse', 'service_center'),
  contactPerson: Joi.string().max(100).trim().allow(''),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  isActive: Joi.boolean(),
  capacity: Joi.number().min(0), // Storage capacity
  description: Joi.string().max(500).allow('')
};

// Create stock location schema
export const createStockLocationSchema = Joi.object({
  name: baseStockLocationFields.name.required(),
  address: baseStockLocationFields.address.required(),
  type: baseStockLocationFields.type.required(),
  contactPerson: baseStockLocationFields.contactPerson,
  phone: baseStockLocationFields.phone,
  isActive: baseStockLocationFields.isActive.default(true),
  capacity: baseStockLocationFields.capacity,
  description: baseStockLocationFields.description
});

// Update stock location schema
export const updateStockLocationSchema = Joi.object({
  name: baseStockLocationFields.name,
  address: baseStockLocationFields.address,
  type: baseStockLocationFields.type,
  contactPerson: baseStockLocationFields.contactPerson,
  phone: baseStockLocationFields.phone,
  isActive: baseStockLocationFields.isActive,
  capacity: baseStockLocationFields.capacity,
  description: baseStockLocationFields.description
});

// Stock adjustment schema
export const stockAdjustmentSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  location: Joi.string().hex().length(24).required(),
  adjustmentType: Joi.string().valid('add', 'subtract', 'set').required(),
  quantity: Joi.number().min(0).required(),
  reason: Joi.string().valid(
    'damaged',
    'expired',
    'stolen',
    'found',
    'correction',
    'return',
    'other'
  ).required(),
  notes: Joi.string().max(500).allow(''),
  batchNumber: Joi.string().max(50),
  serialNumbers: Joi.array().items(Joi.string().max(100))
});

// Stock transfer schema
export const stockTransferSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  fromLocation: Joi.string().hex().length(24).required(),
  toLocation: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(1).required(),
  transferReason: Joi.string().valid(
    'restock',
    'customer_request',
    'maintenance',
    'redistribution',
    'other'
  ),
  notes: Joi.string().max(500).allow(''),
  expectedDate: Joi.date().iso().greater('now'),
  serialNumbers: Joi.array().items(Joi.string().max(100))
});

// Bulk stock transfer schema
export const bulkStockTransferSchema = Joi.object({
  fromLocation: Joi.string().hex().length(24).required(),
  toLocation: Joi.string().hex().length(24).required(),
  items: Joi.array().items(
    Joi.object({
      product: Joi.string().hex().length(24).required(),
      quantity: Joi.number().min(1).required(),
      serialNumbers: Joi.array().items(Joi.string().max(100))
    })
  ).min(1).max(100).required(),
  transferReason: Joi.string().max(200),
  notes: Joi.string().max(500).allow(''),
  expectedDate: Joi.date().iso().greater('now')
});

// Stock reservation schema
export const stockReservationSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  location: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(1).required(),
  reservationType: Joi.string().valid('service', 'sale', 'transfer', 'other').required(),
  referenceId: Joi.string().max(100), // Service ticket ID, sale ID, etc.
  reservedUntil: Joi.date().iso().greater('now'),
  notes: Joi.string().max(500).allow('')
});

// Stock reconciliation schema
export const stockReconciliationSchema = Joi.object({
  location: Joi.string().hex().length(24).required(),
  reconciliationDate: Joi.date().iso().required(),
  items: Joi.array().items(
    Joi.object({
      product: Joi.string().hex().length(24).required(),
      systemQuantity: Joi.number().min(0).required(),
      physicalQuantity: Joi.number().min(0).required(),
      discrepancy: Joi.number().required(),
      reason: Joi.string().max(200),
      action: Joi.string().valid('adjust', 'investigate', 'ignore')
    })
  ).min(1).required(),
  performedBy: Joi.string().hex().length(24),
  notes: Joi.string().max(1000).allow('')
});

// Stock query schema
export const stockQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-lastUpdated'),
  product: Joi.string().hex().length(24),
  location: Joi.string().hex().length(24),
  category: Joi.string(),
  lowStock: Joi.boolean(),
  outOfStock: Joi.boolean(),
  search: Joi.string().allow('')
});

// Stock transaction schema
export const stockTransactionSchema = Joi.object({
  type: Joi.string().valid(...Object.values(StockTransactionType)).required(),
  product: Joi.string().hex().length(24).required(),
  fromLocation: Joi.string().hex().length(24),
  toLocation: Joi.string().hex().length(24),
  quantity: Joi.number().min(1).required(),
  reference: Joi.string().max(100),
  referenceType: Joi.string().valid('purchase_order', 'service_ticket', 'adjustment', 'transfer', 'sale'),
  notes: Joi.string().max(500).allow(''),
  unitCost: Joi.number().min(0),
  totalCost: Joi.number().min(0)
});

// Stock valuation schema
export const stockValuationSchema = Joi.object({
  location: Joi.string().hex().length(24),
  category: Joi.string(),
  valuationMethod: Joi.string().valid('fifo', 'lifo', 'average', 'current').default('average'),
  asOfDate: Joi.date().iso().default(() => new Date())
});

// Stock movement report schema
export const stockMovementReportSchema = Joi.object({
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).required(),
  product: Joi.string().hex().length(24),
  location: Joi.string().hex().length(24),
  movementType: Joi.string().valid(...Object.values(StockTransactionType)),
  format: Joi.string().valid('json', 'csv', 'excel').default('json')
});

// Low stock alert schema
export const lowStockAlertSchema = Joi.object({
  location: Joi.string().hex().length(24),
  threshold: Joi.number().min(0).max(100).default(20), // Percentage below min stock level
  includeReserved: Joi.boolean().default(true),
  emailNotification: Joi.boolean().default(true)
});

// Stock import schema (CSV/Excel)
export const stockImportSchema = Joi.object({
  product: Joi.string().required(), // Product name or code for lookup
  location: Joi.string().required(), // Location name for lookup
  quantity: Joi.number().min(0).required(),
  unitCost: Joi.number().min(0),
  batchNumber: Joi.string().max(50),
  expiryDate: Joi.date().iso(),
  serialNumbers: Joi.alternatives().try(
    Joi.string(), // Comma-separated for CSV
    Joi.array().items(Joi.string())
  )
});

// Bulk stock import schema
export const bulkStockImportSchema = Joi.array().items(stockImportSchema).min(1).max(10000); 