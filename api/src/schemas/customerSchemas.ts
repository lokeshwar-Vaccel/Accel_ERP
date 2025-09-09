import Joi from 'joi';
import { CustomerType, LeadStatus, CustomerMainType } from '../types';

// GSTIN validation: exact 15-char format using provided regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const gstinJoi = Joi.string().trim().custom((value, helpers) => {
  if (!value) return value; // allow empty handled by allow() where used
  const upper = value.toUpperCase();
  if (!GSTIN_REGEX.test(upper)) {
    return helpers.error('any.invalid');
  }
  return upper;
}, 'GSTIN format validation');

// TypeScript interfaces for validation results
export interface CreateCustomerInput {
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email?: string;
  phone?: string;
  panNumber?: string;
  addresses: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean; gstNumber?: string; notes?: string }[];
  siteAddress?: string;
  numberOfDG?: number;
  customerType: CustomerType;
  type: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  assignedTo?: string;
  status?: LeadStatus;
  notes?: string;
  isDGSalesCustomer?: boolean;
  dgDetails?: {
    dgSerialNumbers: string;
    alternatorMake: string;
    alternatorSerialNumber: string;
    dgMake: string;
    engineSerialNumber: string;
    dgModel: string;
    dgRatingKVA: number;
    salesDealerName: string;
    commissioningDate: Date;
    warrantyStatus: 'warranty' | 'non_warranty';
    installationType: 'infold' | 'outfold';
    amcStatus: 'yes' | 'no';
    cluster: string;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    locationAddress?: string;
  }[];
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
  };
}

export interface UpdateCustomerInput {
  name?: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email?: string;
  phone?: string;
  panNumber?: string;
  addresses?: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean; gstNumber?: string; notes?: string }[];
  siteAddress?: string;
  numberOfDG?: number;
  customerType?: CustomerType;
  type?: CustomerMainType; // 'customer' or 'supplier'
  leadSource?: string;
  assignedTo?: string;
  status?: LeadStatus;
  notes?: string;
  isDGSalesCustomer?: boolean;
  dgDetails?: {
    dgSerialNumbers: string;
    alternatorMake: string;
    alternatorSerialNumber: string;
    dgMake: string;
    engineSerialNumber: string;
    dgModel: string;
    dgRatingKVA: number;
    salesDealerName: string;
    commissioningDate: Date;
    warrantyStatus: 'warranty' | 'non_warranty';
    installationType: 'infold' | 'outfold';
    amcStatus: 'yes' | 'no';
    cluster: string;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
    locationAddress?: string;
  }[];
  bankDetails?: {
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    branch?: string;
  };
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
  isDGSalesCustomer?: boolean;
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
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  addresses: { id: number; address: string; state: string; district: string; pincode: string; isPrimary: boolean; gstNumber?: string; notes?: string }[];
  siteAddress?: string;
  numberOfDG?: number;
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
  pincode: Joi.string().max(100).trim().allow('', null), // Allow any text for pincode field
  gstNumber: gstinJoi.allow('', null).messages({ 'any.invalid': 'Invalid GST Number format. Expected like 22AAAAA0000A1Z5' }),
  isPrimary: Joi.boolean().default(false),
  notes: Joi.string().max(500).trim().allow('', null), // Allow notes field
  contactPersonName: Joi.string().max(100).trim().allow('', null),
  email: Joi.string().email().lowercase().allow('', null),
  phone: Joi.string().max(200).trim().allow('', null),
  registrationStatus: Joi.string().valid('registered', 'non_registered').required()
}).custom((value, helpers) => {
  // Conditional: if registrationStatus is 'registered', gstNumber must be present and valid
  if (value.registrationStatus === 'registered') {
    const gst = (value.gstNumber || '').toString().trim();
    if (!gst) {
      return helpers.error('any.custom', { message: 'GST Number is required when Registration Status is Registered' });
    }
    const upper = gst.toUpperCase();
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(upper)) {
      return helpers.error('any.custom', { message: 'Invalid GST Number format. Expected like 22AAAAA0000A1Z5' });
    }
  }
  return value;
}, 'Registration/GST conditional validation');

// DGDetails Joi schema - Made fields optional for imports
const dgDetailsJoiSchema = Joi.object({
  dgSerialNumbers: Joi.string().trim().max(100).allow('', null),
  alternatorMake: Joi.string().trim().max(100).allow('', null),
  alternatorSerialNumber: Joi.string().trim().max(100).allow('', null),
  dgMake: Joi.string().trim().max(100).allow('', null),
  engineSerialNumber: Joi.string().trim().max(100).allow('', null),
  dgModel: Joi.string().trim().max(100).allow('', null),
  dgRatingKVA: Joi.number().min(0).allow('', null),
  salesDealerName: Joi.string().trim().max(200).allow('', null),
  commissioningDate: Joi.date().allow('', null),
  warrantyStatus: Joi.string().valid('warranty', 'non_warranty').allow('', null),
  installationType: Joi.string().valid('infold', 'outfold').allow('', null),
  amcStatus: Joi.string().valid('yes', 'no').allow('', null),
  cluster: Joi.string().trim().max(100).allow('', null),
  warrantyStartDate: Joi.date().allow('', null),
  warrantyEndDate: Joi.date().allow('', null),
  locationAddress: Joi.string().trim().max(500).allow('', null)
});

// Bank details Joi schema
const bankDetailsJoiSchema = Joi.object({
  bankName: Joi.string().max(100).trim().allow('', null),
  accountNo: Joi.string().max(50).trim().allow('', null),
  ifsc: Joi.string().max(20).trim().allow('', null),
  branch: Joi.string().max(100).trim().allow('', null)
});

// Base customer fields
const baseCustomerFields = {
  name: Joi.string().min(2).max(100).trim(),
  alice: Joi.string().max(100).trim().allow(''),
  designation: Joi.string().max(100).trim().allow(''),
  contactPersonName: Joi.string().max(100).trim().allow(''),
  gstNumber: gstinJoi.allow('').messages({ 'any.invalid': 'Invalid GST Number format. Expected like 22AAAAA0000A1Z5' }),
  email: Joi.string().email().lowercase().allow('', null),
  phone: Joi.string().max(200).trim().allow('', null), // Allow any text for phone field
  panNumber: Joi.string().max(10).trim().allow(''),
  addresses: Joi.array().items(addressJoiSchema).min(1),
  siteAddress: Joi.string().max(500).trim().allow(''),
  numberOfDG: Joi.number().integer().min(0).max(100).allow('', null, 0),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  type: Joi.string().valid(...Object.values(CustomerMainType)),
  leadSource: Joi.string().max(100).trim().allow(''),
  assignedTo: Joi.string().hex().length(24), // MongoDB ObjectId
  status: Joi.string().valid(...Object.values(LeadStatus)),
  notes: Joi.string().max(2000).allow(''),
  isDGSalesCustomer: Joi.boolean().optional(),
  dgDetails: Joi.array().items(dgDetailsJoiSchema).optional(),
  bankDetails: bankDetailsJoiSchema.optional()
};

// Create customer schema
export const createCustomerSchema = Joi.object<CreateCustomerInput>({
  name: baseCustomerFields.name.required(),
  alice: baseCustomerFields.alice,
  designation: baseCustomerFields.designation,
  contactPersonName: baseCustomerFields.contactPersonName,
  email: baseCustomerFields?.email.allow('', null),
  phone: baseCustomerFields?.phone.allow('', null),
  panNumber: baseCustomerFields.panNumber,
  addresses: baseCustomerFields.addresses,
  siteAddress: baseCustomerFields.siteAddress,
  numberOfDG: baseCustomerFields.numberOfDG,
  customerType: baseCustomerFields.customerType,
  type: baseCustomerFields.type,
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes,
  isDGSalesCustomer: baseCustomerFields.isDGSalesCustomer,
  dgDetails: baseCustomerFields.dgDetails,
  bankDetails: baseCustomerFields.bankDetails
});

// Update customer schema
export const updateCustomerSchema = Joi.object<UpdateCustomerInput>({
  name: baseCustomerFields.name,
  alice: baseCustomerFields.alice,
  designation: baseCustomerFields.designation,
  contactPersonName: baseCustomerFields.contactPersonName,
  email: baseCustomerFields.email,
  phone: baseCustomerFields.phone,
  panNumber: baseCustomerFields.panNumber,
  addresses: baseCustomerFields.addresses,
  siteAddress: baseCustomerFields.siteAddress,
  numberOfDG: baseCustomerFields.numberOfDG,
  customerType: baseCustomerFields.customerType,
  type: baseCustomerFields.type,
  leadSource: baseCustomerFields.leadSource,
  assignedTo: baseCustomerFields.assignedTo,
  status: baseCustomerFields.status,
  notes: baseCustomerFields.notes,
  isDGSalesCustomer: baseCustomerFields.isDGSalesCustomer,
  dgDetails: baseCustomerFields.dgDetails,
  bankDetails: baseCustomerFields.bankDetails
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
  isDGSalesCustomer: Joi.boolean(),
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