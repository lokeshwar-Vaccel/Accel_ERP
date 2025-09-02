import Joi from 'joi';
import { AMCStatus } from '../types';

// TypeScript interfaces for validation results
export interface CreateAMCInput {
  customer: string;
  // New fields as per client requirements
  customerAddress: string;
  contactPersonName: string;
  contactNumber: string;
  engineSerialNumber: string;
  engineModel: string;
  kva: number;
  dgMake: string;
  dateOfCommissioning: string;
  amcStartDate: string;
  amcEndDate: string;
  amcType: 'AMC' | 'CAMC';
  numberOfVisits: number;
  numberOfOilServices: number;
  status?: AMCStatus;
  // Legacy fields (keeping for backward compatibility)
  products?: string[];
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  scheduledVisits?: number;
  terms?: string;
  contractType?: 'comprehensive' | 'breakdown' | 'preventive' | 'labor_only';
  paymentTerms?: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
  renewalOption?: boolean;
  contactPerson?: string;
  contactPhone?: string;
  billingAddress?: string;
  serviceLocation?: {
    address: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    accessInstructions?: string;
  };
  inclusions?: {
    service: string;
    description?: string;
    frequency?: string;
  }[];
  exclusions?: string[];
  discount?: {
    type?: 'percentage' | 'fixed';
    value?: number;
    reason?: string;
  };
}

export interface UpdateAMCInput {
  // New fields as per client requirements
  customerAddress?: string;
  contactPersonName?: string;
  contactNumber?: string;
  engineSerialNumber?: string;
  engineModel?: string;
  kva?: number;
  dgMake?: string;
  dateOfCommissioning?: string;
  amcStartDate?: string;
  amcEndDate?: string;
  amcType?: 'AMC' | 'CAMC';
  numberOfVisits?: number;
  numberOfOilServices?: number;
  // Legacy fields (keeping for backward compatibility)
  products?: string[];
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  scheduledVisits?: number;
  status?: AMCStatus;
  terms?: string;
  contractType?: 'comprehensive' | 'breakdown' | 'preventive' | 'labor_only';
  paymentTerms?: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
  renewalOption?: boolean;
  contactPerson?: string;
  contactPhone?: string;
  billingAddress?: string;
  discount?: {
    type?: 'percentage' | 'fixed';
    value?: number;
    reason?: string;
  };
}

export interface CompleteVisitInput {
  completedDate: string;
  serviceReport: string;
  issues?: {
    description: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    resolved?: boolean;
    followUpRequired?: boolean;
  }[];
  customerSignature?: string;
  nextVisitRecommendations?: string;
  visitIndex?: number;
  images?: {
    url: string;
    description?: string;
    type?: 'before' | 'during' | 'after' | 'issue';
  }[];
}

export interface ScheduleVisitInput {
  scheduledDate: string;
  assignedTo: string;
  visitType?: 'routine' | 'breakdown' | 'inspection' | 'emergency';
  requiredTools?: string[];
  customerNotified?: boolean;
}

export interface RescheduleVisitInput {
  visitId: string;
  newScheduledDate: string;
  rescheduleReason: 'customer_request' | 'technician_unavailable' | 'weather' | 'equipment_unavailable' | 'emergency' | 'other';
  notes?: string;
  customerNotified?: boolean;
}

export interface RenewAMCInput {
  newStartDate: string;
  newEndDate: string;
  newContractValue: number;
  newScheduledVisits: number;
  priceAdjustment?: {
    type?: 'percentage' | 'fixed';
    value?: number;
    reason?: string;
  };
  updatedTerms?: string;
  addProducts?: string[];
  removeProducts?: string[];
  autoRenewal?: boolean;
}

export interface AMCQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: AMCStatus;
  customer?: string;
  contractType?: 'comprehensive' | 'breakdown' | 'preventive' | 'labor_only';
  expiringIn?: number;
  startDateFrom?: string;
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  valueMin?: number;
  valueMax?: number;
  upcomingVisits?: boolean;
  overdueVisits?: boolean;
  scheduledDate?: string; // For filtering AMCs by visit date
}

export interface AMCNotificationInput {
  expiryReminder?: {
    enabled?: boolean;
    daysBefore?: number[];
    recipients: string[];
  };
  visitReminder?: {
    enabled?: boolean;
    daysBefore?: number[];
    recipients: string[];
  };
  overdueReminder?: {
    enabled?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
  };
}

export interface AMCReportInput {
  reportType: 'contract_summary' | 'revenue_analysis' | 'visit_completion' | 'customer_satisfaction' | 'expiring_contracts';
  dateFrom: string;
  dateTo: string;
  customer?: string;
  status?: AMCStatus;
  contractType?: 'comprehensive' | 'breakdown' | 'preventive' | 'labor_only';
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface BulkAMCOperationInput {
  amcIds: string[];
  operation: 'activate' | 'suspend' | 'cancel' | 'extend' | 'update_status';
  parameters?: {
    extensionDays?: number;
    newStatus?: AMCStatus;
  };
  reason: string;
  notifyCustomers?: boolean;
}

export interface AMCImportInput {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  productNames: string | string[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  contractType?: 'comprehensive' | 'breakdown' | 'preventive' | 'labor_only';
  paymentTerms?: 'annual' | 'semi_annual' | 'quarterly' | 'monthly';
}

// Base AMC fields
const baseAMCFields = {
  customer: Joi.string().hex().length(24),
  // New fields as per client requirements
  customerAddress: Joi.string().max(500).trim(),
  contactPersonName: Joi.string().max(100).trim(),
  contactNumber: Joi.string().max(20).trim(),
  engineSerialNumber: Joi.string().max(100).trim(),
  engineModel: Joi.string().max(100).trim(),
  kva: Joi.number().min(0).precision(2),
  dgMake: Joi.string().max(100).trim(),
  dateOfCommissioning: Joi.date().iso(),
  amcStartDate: Joi.date().iso(),
  amcEndDate: Joi.date().iso(),
  amcType: Joi.string().valid('AMC', 'CAMC'),
  numberOfVisits: Joi.number().integer().min(1),
  numberOfOilServices: Joi.number().integer().min(0),
  status: Joi.string().valid(...Object.values(AMCStatus)),
  // Legacy fields (keeping for backward compatibility)
  products: Joi.array().items(Joi.string().hex().length(24)),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  contractValue: Joi.number().min(0).precision(2),
  scheduledVisits: Joi.number().integer().min(1),
  completedVisits: Joi.number().integer().min(0),
  nextVisitDate: Joi.date().iso(),
  terms: Joi.string().max(5000).allow(''),
  contractType: Joi.string().valid('comprehensive', 'breakdown', 'preventive', 'labor_only'),
  paymentTerms: Joi.string().valid('annual', 'semi_annual', 'quarterly', 'monthly'),
  renewalOption: Joi.boolean()
};

// Create AMC schema
export const createAMCSchema = Joi.object<CreateAMCInput>({
  customer: baseAMCFields.customer.required(),
  // New required fields as per client requirements
  customerAddress: baseAMCFields.customerAddress.required(),
  contactPersonName: baseAMCFields.contactPersonName.required(),
  contactNumber: baseAMCFields.contactNumber.required(),
  engineSerialNumber: baseAMCFields.engineSerialNumber.required(),
  engineModel: baseAMCFields.engineModel.required(),
  kva: baseAMCFields.kva.required(),
  dgMake: baseAMCFields.dgMake.required(),
  dateOfCommissioning: baseAMCFields.dateOfCommissioning.required(),
  amcStartDate: baseAMCFields.amcStartDate.required(),
  amcEndDate: baseAMCFields.amcEndDate.greater(Joi.ref('amcStartDate')).required(),
  amcType: baseAMCFields.amcType.required(),
  numberOfVisits: baseAMCFields.numberOfVisits.required(),
  numberOfOilServices: baseAMCFields.numberOfOilServices.required(),
  status: Joi.string().valid(...Object.values(AMCStatus)).default('active'),
  // Legacy fields (optional for backward compatibility)
  products: baseAMCFields.products,
  startDate: baseAMCFields.startDate,
  endDate: baseAMCFields.endDate,
  contractValue: baseAMCFields.contractValue,
  scheduledVisits: baseAMCFields.scheduledVisits,
  terms: baseAMCFields.terms,
  contractType: baseAMCFields.contractType.default('comprehensive'),
  paymentTerms: baseAMCFields.paymentTerms.default('annual'),
  renewalOption: baseAMCFields.renewalOption.default(true),
  contactPerson: Joi.string().max(100),
  contactPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  billingAddress: Joi.string().max(500),
  serviceLocation: Joi.object({
    address: Joi.string().max(500).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }),
    accessInstructions: Joi.string().max(500)
  }),
  inclusions: Joi.array().items(
    Joi.object({
      service: Joi.string().max(200).required(),
      description: Joi.string().max(500),
      frequency: Joi.string().max(100) // e.g., "Monthly", "Quarterly"
    })
  ),
  exclusions: Joi.array().items(Joi.string().max(200)),
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0),
    reason: Joi.string().max(200)
  })
});

// Update AMC schema
export const updateAMCSchema = Joi.object<UpdateAMCInput>({
  // New fields as per client requirements (all optional for updates)
  customerAddress: baseAMCFields.customerAddress,
  contactPersonName: baseAMCFields.contactPersonName,
  contactNumber: baseAMCFields.contactNumber,
  engineSerialNumber: baseAMCFields.engineSerialNumber,
  engineModel: baseAMCFields.engineModel,
  kva: baseAMCFields.kva,
  dgMake: baseAMCFields.dgMake,
  dateOfCommissioning: baseAMCFields.dateOfCommissioning,
  amcStartDate: baseAMCFields.amcStartDate,
  amcEndDate: baseAMCFields.amcEndDate,
  amcType: baseAMCFields.amcType,
  numberOfVisits: baseAMCFields.numberOfVisits,
  numberOfOilServices: baseAMCFields.numberOfOilServices,
  // Legacy fields (keeping for backward compatibility)
  products: baseAMCFields.products,
  startDate: baseAMCFields.startDate,
  endDate: baseAMCFields.endDate,
  contractValue: baseAMCFields.contractValue,
  scheduledVisits: baseAMCFields.scheduledVisits,
  status: baseAMCFields.status,
  terms: baseAMCFields.terms,
  contractType: baseAMCFields.contractType,
  paymentTerms: baseAMCFields.paymentTerms,
  renewalOption: baseAMCFields.renewalOption,
  contactPerson: Joi.string().max(100),
  contactPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  billingAddress: Joi.string().max(500),
  discount: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number().min(0),
    reason: Joi.string().max(200)
  })
});

// Visit completion schema
export const completeVisitSchema = Joi.object<CompleteVisitInput>({
  completedDate: Joi.date().iso().required(),
  serviceReport: Joi.string().max(2000).required(),
  issues: Joi.array().items(
    Joi.object({
      description: Joi.string().max(500).required(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical'),
      resolved: Joi.boolean().default(false),
      followUpRequired: Joi.boolean().default(false)
    })
  ),
  customerSignature: Joi.string().max(10000).allow('').optional(), // Base64 encoded - made optional and allow empty
  nextVisitRecommendations: Joi.string().max(1000).optional(),
  visitIndex: Joi.number().integer().min(0).optional(), // Add visit index for fallback identification
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri(),
      description: Joi.string().max(200),
      type: Joi.string().valid('before', 'during', 'after', 'issue')
    })
  ).max(20).optional()
});

// Schedule visit schema
export const scheduleVisitSchema = Joi.object<ScheduleVisitInput>({
  scheduledDate: Joi.date().iso().greater('now').required(),
  assignedTo: Joi.string().hex().length(24).required(),
  visitType: Joi.string().valid('routine', 'breakdown', 'inspection', 'emergency').default('routine'),
  requiredTools: Joi.array().items(Joi.string().max(100)),
  customerNotified: Joi.boolean().default(false)
});

// Bulk schedule visits schema
export const scheduleVisitsBulkSchema = Joi.object({
  visits: Joi.array().items(
    Joi.object({
      scheduledDate: Joi.date().iso().required(),
      assignedTo: Joi.string().hex().length(24).required(),
      visitType: Joi.string().valid('routine', 'breakdown', 'inspection', 'emergency').default('routine')
    })
  ).min(1).required()
});

// Reschedule visit schema
export const rescheduleVisitSchema = Joi.object<RescheduleVisitInput>({
  visitId: Joi.string().hex().length(24).required(),
  newScheduledDate: Joi.date().iso().greater('now').required(),
  rescheduleReason: Joi.string().valid(
    'customer_request',
    'technician_unavailable', 
    'weather',
    'equipment_unavailable',
    'emergency',
    'other'
  ).required(),
  notes: Joi.string().max(500),
  customerNotified: Joi.boolean().default(false)
});

// AMC renewal schema
export const renewAMCSchema = Joi.object<RenewAMCInput>({
  newStartDate: baseAMCFields.startDate.required(),
  newEndDate: baseAMCFields.endDate.greater(Joi.ref('newStartDate')).required(),
  newContractValue: baseAMCFields.contractValue.required(),
  newScheduledVisits: baseAMCFields.scheduledVisits.required(),
  priceAdjustment: Joi.object({
    type: Joi.string().valid('percentage', 'fixed'),
    value: Joi.number(),
    reason: Joi.string().max(200)
  }),
  updatedTerms: Joi.string().max(5000),
  addProducts: Joi.array().items(Joi.string().hex().length(24)),
  removeProducts: Joi.array().items(Joi.string().hex().length(24)),
  autoRenewal: Joi.boolean().default(false)
});

// AMC query schema
export const amcQuerySchema = Joi.object<AMCQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  status: Joi.string().valid(...Object.values(AMCStatus)),
  customer: Joi.string().hex().length(24),
  contractType: baseAMCFields.contractType,
  expiringIn: Joi.number().integer().min(1).max(365), // days
  startDateFrom: Joi.date().iso(),
  startDateTo: Joi.date().iso().greater(Joi.ref('startDateFrom')),
  endDateFrom: Joi.date().iso(),
  endDateTo: Joi.date().iso().greater(Joi.ref('endDateFrom')),
  valueMin: Joi.number().min(0),
  valueMax: Joi.number().min(Joi.ref('valueMin')),
  upcomingVisits: Joi.boolean(),
  overdueVisits: Joi.boolean(),
  scheduledDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).description('Date in YYYY-MM-DD format for filtering AMCs by visit date')
});

// AMC notification settings schema
export const amcNotificationSchema = Joi.object<AMCNotificationInput>({
  expiryReminder: Joi.object({
    enabled: Joi.boolean().default(true),
    daysBefore: Joi.array().items(Joi.number().integer().min(1).max(365)).default([30, 15, 7, 1]),
    recipients: Joi.array().items(Joi.string().email()).min(1)
  }),
  visitReminder: Joi.object({
    enabled: Joi.boolean().default(true),
    daysBefore: Joi.array().items(Joi.number().integer().min(1).max(30)).default([7, 3, 1]),
    recipients: Joi.array().items(Joi.string().email()).min(1)
  }),
  overdueReminder: Joi.object({
    enabled: Joi.boolean().default(true),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').default('daily'),
    recipients: Joi.array().items(Joi.string().email()).min(1)
  })
});

// AMC report schema
export const amcReportSchema = Joi.object<AMCReportInput>({
  reportType: Joi.string().valid(
    'contract_summary',
    'revenue_analysis',
    'visit_completion',
    'customer_satisfaction',
    'expiring_contracts'
  ).required(),
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')).required(),
  customer: Joi.string().hex().length(24),
  status: Joi.string().valid(...Object.values(AMCStatus)),
  contractType: baseAMCFields.contractType,
  format: Joi.string().valid('json', 'csv', 'excel', 'pdf').default('json'),
  includeGraphs: Joi.boolean().default(false)
});

// AMC bulk operations schema
export const bulkAMCOperationSchema = Joi.object<BulkAMCOperationInput>({
  amcIds: Joi.array().items(Joi.string().hex().length(24)).min(1).max(100).required(),
  operation: Joi.string().valid('activate', 'suspend', 'cancel', 'extend', 'update_status').required(),
  parameters: Joi.object().when('operation', {
    is: 'extend',
    then: Joi.object({
      extensionDays: Joi.number().integer().min(1).max(365).required()
    }),
    otherwise: Joi.object({
      newStatus: Joi.string().valid(...Object.values(AMCStatus))
    })
  }),
  reason: Joi.string().max(500).required(),
  notifyCustomers: Joi.boolean().default(false)
});

// AMC import schema (CSV/Excel)
export const amcImportSchema = Joi.object<AMCImportInput>({
  customerName: Joi.string().required(),
  customerEmail: Joi.string().email(),
  customerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  productNames: Joi.alternatives().try(
    Joi.string(), // Comma-separated for CSV
    Joi.array().items(Joi.string())
  ).required(),
  startDate: baseAMCFields.startDate.required(),
  endDate: baseAMCFields.endDate.required(),
  contractValue: baseAMCFields.contractValue.required(),
  scheduledVisits: baseAMCFields.scheduledVisits.required(),
  contractType: baseAMCFields.contractType.default('comprehensive'),
  paymentTerms: baseAMCFields.paymentTerms.default('annual')
});

// Bulk AMC import schema
export const bulkAMCImportSchema = Joi.array().items(amcImportSchema).min(1).max(1000); 