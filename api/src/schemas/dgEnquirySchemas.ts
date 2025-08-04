import Joi from 'joi';

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
  customerType: Joi.string().valid('Retail', 'Corporate').required(),
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
  phoneNumber: Joi.string().required().trim().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.empty': 'Phone number is required',
    'any.required': 'Phone number is required',
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  
  // Address Information
  address: Joi.string().required().trim().messages({
    'string.empty': 'Address is required',
    'any.required': 'Address is required'
  }),
  pincode: Joi.string().required().trim().pattern(/^\d{6}$/).messages({
    'string.empty': 'Pincode is required',
    'any.required': 'Pincode is required',
    'string.pattern.base': 'Pincode must be 6 digits'
  }),
  tehsil: Joi.string().optional().allow(''),
  district: Joi.string().required().trim().messages({
    'string.empty': 'District is required',
    'any.required': 'District is required'
  }),
  state: Joi.string().required().trim().messages({
    'string.empty': 'State is required',
    'any.required': 'State is required'
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
  segment: Joi.string().valid('Manufacturing', 'IT/Office', 'Healthcare', 'Education', 'Retail', 'Other').optional(),
  subSegment: Joi.string().optional().allow(''),
  dgOwnership: Joi.string().valid('NOT_OWNED', 'OWNED', 'RENTED').default('NOT_OWNED'),
  financeRequired: Joi.boolean().default(false),
  financeCompany: Joi.when('financeRequired', {
    is: true,
    then: Joi.string().required().trim().messages({
      'string.empty': 'Finance company is required when finance is needed',
      'any.required': 'Finance company is required when finance is needed'
    }),
    otherwise: Joi.string().optional().allow('')
  }),
  
  // Employee Information
  assignedEmployeeCode: Joi.string().optional().allow(''),
  assignedEmployeeName: Joi.string().optional().allow(''),
  employeeStatus: Joi.string().valid('Active', 'Inactive', 'On Leave').optional(),
  referenceEmployeeName: Joi.string().optional().allow(''),
  referenceEmployeeMobileNumber: Joi.string().optional().allow(''),
  referredBy: Joi.string().optional().allow(''),
  
  // Additional Information
  events: Joi.string().optional().allow(''),
  remarks: Joi.string().optional().allow(''),
  
  // Optional fields from the model
  zone: Joi.string().optional().allow(''),
  areaOffice: Joi.string().optional().allow(''),
  dealer: Joi.string().optional().allow(''),
  branch: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  eoPoDate: Joi.date().optional(),
  plannedFollowUpDate: Joi.date().optional(),
  sourceFrom: Joi.string().optional().allow(''),
  numberOfFollowUps: Joi.number().integer().min(0).default(0),
  panNumber: Joi.string().optional().allow(''),
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
  phoneNumber: Joi.string().optional().trim().pattern(/^\+?[1-9]\d{1,14}$/).messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  
  // Address Information
  address: Joi.string().optional().trim(),
  pincode: Joi.string().optional().trim().pattern(/^\d{6}$/).messages({
    'string.pattern.base': 'Pincode must be 6 digits'
  }),
  tehsil: Joi.string().optional().allow(''),
  district: Joi.string().optional().trim(),
  state: Joi.string().optional().trim(),
  
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
  segment: Joi.string().valid('Manufacturing', 'IT/Office', 'Healthcare', 'Education', 'Retail', 'Other').optional(),
  subSegment: Joi.string().optional().allow(''),
  dgOwnership: Joi.string().valid('NOT_OWNED', 'OWNED', 'RENTED').optional(),
  financeRequired: Joi.boolean().optional(),
  financeCompany: Joi.string().optional().allow(''),
  
  // Employee Information
  assignedEmployeeCode: Joi.string().optional().allow(''),
  assignedEmployeeName: Joi.string().optional().allow(''),
  employeeStatus: Joi.string().valid('Active', 'Inactive', 'On Leave').optional(),
  referenceEmployeeName: Joi.string().optional().allow(''),
  referenceEmployeeMobileNumber: Joi.string().optional().allow(''),
  referredBy: Joi.string().optional().allow(''),
  
  // Additional Information
  events: Joi.string().optional().allow(''),
  remarks: Joi.string().optional().allow(''),
  
  // Optional fields from the model
  zone: Joi.string().optional().allow(''),
  areaOffice: Joi.string().optional().allow(''),
  dealer: Joi.string().optional().allow(''),
  branch: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
  eoPoDate: Joi.date().optional(),
  plannedFollowUpDate: Joi.date().optional(),
  sourceFrom: Joi.string().optional().allow(''),
  numberOfFollowUps: Joi.number().integer().min(0).optional(),
  panNumber: Joi.string().optional().allow(''),
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