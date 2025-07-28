import Joi from 'joi';
import { TicketStatus, TicketPriority } from '../types';

// TypeScript interfaces for validation results
export interface CreateServiceTicketInput {
  customer: string;
  product?: string;
  serialNumber?: string;
  description: string;
  priority?: TicketPriority;
  assignedTo?: string;
  scheduledDate?: string;
  serviceType?: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  customerNotes?: string;
  contactPerson?: string;
  contactPhone?: string;
  serviceLocation?: {
    address: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    accessInstructions?: string;
  };
}

export interface UpdateServiceTicketInput {
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedTo?: string;
  scheduledDate?: string;
  serviceReport?: string;
  customerSignature?: string;
  serviceType?: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  serialNumber?: string;
  resolution?: string;
  workDuration?: number;
  customerFeedback?: {
    rating?: number;
    comments?: string;
  };
}

export interface AddPartsUsedInput {
  product: string;
  quantity: number;
  serialNumbers?: string[];
  unitPrice?: number;
  totalPrice?: number;
  warrantyPeriod?: number;
  installationNotes?: string;
}

export interface ServiceTicketQueryInput {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTo?: string;
  customer?: string;
  product?: string;
  serviceType?: string;
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  slaStatus?: 'met' | 'breached' | 'at_risk';
}

export interface AssignServiceInput {
  assignedTo: string;
  scheduledDate: string;
  estimatedDuration?: number;
  priority?: TicketPriority;
  notes?: string;
  requiredSkills?: string[];
  requiredTools?: string[];
}

export interface CompleteServiceInput {
  serviceReport: string;
  resolution: string;
  workDuration: number;
  partsUsed?: AddPartsUsedInput[];
  customerSignature?: string;
  completedDate?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  customerPresent?: boolean;
  workQuality?: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement';
  images?: {
    url: string;
    description?: string;
    type?: 'before' | 'during' | 'after' | 'issue' | 'resolution';
  }[];
}

export interface ServiceFeedbackInput {
  rating: number;
  comments?: string;
  technician_rating?: number;
  timeliness_rating?: number;
  quality_rating?: number;
  wouldRecommend?: boolean;
  improvementSuggestions?: string;
}

export interface EscalateServiceInput {
  escalationReason: 'sla_breach' | 'customer_complaint' | 'technical_difficulty' | 'parts_unavailable' | 'other';
  escalationLevel: 'level1' | 'level2' | 'level3' | 'management';
  escalatedTo: string;
  notes: string;
  priority?: TicketPriority;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

export interface RescheduleServiceInput {
  newScheduledDate: string;
  rescheduleReason: 'customer_request' | 'technician_unavailable' | 'weather' | 'parts_delay' | 'emergency' | 'other';
  notes?: string;
  customerNotified?: boolean;
  compensationOffered?: boolean;
}

export interface ServiceReportTemplateInput {
  name: string;
  description?: string;
  serviceType?: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  template: {
    sections: {
      title: string;
      fields: {
        name: string;
        type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'textarea';
        required?: boolean;
        options?: string[];
      }[];
    }[];
  };
  isActive?: boolean;
}

export interface BulkServiceImportInput {
  customerName: string;
  customerPhone?: string;
  productName?: string;
  serialNumber?: string;
  description: string;
  priority?: TicketPriority;
  serviceType?: 'installation' | 'repair' | 'maintenance' | 'inspection' | 'other';
  scheduledDate?: string;
  assignedTechnician?: string;
}

export interface UpdateServiceStatusInput {
  status: TicketStatus;
}

// Base service ticket fields
const baseServiceTicketFields = {
  customer: Joi.string().hex().length(24),
  product: Joi.string().hex().length(24),
  serialNumber: Joi.string().max(100).trim().allow(''),
  description: Joi.string().max(2000).trim(),
  priority: Joi.string().valid(...Object.values(TicketPriority)),
  status: Joi.string().valid(...Object.values(TicketStatus)),
  assignedTo: Joi.string().hex().length(24),
  scheduledDate: Joi.date().iso(),
  completedDate: Joi.date().iso(),
  serviceReport: Joi.string().max(5000).allow(''),
  customerSignature: Joi.string().max(10000), // Base64 encoded signature
  slaDeadline: Joi.date().iso(),
  urgencyLevel: Joi.string().valid('low', 'medium', 'high', 'critical'),
  serviceType: Joi.string().valid('installation', 'repair', 'maintenance', 'inspection', 'other')
};

// Create service ticket schema
export const createServiceTicketSchema = Joi.object<CreateServiceTicketInput>({
  customer: baseServiceTicketFields.customer.required(),
  product: baseServiceTicketFields.product,
  serialNumber: baseServiceTicketFields.serialNumber,
  description: baseServiceTicketFields.description.required(),
  priority: baseServiceTicketFields.priority.default(TicketPriority.MEDIUM),
  assignedTo: baseServiceTicketFields.assignedTo,
  scheduledDate: baseServiceTicketFields.scheduledDate,
  serviceType: baseServiceTicketFields.serviceType.default('repair'),
  urgencyLevel: baseServiceTicketFields.urgencyLevel,
  customerNotes: Joi.string().max(1000).allow(''),
  contactPerson: Joi.string().max(100),
  contactPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  serviceLocation: Joi.object({
    address: Joi.string().max(500).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180)
    }),
    accessInstructions: Joi.string().max(500)
  })
});

// Update service ticket schema
export const updateServiceTicketSchema = Joi.object<UpdateServiceTicketInput>({
  description: baseServiceTicketFields.description,
  priority: baseServiceTicketFields.priority,
  status: baseServiceTicketFields.status,
  assignedTo: baseServiceTicketFields.assignedTo,
  scheduledDate: baseServiceTicketFields.scheduledDate,
  serviceReport: baseServiceTicketFields.serviceReport,
  customerSignature: baseServiceTicketFields.customerSignature,
  serviceType: baseServiceTicketFields.serviceType,
  urgencyLevel: baseServiceTicketFields.urgencyLevel,
  serialNumber: baseServiceTicketFields.serialNumber,
  resolution: Joi.string().max(2000),
  workDuration: Joi.number().min(0), // in hours
  customerFeedback: Joi.object({
    rating: Joi.number().min(1).max(5),
    comments: Joi.string().max(1000)
  })
});

// Parts used schema
export const addPartsUsedSchema = Joi.object<AddPartsUsedInput>({
  product: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(1).required(),
  serialNumbers: Joi.array().items(Joi.string().max(100)),
  unitPrice: Joi.number().min(0),
  totalPrice: Joi.number().min(0),
  warrantyPeriod: Joi.number().min(0), // in days
  installationNotes: Joi.string().max(500)
});

// Bulk parts addition schema
export const bulkPartsUsedSchema = Joi.array().items(addPartsUsedSchema).min(1).max(50);

// Service ticket query schema
export const serviceTicketQuerySchema = Joi.object<ServiceTicketQueryInput>({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow(''),
  status: Joi.string().valid(...Object.values(TicketStatus)),
  priority: Joi.string().valid(...Object.values(TicketPriority)),
  assignedTo: Joi.string().hex().length(24),
  customer: Joi.string().hex().length(24),
  product: Joi.string().hex().length(24),
  serviceType: Joi.string(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().greater(Joi.ref('dateFrom')),
  overdue: Joi.boolean(),
  slaStatus: Joi.string().valid('met', 'breached', 'at_risk')
});

// Service assignment schema
export const assignServiceSchema = Joi.object<AssignServiceInput>({
  assignedTo: baseServiceTicketFields.assignedTo.required(),
  scheduledDate: baseServiceTicketFields.scheduledDate.required(),
  estimatedDuration: Joi.number().min(0.5).max(24), // in hours
  priority: baseServiceTicketFields.priority,
  notes: Joi.string().max(500).allow(''),
  requiredSkills: Joi.array().items(Joi.string().max(50)),
  requiredTools: Joi.array().items(Joi.string().max(100))
});

// Service completion schema
export const completeServiceSchema = Joi.object<CompleteServiceInput>({
  serviceReport: baseServiceTicketFields.serviceReport.required(),
  resolution: Joi.string().max(2000).required(),
  workDuration: Joi.number().min(0).required(),
  partsUsed: Joi.array().items(addPartsUsedSchema),
  customerSignature: baseServiceTicketFields.customerSignature,
  completedDate: baseServiceTicketFields.completedDate.default(() => new Date()),
  followUpRequired: Joi.boolean().default(false),
  followUpDate: Joi.date().iso(),
  customerPresent: Joi.boolean().default(true),
  workQuality: Joi.string().valid('excellent', 'good', 'satisfactory', 'needs_improvement'),
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri(),
      description: Joi.string().max(200),
      type: Joi.string().valid('before', 'during', 'after', 'issue', 'resolution')
    })
  ).max(20)
});

// Service feedback schema
export const serviceFeedbackSchema = Joi.object<ServiceFeedbackInput>({
  rating: Joi.number().min(1).max(5).required(),
  comments: Joi.string().max(1000),
  technician_rating: Joi.number().min(1).max(5),
  timeliness_rating: Joi.number().min(1).max(5),
  quality_rating: Joi.number().min(1).max(5),
  wouldRecommend: Joi.boolean(),
  improvementSuggestions: Joi.string().max(500)
});

// Service escalation schema
export const escalateServiceSchema = Joi.object<EscalateServiceInput>({
  escalationReason: Joi.string().valid(
    'sla_breach',
    'customer_complaint',
    'technical_difficulty',
    'parts_unavailable',
    'other'
  ).required(),
  escalationLevel: Joi.string().valid('level1', 'level2', 'level3', 'management').required(),
  escalatedTo: Joi.string().hex().length(24).required(),
  notes: Joi.string().max(1000).required(),
  priority: baseServiceTicketFields.priority,
  urgency: Joi.string().valid('low', 'medium', 'high', 'critical')
});

// Service reschedule schema
export const rescheduleServiceSchema = Joi.object<RescheduleServiceInput>({
  newScheduledDate: baseServiceTicketFields.scheduledDate.required(),
  rescheduleReason: Joi.string().valid(
    'customer_request',
    'technician_unavailable',
    'weather',
    'parts_delay',
    'emergency',
    'other'
  ).required(),
  notes: Joi.string().max(500),
  customerNotified: Joi.boolean().default(false),
  compensationOffered: Joi.boolean().default(false)
});

// Service report template schema
export const serviceReportTemplateSchema = Joi.object<ServiceReportTemplateInput>({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500),
  serviceType: baseServiceTicketFields.serviceType,
  template: Joi.object({
    sections: Joi.array().items(
      Joi.object({
        title: Joi.string().max(100).required(),
        fields: Joi.array().items(
          Joi.object({
            name: Joi.string().max(50).required(),
            type: Joi.string().valid('text', 'number', 'boolean', 'date', 'select', 'textarea'),
            required: Joi.boolean().default(false),
            options: Joi.array().items(Joi.string()) // for select fields
          })
        )
      })
    ).required()
  }).required(),
  isActive: Joi.boolean().default(true)
});

// Bulk service import schema
export const bulkServiceImportSchema = Joi.array().items(
  Joi.object<BulkServiceImportInput>({
    customerName: Joi.string().required(),
    customerPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    productName: Joi.string(),
    serialNumber: baseServiceTicketFields.serialNumber,
    description: baseServiceTicketFields.description.required(),
    priority: baseServiceTicketFields.priority.default(TicketPriority.MEDIUM),
    serviceType: baseServiceTicketFields.serviceType.default('repair'),
    scheduledDate: baseServiceTicketFields.scheduledDate,
    assignedTechnician: Joi.string() // Will be looked up by name
  })
).min(1).max(500);

// Update service status schema
export const updateServiceStatusSchema = Joi.object<UpdateServiceStatusInput>({
  status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed', 'cancelled').required()
}); 