import Joi from 'joi';
import { ProductCategory } from '../types';

// TypeScript interfaces for validation results
export interface CreateProductInput {
  name: string;
  description?: string;
  category: ProductCategory;
  brand?: string;
  modelNumber?: string;
  specifications?: Record<string, any>;
  price: number;
  minStockLevel: number;
  isActive?: boolean;
  tags?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: 'cm' | 'inch' | 'mm' | 'kg' | 'lbs';
  };
  warranty?: {
    duration?: number;
    unit?: 'days' | 'months' | 'years';
    terms?: string;
  };
  stockUnit?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: ProductCategory;
  brand?: string;
  modelNumber?: string;
  specifications?: Record<string, any>;
  price?: number;
  minStockLevel?: number;
  isActive?: boolean;
  tags?: string[];
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    unit?: 'cm' | 'inch' | 'mm' | 'kg' | 'lbs';
  };
  warranty?: {
    duration?: number;
    unit?: 'days' | 'months' | 'years';
    terms?: string;
  };
  stockUnit?: string;
}

export interface ProductQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  category?: ProductCategory;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  isActive?: boolean;
  lowStock?: boolean;
  tags?: string | string[];
}

export interface BulkPriceUpdateInput {
  productIds: string[];
  updateType: 'percentage' | 'fixed_amount' | 'new_price';
  value: number;
  reason?: string;
}

export interface ProductImportInput {
  name: string;
  description?: string;
  category: ProductCategory;
  brand?: string;
  modelNumber?: string;
  price: number;
  minStockLevel: number;
  specifications?: Record<string, any> | string;
}

export interface ProductVariantInput {
  name: string;
  sku?: string;
  attributes: Record<string, any>;
  price?: number;
  stock?: number;
}

export interface AddProductVariantInput {
  variants: ProductVariantInput[];
}

export interface ProductComparisonInput {
  productIds: string[];
  attributes?: string[];
}

export interface ProductRatingInput {
  rating: number;
  review?: string;
  reviewer?: string;
  verified?: boolean;
}

export interface StockAlertInput {
  productId: string;
  alertLevel: number;
  emailNotification?: boolean;
  smsNotification?: boolean;
}

// Base product fields
const baseProductFields = {
  name: Joi.string().min(2).max(200).trim().required(),
  description: Joi.string().max(1000).allow(''),
  category: Joi.string().valid(...Object.values(ProductCategory)).required(),
  brand: Joi.string().max(100).trim().allow(''),
  modelNumber: Joi.string().max(100).trim().allow(''),
  specifications: Joi.object().unknown(true),
  price: Joi.number().min(0).precision(2).required(),
  minStockLevel: Joi.number().integer().min(0).required(),
  maxStockLevel: Joi.number().integer().min(0).required(),
  isActive: Joi.boolean().default(true),
  tags: Joi.array().items(Joi.string().max(50)).max(10),
  dimensions: Joi.object({
    length: Joi.number().min(0),
    width: Joi.number().min(0),
    height: Joi.number().min(0),
    weight: Joi.number().min(0),
    unit: Joi.string().valid('cm', 'inch', 'mm', 'kg', 'lbs')
  }),
  warranty: Joi.object({
    duration: Joi.number().integer().min(0),
    unit: Joi.string().valid('days', 'months', 'years'),
    terms: Joi.string().max(500)
  }),
  partNo: Joi.string().max(100).trim().required(),
  quantity: Joi.number().min(0).default(0),
  location: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow('').optional(),
  room: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow('').optional(),
  rack: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow('').optional(),
  hsnNumber: Joi.string().max(50).allow(''),
  productType1: Joi.string().max(100).allow(''),
  productType2: Joi.string().max(100).allow(''),
  productType3: Joi.string().max(100).allow(''),
  make: Joi.string().max(100).allow(''),
  gst: Joi.number().min(0).max(100),
  gndp: Joi.number().min(0).required(),
  mrp: Joi.number().min(0),
  gndpTotal: Joi.number().min(0),
  cpcbNo: Joi.string().max(100).allow(''),
  createdBy: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required()
};

const allowedStockUnits = ['nos', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'eu'];

// Create product schema
export const createProductSchema = Joi.object({
  name: baseProductFields.name,
  description: baseProductFields.description,
  category: baseProductFields.category,
  brand: baseProductFields.brand,
  modelNumber: baseProductFields.modelNumber,
  specifications: baseProductFields.specifications,
  price: baseProductFields.price,
  minStockLevel: baseProductFields.minStockLevel,
  maxStockLevel: baseProductFields.maxStockLevel,
  isActive: baseProductFields.isActive,
  tags: baseProductFields.tags,
  dimensions: baseProductFields.dimensions,
  warranty: baseProductFields.warranty,
  partNo: baseProductFields.partNo,
  quantity: baseProductFields.quantity,
  location: baseProductFields.location,
  room: baseProductFields.room,
  rack: baseProductFields.rack,
  hsnNumber: baseProductFields.hsnNumber,
  productType1: baseProductFields.productType1,
  productType2: baseProductFields.productType2,
  productType3: baseProductFields.productType3,
  make: baseProductFields.make,
  gst: baseProductFields.gst,
  gndp: baseProductFields.gndp,
  cpcbNo: baseProductFields.cpcbNo,
  gndpTotal: baseProductFields.gndpTotal,
  createdBy: baseProductFields.createdBy,
  uom: Joi.string().valid(...allowedStockUnits).required()
});

// Update product schema
export const updateProductSchema = Joi.object({
  name: baseProductFields.name,
  description: baseProductFields.description,
  category: baseProductFields.category,
  brand: baseProductFields.brand,
  modelNumber: baseProductFields.modelNumber,
  specifications: baseProductFields.specifications,
  // price: baseProductFields.price,
  minStockLevel: baseProductFields.minStockLevel,
  maxStockLevel: baseProductFields.maxStockLevel,
  isActive: baseProductFields.isActive,
  tags: baseProductFields.tags,
  dimensions: baseProductFields.dimensions,
  warranty: baseProductFields.warranty,
  partNo: baseProductFields.partNo,
  quantity: baseProductFields.quantity,
  location: baseProductFields.location,
  room: baseProductFields.room,
  rack: baseProductFields.rack,
  hsnNumber: baseProductFields.hsnNumber,
  productType1: baseProductFields.productType1,
  productType2: baseProductFields.productType2,
  productType3: baseProductFields.productType3,
  make: baseProductFields.make,
  gst: baseProductFields.gst,
  gndp: baseProductFields.gndp,
  price: baseProductFields.price,
  gndpTotal: baseProductFields.gndpTotal,
  createdBy: baseProductFields.createdBy,
  stockUnit: Joi.string().valid(...allowedStockUnits).allow(null)
});

// Product search/filter schema
export const productQuerySchema = Joi.object<ProductQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  category: Joi.string().valid(...Object.values(ProductCategory)),
  brand: Joi.string(),
  priceMin: Joi.number().min(0),
  priceMax: Joi.number().min(Joi.ref('priceMin')),
  isActive: Joi.boolean(),
  lowStock: Joi.boolean(), // Filter products below minimum stock level
  tags: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string())
  )
});

// Bulk price update schema
export const bulkPriceUpdateSchema = Joi.object<BulkPriceUpdateInput>({
  productIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  updateType: Joi.string().valid('percentage', 'fixed_amount', 'new_price').required(),
  value: Joi.number().required(),
  reason: Joi.string().max(200)
});

// Product import schema (CSV/Excel)
export const productImportSchema = Joi.object<ProductImportInput>({
  name: baseProductFields.name.required(),
  description: baseProductFields.description,
  category: baseProductFields.category.required(),
  brand: baseProductFields.brand,
  modelNumber: baseProductFields.modelNumber,
  price: baseProductFields.price.required(),
  minStockLevel: baseProductFields.minStockLevel.required(),
  specifications: Joi.alternatives().try(
    Joi.object(),
    Joi.string() // For CSV import where specifications might be a JSON string
  )
});

// Bulk product import schema
export const bulkProductImportSchema = Joi.array().items(productImportSchema).min(1).max(1000);

// Product variant schema (for products with multiple variants)
export const productVariantSchema = Joi.object<ProductVariantInput>({
  name: Joi.string().max(100).required(),
  sku: Joi.string().max(50),
  attributes: Joi.object().required(), // e.g., { color: 'red', size: 'large' }
  price: baseProductFields.price,
  stock: Joi.number().integer().min(0)
});

// Add product variant schema
export const addProductVariantSchema = Joi.object<AddProductVariantInput>({
  variants: Joi.array().items(productVariantSchema).min(1).max(20).required()
});

// Product comparison schema
export const productComparisonSchema = Joi.object<ProductComparisonInput>({
  productIds: Joi.array().items(Joi.string().hex().length(24)).min(2).max(5).required(),
  attributes: Joi.array().items(Joi.string()).default(['price', 'specifications', 'brand', 'modelNumber'])
});

// Product rating/review schema
export const productRatingSchema = Joi.object<ProductRatingInput>({
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().max(1000),
  reviewer: Joi.string().max(100),
  verified: Joi.boolean().default(false)
});

// Product stock alert schema
export const stockAlertSchema = Joi.object<StockAlertInput>({
  productId: Joi.string().hex().length(24).required(),
  alertLevel: Joi.number().integer().min(0).required(),
  emailNotification: Joi.boolean().default(true),
  smsNotification: Joi.boolean().default(false)
}); 