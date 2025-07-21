import Joi from 'joi';
import { CustomerType, LeadStatus, CustomerMainType } from '../types';

// TypeScript interfaces for validation results
export interface CreateCustomerInput {
  name: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  addresses: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean }[];
  customerType: CustomerType;
  type: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  assignedTo?: string;
  status?: LeadStatus;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  addresses?: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean }[];
  customerType?: CustomerType;
  type?: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  assignedTo?: string;
  status?: LeadStatus;
  notes?: string;
}

export interface AddContactHistoryInput {
  type: 'call' | 'meeting' | 'email' | 'whatsapp';
  date: string;
  notes: string;
  followUpDate?: string;
}

export interface UpdateContactHistoryInput {
  type?: 'call' | 'meeting' | 'email' | 'whatsapp';
  date?: string;
  notes?: string;
  followUpDate?: string | null;
}

export interface CustomerQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  customerType?: CustomerType;
  status?: LeadStatus;
  assignedTo?: string;
  leadSource?: string;
  dateFrom?: string;
  dateTo?: string;
  type?: string;
  newLeadStatus?: string;
  qualifiedStatus?: string;
  convertedStatus?: string;
  lostStatus?: string;
  contactedStatus?: string;
}

export interface ConvertLeadInput {
  status: LeadStatus.CONVERTED;
  conversionNotes?: string;
  assignedTo?: string;
}

export interface ScheduleFollowUpInput {
  followUpDate: string;
  followUpType: 'call' | 'meeting' | 'email' | 'whatsapp';
  notes?: string;
  assignedTo?: string;
}

export interface CustomerImportInput {
  name: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  addresses: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean }[];
  customerType: CustomerType;
  type: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  status?: LeadStatus;
  notes?: string;
}

// Address Joi schema
const addressJoiSchema = Joi.object({
  id: Joi.number().required(),
  address: Joi.string().max(500).required(),
  state: Joi.string().max(100).required(),
  district: Joi.string().max(100).required(),
  pincode: Joi.string().pattern(/^\d{6}$/).allow('').optional(),
  isPrimary: Joi.boolean().default(false)
});

// Base customer fields
const baseCustomerFields = {
  name: Joi.string().min(2).max(100).trim(),
  designation: Joi.string().max(100).trim().allow(''),
  contactPersonName: Joi.string().max(100).trim().allow(''),
  gstNumber: Joi.string().max(50).trim().allow(''),
  email: Joi.string().email().lowercase().allow('', null),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('', null),
  addresses: Joi.array().items(addressJoiSchema).min(1),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  type: Joi.string().valid(...Object.values(CustomerMainType)),
  leadSource: Joi.string().max(100).trim().allow(''),
  assignedTo: Joi.string().hex().length(24), // MongoDB ObjectId
  status: Joi.string().valid(...Object.values(LeadStatus)),
  notes: Joi.string().max(2000).allow('')
};

// Create customer schema
export const createCustomerSchema = Joi.object<CreateCustomerInput>({
  name: baseCustomerFields.name.required(),
  designation: baseCustomerFields.designation,
  contactPersonName: baseCustomerFields.contactPersonName,
  gstNumber: baseCustomerFields.gstNumber,
  email: baseCustomerFields?.email.allow('', null),
  phone: baseCustomerFields.phone.allow('', null),
  addresses: baseCustomerFields.addresses,
  customerType: baseCustomerFields.customerType,
  type: baseCustomerFields.type,
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes
});

// Update customer schema
export const updateCustomerSchema = Joi.object<UpdateCustomerInput>({
  name: baseCustomerFields.name,
  designation: baseCustomerFields.designation,
  contactPersonName: baseCustomerFields.contactPersonName,
  gstNumber: baseCustomerFields.gstNumber,
  email: baseCustomerFields.email,
  phone: baseCustomerFields.phone,
  addresses: baseCustomerFields.addresses,
  customerType: baseCustomerFields.customerType,
  type: baseCustomerFields.type,
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes
});

// Contact history schema
export const addContactHistorySchema = Joi.object<AddContactHistoryInput>({
  type: Joi.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
  date: Joi.date().iso().required(),
  notes: Joi.string().max(1000).required(),
  followUpDate: Joi.date().iso().greater('now')
});

// Update contact history schema
export const updateContactHistorySchema = Joi.object<UpdateContactHistoryInput>({
  type: Joi.string().valid('call', 'meeting', 'email', 'whatsapp'),
  date: Joi.date().iso(),
  notes: Joi.string().max(1000),
  followUpDate: Joi.date().iso().allow(null)
});

// Bulk contact addition schema
export const bulkContactHistorySchema = Joi.array().items(addContactHistorySchema).min(1).max(10);

// Customer search/filter schema
export const customerQuerySchema = Joi.object<CustomerQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  status: Joi.string().valid(...Object.values(LeadStatus)),
  assignedTo: Joi.string().hex().length(24),
  leadSource: Joi.string(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
  type: Joi.string(),
  newLeadStatus: Joi.string().valid('true', 'false'),
  qualifiedStatus: Joi.string().valid('true', 'false'),
  convertedStatus: Joi.string().valid('true', 'false'),
  lostStatus: Joi.string().valid('true', 'false'),
  contactedStatus: Joi.string().valid('true', 'false'),
});

// Convert lead to customer schema
export const convertLeadSchema = Joi.object<ConvertLeadInput>({
  status: Joi.string().valid(LeadStatus.CONVERTED).required(),
  conversionNotes: Joi.string().max(1000),
  assignedTo: baseCustomerFields.assignedTo
});

// Customer follow-up schema
export const scheduleFollowUpSchema = Joi.object<ScheduleFollowUpInput>({
  followUpDate: Joi.date().iso().greater('now').required(),
  followUpType: Joi.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
  notes: Joi.string().max(500),
  assignedTo: baseCustomerFields.assignedTo
});

// Customer import schema (CSV/Excel)
export const customerImportSchema = Joi.object<CustomerImportInput>({
  name: baseCustomerFields.name.required(),
  designation: baseCustomerFields.designation,
  contactPersonName: baseCustomerFields.contactPersonName,
  gstNumber: baseCustomerFields.gstNumber,
  // email: baseCustomerFields.email,
  phone: baseCustomerFields.phone,
  addresses: baseCustomerFields.addresses,
  customerType: baseCustomerFields.customerType,
  type: baseCustomerFields.type,
  leadSource: baseCustomerFields.leadSource,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes
});

// Bulk customer import schema
export const bulkCustomerImportSchema = Joi.array().items(customerImportSchema).min(1).max(1000); 