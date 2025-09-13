import Joi from 'joi';

// Address schema for DG Enquiry
const addressSchema = Joi.object({
  id: Joi.number().required(),
  address: Joi.string().required().trim().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  state: Joi.string().required().trim().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required'
  }),
  district: Joi.string().required().trim().messages({
    'string.empty': 'District is required',
    'any.required': 'District is required'
  }),
  pincode: Joi.string().optional().trim().pattern(/^\d{6}$/).messages({
    'string.pattern.base': 'Pincode must be 6 digits'
  }),
  isPrimary: Joi.boolean().default(false),
  gstNumber: Joi.string().optional().trim().allow(''),
  notes: Joi.string().optional().trim().allow(''),
  contactPersonName: Joi.string().optional().trim().allow(''),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  phone: Joi.string().optional().trim().allow(''),
  registrationStatus: Joi.string().valid('registered', 'non_registered').default('non_registered')
});

// DG Details schema for DG Enquiry
const dgDetailsSchema = Joi.object({
  dgSerialNumbers: Joi.string().optional().trim().allow(''),
  alternatorMake: Joi.string().optional().trim().allow(''),
  alternatorSerialNumber: Joi.string().optional().trim().allow(''),
  dgMake: Joi.string().optional().trim().allow(''),
  engineSerialNumber: Joi.string().optional().trim().allow(''),
  dgModel: Joi.string().optional().trim().allow(''),
  dgRatingKVA: Joi.number().min(0).default(0),
  salesDealerName: Joi.string().optional().trim().allow(''),
  commissioningDate: Joi.date().optional(),
  warrantyStatus: Joi.string().valid('warranty', 'non_warranty').default('warranty'),
  cluster: Joi.string().optional().trim().allow(''),
  warrantyStartDate: Joi.date().optional().allow(null),
  warrantyEndDate: Joi.date().optional().allow(null)
});

// Schema for creating a new DG Enquiry
export const createDGEnquirySchema = Joi.object({
  // Basic Information
  enquiryNo: Joi.string().required().trim().messages({
    'string.empty': 'Enquiry number is required',
    'any.required': 'Enquiry number is required'
  }),
  enquiryDate: Joi.date().required().messages({
    'date.base': 'Enquiry date must be a valid date',
    'any.required': 'Enquiry date is required'
  }),
  enquiryStatus: Joi.string().valid('Open', 'In Progress', 'Closed', 'Cancelled', 'Qualified').default('Open'),
  enquiryType: Joi.string().valid('New', 'Follow Up', 'Renewal').default('New'),
  enquiryStage: Joi.string().valid('Initial', 'Quotation', 'Negotiation', 'Order').default('Initial'),
  source: Joi.string().valid('Website', 'Referral', 'Cold Call', 'Social Media', 'Other').default('Website'),
  
  // Customer Information
  customerType: Joi.string().valid('Retail', 'Corporate').default('Retail'),
  corporateName: Joi.when('customerType', {
    is: 'Corporate',
    then: Joi.string().required().trim().messages({
      'string.empty': 'Corporate name is required for corporate customers',
      'any.required': 'Corporate name is required for corporate customers'
    }),
    otherwise: Joi.string().optional().allow('')
  }),
  customerName: Joi.string().required().trim().messages({
    'string.empty': 'Customer name is required',
    'any.required': 'Customer name is required'
  }),
  alice: Joi.string().optional().trim().allow(''),
  designation: Joi.string().optional().trim().allow(''),
  contactPersonName: Joi.string().optional().trim().allow(''),
  phoneNumber: Joi.string().optional().trim().pattern(/^\+?[1-9]\d{1,14}$/).allow('').messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  panNumber: Joi.string().optional().trim().allow(''),
  
  // Address Information
  addresses: Joi.array().items(addressSchema).min(1).required().messages({
    'array.min': 'At least one address is required',
    'any.required': 'Addresses are required'
  }),
  
  // DG Requirements
  kva: Joi.number().integer().positive().required().messages({
    'number.base': 'KVA must be a number',
    'number.integer': 'KVA must be a whole number',
    'number.positive': 'KVA must be positive',
    'any.required': 'KVA is required'
  }),
  phase: Joi.string().valid('Single Phase', 'Three Phase').default('Three Phase'),
  quantity: Joi.number().integer().positive().required().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.positive': 'Quantity must be positive',
    'any.required': 'Quantity is required'
  }),
  segment: Joi.string().valid('Manufacturing', 'IT/Office', 'Healthcare', 'Education', 'Retail', 'Other').optional().allow(''),
  subSegment: Joi.string().optional().allow(''),
  dgOwnership: Joi.string().valid('NOT_OWNED', 'OWNED', 'RENTED').default('NOT_OWNED'),
  financeRequired: Joi.boolean().default(false),
  financeCompany: Joi.string().optional().allow(''),
  
  // Employee Information
  assignedEmployeeCode: Joi.string().optional().allow(''),
  assignedEmployeeName: Joi.string().optional().allow(''),
  employeeStatus: Joi.string().valid('Active', 'Inactive', 'On Leave').optional().allow(''),
  referenceEmployeeName: Joi.string().optional().allow(''),
  referenceEmployeeMobileNumber: Joi.string().optional().allow(''),
  referredBy: Joi.string().optional().allow(''),
  
  // Additional Information
  events: Joi.string().optional().allow(''),
  remarks: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow(''),
  
  // DG Details
  dgDetails: Joi.array().items(dgDetailsSchema).optional(),
  numberOfDG: Joi.number().integer().min(0).default(1),
  
  // Optional fields from the model
  zone: Joi.string().optional().allow(''),
  areaOffice: Joi.string().optional().allow(''),
  dealer: Joi.string().optional().allow(''),
  branch: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  eoPoDate: Joi.date().optional(),
  plannedFollowUpDate: Joi.date().optional().allow(null),
  sourceFrom: Joi.string().optional().allow(''),
  numberOfFollowUps: Joi.number().integer().min(0).default(0),
  lastFollowUpDate: Joi.date().optional(),
  enquiryClosureDate: Joi.date().optional(),
  customer: Joi.string().optional() // ObjectId reference
});

// Schema for updating a DG Enquiry
export const updateDGEnquirySchema = Joi.object({
  // Basic Information
  enquiryNo: Joi.string().optional().trim(),
  enquiryDate: Joi.date().optional(),
  enquiryStatus: Joi.string().valid('Open', 'In Progress', 'Closed', 'Cancelled', 'Qualified').optional(),
  enquiryType: Joi.string().valid('New', 'Follow Up', 'Renewal').optional(),
  enquiryStage: Joi.string().valid('Initial', 'Quotation', 'Negotiation', 'Order').optional(),
  source: Joi.string().valid('Website', 'Referral', 'Cold Call', 'Social Media', 'Other').optional(),
  
  // Customer Information
  customerType: Joi.string().valid('Retail', 'Corporate').optional(),
  corporateName: Joi.string().optional().allow(''),
  customerName: Joi.string().optional().trim(),
  alice: Joi.string().optional().trim().allow(''),
  designation: Joi.string().optional().trim().allow(''),
  contactPersonName: Joi.string().optional().trim().allow(''),
  phoneNumber: Joi.string().optional().trim().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  panNumber: Joi.string().optional().trim().allow(''),
  
  // Address Information
  addresses: Joi.array().items(addressSchema).optional(),
  
  // DG Requirements
  kva: Joi.number().integer().positive().optional().messages({
    'number.base': 'KVA must be a number',
    'number.integer': 'KVA must be a whole number',
    'number.positive': 'KVA must be positive'
  }),
  phase: Joi.string().valid('Single Phase', 'Three Phase').optional(),
  quantity: Joi.number().integer().positive().optional().messages({
    'number.base': 'Quantity must be a number',
    'number.integer': 'Quantity must be a whole number',
    'number.positive': 'Quantity must be positive'
  }),
  segment: Joi.string().valid('Manufacturing', 'IT/Office', 'Healthcare', 'Education', 'Retail', 'Other').optional().allow(''),
  subSegment: Joi.string().optional().allow(''),
  dgOwnership: Joi.string().valid('NOT_OWNED', 'OWNED', 'RENTED').optional(),
  financeRequired: Joi.boolean().optional(),
  financeCompany: Joi.string().optional().allow(''),
  
  // Employee Information
  assignedEmployeeCode: Joi.string().optional().allow(''),
  assignedEmployeeName: Joi.string().optional().allow(''),
  employeeStatus: Joi.string().valid('Active', 'Inactive', 'On Leave').optional().allow(''),
  referenceEmployeeName: Joi.string().optional().allow(''),
  referenceEmployeeMobileNumber: Joi.string().optional().allow(''),
  referredBy: Joi.string().optional().allow(''),
  
  // Additional Information
  events: Joi.string().optional().allow(''),
  remarks: Joi.string().optional().allow(''),
  notes: Joi.string().optional().allow(''),
  
  // DG Details
  dgDetails: Joi.array().items(dgDetailsSchema).optional(),
  numberOfDG: Joi.number().integer().min(0).optional(),
  
  // Optional fields from the model
  zone: Joi.string().optional().allow(''),
  areaOffice: Joi.string().optional().allow(''),
  dealer: Joi.string().optional().allow(''),
  branch: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  eoPoDate: Joi.date().optional(),
  plannedFollowUpDate: Joi.date().optional().allow(null),
  sourceFrom: Joi.string().optional().allow(''),
  numberOfFollowUps: Joi.number().integer().min(0).optional(),
  lastFollowUpDate: Joi.date().optional(),
  enquiryClosureDate: Joi.date().optional(),
  customer: Joi.string().optional() // ObjectId reference
}).min(1); // At least one field must be provided for update

// Schema for query parameters (pagination and filtering)
export const getDGEnquiriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  status: Joi.string().valid('Open', 'In Progress', 'Closed', 'Cancelled').optional(),
  customerType: Joi.string().valid('Retail', 'Corporate').optional(),
  segment: Joi.string().optional()
}); 