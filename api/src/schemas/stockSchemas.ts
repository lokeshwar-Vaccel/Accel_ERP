import Joi from 'joi';
import { StockTransactionType } from '../types';

// TypeScript interfaces for validation results
export interface CreateStockLocationInput {
  name: string;
  address: string;
  type: 'main_office' | 'warehouse' | 'service_center';
  contactPerson?: string;
  phone?: string;
  isActive?: boolean;
  capacity?: number;
  description?: string;
}

export interface UpdateStockLocationInput {
  name?: string;
  address?: string;
  type?: 'main_office' | 'warehouse' | 'service_center';
  contactPerson?: string;
  phone?: string;
  isActive?: boolean;
  capacity?: number;
  description?: string;
}

export interface CreateRoomInput {
  name: string;
  location: string; // ObjectId as string
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoomInput {
  name?: string;
  location?: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateRackInput {
  name: string;
  location: string; // ObjectId
  room: string;     // ObjectId
  description?: string;
  isActive?: boolean;
}

export interface UpdateRackInput {
  name?: string;
  location?: string;
  room?: string;
  description?: string;
  isActive?: boolean;
}


export interface StockAdjustmentInput {
  product: string;
  location: string;
  adjustmentType: 'add' | 'subtract' | 'set' | 'reserve' | 'release';
  quantity: number;
  reason: string; // Made flexible to allow custom reasons for reservations
  notes?: string;
  batchNumber?: string;
  serialNumbers?: string[];
  // Reservation-specific fields
  reservationType?: 'service' | 'sale' | 'transfer' | 'other';
  referenceId?: string;
  reservedUntil?: string;
}

export interface StockTransferInput {
  product: string;
  fromLocation: string;
  fromRoom?: string;
  fromRack?: string;
  toLocation: string;
  toRoom?: string;
  toRack?: string;
  quantity: number;
  transferReason?: 'restock' | 'customer_request' | 'maintenance' | 'redistribution' | 'other';
  notes?: string;
  expectedDate?: string;
  serialNumbers?: string[];
}

export interface BulkStockTransferInput {
  fromLocation: string;
  toLocation: string;
  items: {
    product: string;
    quantity: number;
    serialNumbers?: string[];
  }[];
  transferReason?: string;
  notes?: string;
  expectedDate?: string;
}

export interface StockReservationInput {
  product: string;
  location: string;
  quantity: number;
  reservationType: 'service' | 'sale' | 'transfer' | 'other';
  referenceId?: string;
  reservedUntil?: string;
  notes?: string;
}

export interface StockReconciliationInput {
  location: string;
  reconciliationDate: string;
  items: {
    product: string;
    systemQuantity: number;
    physicalQuantity: number;
    discrepancy: number;
    reason?: string;
    action?: 'adjust' | 'investigate' | 'ignore';
  }[];
  performedBy?: string;
  notes?: string;
}

export interface StockQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  product?: string;
  location?: string;
  category?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  search?: string;
}

export interface StockTransactionInput {
  type: StockTransactionType;
  product: string;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  reference?: string;
  referenceType?: 'purchase_order' | 'service_ticket' | 'adjustment' | 'transfer' | 'sale';
  notes?: string;
  unitCost?: number;
  totalCost?: number;
}

export interface StockValuationInput {
  location?: string;
  category?: string;
  valuationMethod?: 'fifo' | 'lifo' | 'average' | 'current';
  asOfDate?: string;
}

export interface StockMovementReportInput {
  dateFrom: string;
  dateTo: string;
  product?: string;
  location?: string;
  movementType?: StockTransactionType;
  format?: 'json' | 'csv' | 'excel';
}

export interface LowStockAlertInput {
  location?: string;
  threshold?: number;
  includeReserved?: boolean;
  emailNotification?: boolean;
}

export interface StockImportInput {
  product: string;
  location: string;
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  serialNumbers?: string | string[];
}

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
export const createStockLocationSchema = Joi.object<CreateStockLocationInput>({
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
export const updateStockLocationSchema = Joi.object<UpdateStockLocationInput>({
  name: baseStockLocationFields.name,
  address: baseStockLocationFields.address,
  type: baseStockLocationFields.type,
  contactPerson: baseStockLocationFields.contactPerson,
  phone: baseStockLocationFields.phone,
  isActive: baseStockLocationFields.isActive,
  capacity: baseStockLocationFields.capacity,
  description: baseStockLocationFields.description
});

const baseRoomFields = {
  name: Joi.string().min(2).max(100).trim(),
  location: Joi.string().length(24).hex(), // MongoDB ObjectId
  description: Joi.string().max(500).trim().allow(''),
  isActive: Joi.boolean()
};

export const createRoomSchema = Joi.object<CreateRoomInput>({
  name: baseRoomFields.name.required(),
  location: baseRoomFields.location.required(),
  description: baseRoomFields.description,
  isActive: baseRoomFields.isActive.default(true)
});

export const updateRoomSchema = Joi.object<UpdateRoomInput>({
  name: baseRoomFields.name,
  location: baseRoomFields.location,
  description: baseRoomFields.description,
  isActive: baseRoomFields.isActive
});

const baseRackFields = {
  name: Joi.string().min(2).max(100).trim(),
  location: Joi.string().length(24).hex(),
  room: Joi.string().length(24).hex(),
  description: Joi.string().max(500).trim().allow(''),
  isActive: Joi.boolean()
};

export const createRackSchema = Joi.object<CreateRackInput>({
  name: baseRackFields.name.required(),
  location: baseRackFields.location.required(),
  room: baseRackFields.room.required(),
  description: baseRackFields.description,
  isActive: baseRackFields.isActive.default(true)
});

export const updateRackSchema = Joi.object<UpdateRackInput>({
  name: baseRackFields.name,
  location: baseRackFields.location,
  room: baseRackFields.room,
  description: baseRackFields.description,
  isActive: baseRackFields.isActive
});

// Stock adjustment schema
export const stockAdjustmentSchema = Joi.object<StockAdjustmentInput>({
  product: Joi.string().hex().length(24).required(),
  location: Joi.string().hex().length(24).required(),
  adjustmentType: Joi.string().valid('add', 'subtract', 'set', 'reserve', 'release').required(),
  quantity: Joi.number().min(0).required(),
  reason: Joi.string().min(1).max(200).required(), // Made flexible for custom reasons
  notes: Joi.string().max(500).allow(''),
  batchNumber: Joi.string().max(50),
  serialNumbers: Joi.array().items(Joi.string().max(100)),
  // Reservation-specific fields (required when adjustmentType is 'reserve')
  reservationType: Joi.when('adjustmentType', {
    is: 'reserve',
    then: Joi.string().valid('service', 'sale', 'transfer', 'other').required(),
    otherwise: Joi.string().valid('service', 'sale', 'transfer', 'other').optional()
  }),
  referenceId: Joi.string().max(100).allow(''),
  reservedUntil: Joi.date().iso().greater('now').allow('')
});

// Stock transfer schema
export const stockTransferSchema = Joi.object<StockTransferInput>({
  product: Joi.string().hex().length(24).required(),
  fromLocation: Joi.string().hex().length(24).required(),
  fromRoom: Joi.string().hex().length(24).allow('', null),
  fromRack: Joi.string().hex().length(24).allow('', null),
  toLocation: Joi.string().hex().length(24).required(),
  toRoom: Joi.string().hex().length(24).allow('', null),
  toRack: Joi.string().hex().length(24).allow('', null),
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
export const bulkStockTransferSchema = Joi.object<BulkStockTransferInput>({
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
export const stockReservationSchema = Joi.object<StockReservationInput>({
  product: Joi.string().hex().length(24).required(),
  location: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(1).required(),
  reservationType: Joi.string().valid('service', 'sale', 'transfer', 'other').required(),
  referenceId: Joi.string().max(100), // Service ticket ID, sale ID, etc.
  reservedUntil: Joi.date().iso().greater('now'),
  notes: Joi.string().max(500).allow('')
});

// Stock reconciliation schema
export const stockReconciliationSchema = Joi.object<StockReconciliationInput>({
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
export const stockQuerySchema = Joi.object<StockQueryInput>({
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
export const stockTransactionSchema = Joi.object<StockTransactionInput>({
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
export const stockValuationSchema = Joi.object<StockValuationInput>({
  location: Joi.string().hex().length(24),
  category: Joi.string(),
  valuationMethod: Joi.string().valid('fifo', 'lifo', 'average', 'current').default('average'),
  asOfDate: Joi.date().iso().default(() => new Date())
});

// Stock movement report schema
export const stockMovementReportSchema = Joi.object<StockMovementReportInput>({
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).required(),
  product: Joi.string().hex().length(24),
  location: Joi.string().hex().length(24),
  movementType: Joi.string().valid(...Object.values(StockTransactionType)),
  format: Joi.string().valid('json', 'csv', 'excel').default('json')
});

// Low stock alert schema
export const lowStockAlertSchema = Joi.object<LowStockAlertInput>({
  location: Joi.string().hex().length(24),
  threshold: Joi.number().min(0).max(100).default(20), // Percentage below min stock level
  includeReserved: Joi.boolean().default(true),
  emailNotification: Joi.boolean().default(true)
});

// Stock import schema (CSV/Excel)
export const stockImportSchema = Joi.object<StockImportInput>({
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