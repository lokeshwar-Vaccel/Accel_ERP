import Joi from 'joi';
import { ProductCategory } from '../types';

// Base product fields
const baseProductFields = {
  name: Joi.string().min(2).max(200).trim(),
  description: Joi.string().max(1000).allow(''),
  category: Joi.string().valid(...Object.values(ProductCategory)),
  brand: Joi.string().max(100).trim().allow(''),
  model: Joi.string().max(100).trim().allow(''),
  specifications: Joi.object().unknown(true), // Allow any key-value pairs
  price: Joi.number().min(0).precision(2),
  minStockLevel: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
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
  })
};

// Create product schema
export const createProductSchema = Joi.object({
  name: baseProductFields.name.required(),
  description: baseProductFields.description,
  category: baseProductFields.category.required(),
  brand: baseProductFields.brand,
  model: baseProductFields.model,
  specifications: baseProductFields.specifications,
  price: baseProductFields.price.required(),
  minStockLevel: baseProductFields.minStockLevel.required(),
  isActive: baseProductFields.isActive.default(true),
  tags: baseProductFields.tags,
  dimensions: baseProductFields.dimensions,
  warranty: baseProductFields.warranty
});

// Update product schema
export const updateProductSchema = Joi.object({
  name: baseProductFields.name,
  description: baseProductFields.description,
  category: baseProductFields.category,
  brand: baseProductFields.brand,
  model: baseProductFields.model,
  specifications: baseProductFields.specifications,
  price: baseProductFields.price,
  minStockLevel: baseProductFields.minStockLevel,
  isActive: baseProductFields.isActive,
  tags: baseProductFields.tags,
  dimensions: baseProductFields.dimensions,
  warranty: baseProductFields.warranty
});

// Product search/filter schema
export const productQuerySchema = Joi.object({
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
export const bulkPriceUpdateSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  updateType: Joi.string().valid('percentage', 'fixed_amount', 'new_price').required(),
  value: Joi.number().required(),
  reason: Joi.string().max(200)
});

// Product import schema (CSV/Excel)
export const productImportSchema = Joi.object({
  name: baseProductFields.name.required(),
  description: baseProductFields.description,
  category: baseProductFields.category.required(),
  brand: baseProductFields.brand,
  model: baseProductFields.model,
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
export const productVariantSchema = Joi.object({
  name: Joi.string().max(100).required(),
  sku: Joi.string().max(50),
  attributes: Joi.object().required(), // e.g., { color: 'red', size: 'large' }
  price: baseProductFields.price,
  stock: Joi.number().integer().min(0)
});

// Add product variant schema
export const addProductVariantSchema = Joi.object({
  variants: Joi.array().items(productVariantSchema).min(1).max(20).required()
});

// Product comparison schema
export const productComparisonSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().hex().length(24)).min(2).max(5).required(),
  attributes: Joi.array().items(Joi.string()).default(['price', 'specifications', 'brand', 'model'])
});

// Product rating/review schema
export const productRatingSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  review: Joi.string().max(1000),
  reviewer: Joi.string().max(100),
  verified: Joi.boolean().default(false)
});

// Product stock alert schema
export const stockAlertSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  alertLevel: Joi.number().integer().min(0).required(),
  emailNotification: Joi.boolean().default(true),
  smsNotification: Joi.boolean().default(false)
}); 