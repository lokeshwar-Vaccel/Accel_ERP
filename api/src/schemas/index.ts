// User validation schemas
export * from './userSchemas';

// Customer validation schemas
export * from './customerSchemas';

// Product validation schemas
export * from './productSchemas';

// Stock/Inventory validation schemas
export * from './stockSchemas';

// Inventory import validation schemas
export * from './inventorySchemas';

// Service ticket validation schemas
export * from './serviceSchemas';

// AMC validation schemas
export * from './amcSchemas';

// Purchase order validation schemas
export * from './purchaseOrderSchemas';

// Report and analytics validation schemas
export * from './reportSchemas';

// Common validation utilities
import Joi from 'joi';

// Common MongoDB ObjectId validation
export const objectIdSchema = Joi.string().hex().length(24);

// Common pagination schema
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().allow('')
});

// Common date range schema
export const dateRangeSchema = Joi.object({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().greater(Joi.ref('from')).required()
});

// File upload schema
export const fileUploadSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  mimetype: Joi.string().valid(
    'image/jpeg',
    'image/png', 
    'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ).required(),
  size: Joi.number().max(10 * 1024 * 1024) // 10MB max
});

// Address schema (reusable)
export const addressSchema = Joi.object({
  street: Joi.string().max(200).required(),
  city: Joi.string().max(100).required(),
  state: Joi.string().max(100),
  zipCode: Joi.string().max(20),
  country: Joi.string().max(100).required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90),
    longitude: Joi.number().min(-180).max(180)
  })
});

// Contact information schema (reusable)
export const contactInfoSchema = Joi.object({
  name: Joi.string().max(100).required(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  designation: Joi.string().max(100)
});

// Notification preferences schema
export const notificationPreferencesSchema = Joi.object({
  email: Joi.boolean().default(true),
  sms: Joi.boolean().default(false),
  whatsapp: Joi.boolean().default(false),
  push: Joi.boolean().default(true),
  frequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly').default('immediate'),
  categories: Joi.array().items(
    Joi.string().valid(
      'service_updates',
      'amc_reminders',
      'inventory_alerts',
      'system_notifications',
      'reports'
    )
  ).default(['service_updates', 'system_notifications'])
});

// System configuration schema
export const systemConfigSchema = Joi.object({
  general: Joi.object({
    companyName: Joi.string().max(200).required(),
    companyAddress: addressSchema,
    contactInfo: contactInfoSchema,
    timezone: Joi.string().default('Asia/Kolkata'),
    currency: Joi.string().length(3).default('INR'),
    dateFormat: Joi.string().valid('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD').default('DD/MM/YYYY'),
    timeFormat: Joi.string().valid('12h', '24h').default('12h')
  }),
  sla: Joi.object({
    defaultResponseTime: Joi.number().integer().min(1).default(24), // hours
    defaultResolutionTime: Joi.number().integer().min(1).default(72), // hours
    priorities: Joi.object({
      low: Joi.object({
        responseTime: Joi.number().integer().min(1).default(48),
        resolutionTime: Joi.number().integer().min(1).default(168) // 1 week
      }),
      medium: Joi.object({
        responseTime: Joi.number().integer().min(1).default(24),
        resolutionTime: Joi.number().integer().min(1).default(72)
      }),
      high: Joi.object({
        responseTime: Joi.number().integer().min(1).default(8),
        resolutionTime: Joi.number().integer().min(1).default(24)
      }),
      critical: Joi.object({
        responseTime: Joi.number().integer().min(1).default(2),
        resolutionTime: Joi.number().integer().min(1).default(8)
      })
    })
  }),
  inventory: Joi.object({
    enableLowStockAlerts: Joi.boolean().default(true),
    defaultLowStockThreshold: Joi.number().integer().min(0).default(10),
    enableSerialTracking: Joi.boolean().default(true),
    enableBatchTracking: Joi.boolean().default(false),
    autoGenerateProductCodes: Joi.boolean().default(true)
  }),
  notifications: Joi.object({
    email: Joi.object({
      enabled: Joi.boolean().default(true),
      smtpHost: Joi.string(),
      smtpPort: Joi.number().integer().min(1).max(65535),
      smtpUser: Joi.string(),
      smtpPassword: Joi.string(),
      fromAddress: Joi.string().email(),
      fromName: Joi.string()
    }),
    sms: Joi.object({
      enabled: Joi.boolean().default(false),
      provider: Joi.string().valid('twilio', 'aws_sns', 'custom'),
      apiKey: Joi.string(),
      apiSecret: Joi.string(),
      fromNumber: Joi.string()
    }),
    whatsapp: Joi.object({
      enabled: Joi.boolean().default(false),
      provider: Joi.string().valid('twilio', 'whatsapp_business', 'custom'),
      apiKey: Joi.string(),
      phoneNumberId: Joi.string()
    })
  })
});

// API response schemas
export const successResponseSchema = Joi.object({
  success: Joi.boolean().valid(true).required(),
  message: Joi.string(),
  data: Joi.any(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1),
    total: Joi.number().integer().min(0),
    pages: Joi.number().integer().min(0)
  })
});

export const errorResponseSchema = Joi.object({
  success: Joi.boolean().valid(false).required(),
  message: Joi.string().required(),
  error: Joi.object({
    code: Joi.string(),
    details: Joi.any()
  }),
  stack: Joi.string() // Only in development
}); 

// Company validation schema
export const companySchema = Joi.object({
  companyName: Joi.string().max(200).required(),
  companyAddress: addressSchema.required(),
  companyPan: Joi.string().max(20),
  companyBankDetails: Joi.object({
    accountNumber: Joi.string().max(30),
    ifsc: Joi.string().max(20),
    bankName: Joi.string().max(100),
    branch: Joi.string().max(100)
  }),
  contactInfo: contactInfoSchema,
}); 

// DG Quotation validation schemas
export * from './dgQuotationSchemas';

// DG Purchase Order validation schemas
export * from './dgPurchaseOrderSchemas';

// DG Enquiry import schema (stub)
export const dgEnquiryImportSchema = Joi.object({
  zone: Joi.string().allow('').optional(),
  state: Joi.string().allow('').optional(),
  areaOffice: Joi.string().allow('').optional(),
  dealer: Joi.string().allow('').optional(),
  branch: Joi.string().allow('').optional(),
  location: Joi.string().allow('').optional(),
  assignedEmployeeCode: Joi.string().allow('').optional(),
  assignedEmployeeName: Joi.string().allow('').optional(),
  employeeStatus: Joi.string().allow('').optional(),
  enquiryNo: Joi.string().required(),
  enquiryDate: Joi.date().optional(),
  customerType: Joi.string().allow('').optional(),
  corporateName: Joi.string().allow('').optional(),
  customerName: Joi.string().allow('').optional(),
  phoneNumber: Joi.string().allow('').optional(),
  email: Joi.string().email().allow('').optional(),
  address: Joi.string().allow('').optional(),
  pinCode: Joi.string().allow('').optional(),
  tehsil: Joi.string().allow('').optional(),
  district: Joi.string().allow('').optional(),
  kva: Joi.string().allow('').optional(),
  phase: Joi.string().allow('').optional(),
  quantity: Joi.number().optional(),
  remarks: Joi.string().allow('').optional(),
  enquiryStatus: Joi.string().allow('').optional(),
  enquiryType: Joi.string().allow('').optional(),
  enquiryStage: Joi.string().allow('').optional(),
  eoPoDate: Joi.date().optional(),
  plannedFollowUpDate: Joi.date().optional(),
  source: Joi.string().allow('').optional(),
  referenceEmployeeName: Joi.string().allow('').optional(),
  referenceEmployeeMobileNumber: Joi.string().allow('').optional(),
  sourceFrom: Joi.string().allow('').optional(),
  events: Joi.string().allow('').optional(),
  numberOfFollowUps: Joi.number().optional(),
  segment: Joi.string().allow('').optional(),
  subSegment: Joi.string().allow('').optional(),
  dgOwnership: Joi.string().allow('').optional(),
  createdBy: Joi.string().allow('').optional(),
  panNumber: Joi.string().allow('').optional(),
  lastFollowUpDate: Joi.date().optional(),
  enquiryClosureDate: Joi.date().optional(),
  financeRequired: Joi.string().allow('').optional(),
  financeCompany: Joi.string().allow('').optional(),
  referredBy: Joi.string().allow('').optional()
}); 