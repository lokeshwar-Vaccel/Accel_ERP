import Joi from 'joi';
import { CustomerType, LeadStatus } from '../types';

// Base customer fields
const baseCustomerFields = {
  name: Joi.string().min(2).max(100).trim(),
  email: Joi.string().email().lowercase().allow(null),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(500).trim(),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  leadSource: Joi.string().max(100).trim().allow(''),
  assignedTo: Joi.string().hex().length(24), // MongoDB ObjectId
  status: Joi.string().valid(...Object.values(LeadStatus)),
  notes: Joi.string().max(2000).allow('')
};

// Create customer schema
export const createCustomerSchema = Joi.object({
  name: baseCustomerFields.name.required(),
  email: baseCustomerFields.email,
  phone: baseCustomerFields.phone.required(),
  address: baseCustomerFields.address.required(),
  customerType: baseCustomerFields.customerType.required(),
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status.default(LeadStatus.NEW),
  notes: baseCustomerFields.notes
});

// Update customer schema
export const updateCustomerSchema = Joi.object({
  name: baseCustomerFields.name,
  email: baseCustomerFields.email,
  phone: baseCustomerFields.phone,
  address: baseCustomerFields.address,
  customerType: baseCustomerFields.customerType,
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes
});

// Contact history schema
export const addContactHistorySchema = Joi.object({
  type: Joi.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
  date: Joi.date().iso().required(),
  notes: Joi.string().max(1000).required(),
  followUpDate: Joi.date().iso().greater('now')
});

// Update contact history schema
export const updateContactHistorySchema = Joi.object({
  type: Joi.string().valid('call', 'meeting', 'email', 'whatsapp'),
  date: Joi.date().iso(),
  notes: Joi.string().max(1000),
  followUpDate: Joi.date().iso().allow(null)
});

// Bulk contact addition schema
export const bulkContactHistorySchema = Joi.array().items(addContactHistorySchema).min(1).max(10);

// Customer search/filter schema
export const customerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  status: Joi.string().valid(...Object.values(LeadStatus)),
  assignedTo: Joi.string().hex().length(24),
  leadSource: Joi.string(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom'))
});

// Convert lead to customer schema
export const convertLeadSchema = Joi.object({
  status: Joi.string().valid(LeadStatus.CONVERTED).required(),
  conversionNotes: Joi.string().max(1000),
  assignedTo: baseCustomerFields.assignedTo
});

// Customer follow-up schema
export const scheduleFollowUpSchema = Joi.object({
  followUpDate: Joi.date().iso().greater('now').required(),
  followUpType: Joi.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
  notes: Joi.string().max(500),
  assignedTo: baseCustomerFields.assignedTo
});

// Customer import schema (CSV/Excel)
export const customerImportSchema = Joi.object({
  name: baseCustomerFields.name.required(),
  email: baseCustomerFields.email,
  phone: baseCustomerFields.phone.required(),
  address: baseCustomerFields.address.required(),
  customerType: baseCustomerFields.customerType.required(),
  leadSource: baseCustomerFields.leadSource,
  status: baseCustomerFields.status.default(LeadStatus.NEW),
  notes: baseCustomerFields.notes
});

// Bulk customer import schema
export const bulkCustomerImportSchema = Joi.array().items(customerImportSchema).min(1).max(1000); 