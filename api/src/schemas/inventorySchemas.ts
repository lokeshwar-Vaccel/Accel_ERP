import Joi from 'joi';

// TypeScript interface for inventory import from Excel
export interface InventoryImportInput {
  SNO?: number;                    // Serial Number (optional)
  'PART NO': string;              // Part Number (required)
  DESCRIPTION: string;            // Product Description (required)
  'CPCB Norms': string;          // CPCB Number (optional)
  UOM: string;                    // Unit of Measure (required)
  QTY: number;                    // Quantity (required)
  RACK?: string;                  // Rack (optional)
  ROOM?: string;                  // Room (optional)
  DEPT: string;                   // Department (required)
  GNDP: number;                   // GNDP Price (required)
  MRP: number;                    // MRP (required)
  'HSN CODE'?: string;            // HSN Code (optional)
  GST: number;                    // GST Rate (required)
  // Optional processing fields
  location?: string;              // Location ID (will be set during processing)
  category?: string;              // Product category (will be determined from DEPT)
}

// Validation schema for inventory import
export const inventoryImportSchema = Joi.object<InventoryImportInput>({
  SNO: Joi.number().integer().min(1).optional(),
  'PART NO': Joi.string().max(100).trim().required(),
  DESCRIPTION: Joi.string().max(500).trim().required(),
  'CPCB Norms': Joi.string().max(100).trim().allow('').optional(),
  UOM: Joi.string().valid('pcs', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll').required(),
  QTY: Joi.number().min(0).required(),
  RACK: Joi.string().max(50).trim().allow('').optional(),
  ROOM: Joi.string().max(50).trim().allow('').optional(),
  DEPT: Joi.string().max(100).trim().required(),
  GNDP: Joi.number().min(0).precision(2).required(),
  MRP: Joi.number().min(0).precision(2).required(),
  'HSN CODE': Joi.string().max(20).trim().allow('').optional(),
  GST: Joi.number().min(0).max(100).required(),
  location: Joi.string().hex().length(24).optional(),
  category: Joi.string().optional()
});

// Response interface for import preview
export interface InventoryImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  productsToCreate: any[];
  stocksToCreate: any[];
  existingProducts: any[];
}

// Response interface for import result
export interface InventoryImportResult {
  successful: number;
  failed: number;
  errors: string[];
  createdProducts: any[];
  createdStocks: any[];
  updatedProducts: any[];
  updatedStocks: any[];
} 