import Joi from 'joi';

const baseDGProductFields = {
  description: Joi.string().max(1000).optional(),
  isActive: Joi.boolean().default(true),
  kva: Joi.string().required().trim(),
  phase: Joi.string().valid('single', 'three').required(),
  annexureRating: Joi.string().required().trim(),
  dgModel: Joi.string().required().trim(),
  numberOfCylinders: Joi.number().integer().min(1).required(),
  subject: Joi.string().max(500).required().trim(),
  createdBy: Joi.string().required()
};

export const createDGProductSchema = Joi.object({
  ...baseDGProductFields
});

export const updateDGProductSchema = Joi.object({
  ...baseDGProductFields,
  description: Joi.string().max(1000).optional(),
  isActive: Joi.boolean().optional(),
  kva: Joi.string().optional().trim(),
  phase: Joi.string().valid('single', 'three').optional(),
  annexureRating: Joi.string().optional().trim(),
  dgModel: Joi.string().optional().trim(),
  numberOfCylinders: Joi.number().integer().min(1).optional(),
  subject: Joi.string().max(500).optional().trim()
});

export const dgProductQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').optional(),
  kva: Joi.string().allow('').optional(),
  phase: Joi.string().valid('single', 'three').optional(),
  dgModel: Joi.string().allow('').optional(),
  sortBy: Joi.string().valid('createdAt', 'subject', 'kva', 'phase', 'dgModel').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}); 