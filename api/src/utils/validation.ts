import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from '../errors/AppError';
import { UserRole, UserStatus, CustomerType, LeadStatus, ProductCategory, TicketPriority, TicketStatus, AMCStatus } from '../types';

// Re-export all schemas from the schemas folder
export * from '../schemas';

// User validation schemas
export const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(...Object.values(UserRole)),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(200),
  moduleAccess: Joi.array().items(Joi.string())
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(200)
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required()
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(200),
  role: Joi.string().valid(...Object.values(UserRole)),
  status: Joi.string().valid(...Object.values(UserStatus)),
  moduleAccess: Joi.array().items(Joi.string())
});

// Customer validation schemas
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  // email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('', null),
  address: Joi.string().max(500).required(),
  customerType: Joi.string().valid(...Object.values(CustomerType)).required(),
  leadSource: Joi.string().max(100),
  assignedTo: Joi.string(),
  status: Joi.string().valid(...Object.values(LeadStatus)),
  notes: Joi.string().max(2000)
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  address: Joi.string().max(500),
  customerType: Joi.string().valid(...Object.values(CustomerType)),
  leadSource: Joi.string().max(100),
  assignedTo: Joi.string(),
  status: Joi.string().valid(...Object.values(LeadStatus)),
  notes: Joi.string().max(2000)
});

export const addContactHistorySchema = Joi.object({
  type: Joi.string().valid('call', 'meeting', 'email', 'whatsapp').required(),
  date: Joi.date().required(),
  notes: Joi.string().max(1000).required(),
  followUpDate: Joi.date()
});

// Product validation schemas
export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000),
  category: Joi.string().valid(...Object.values(ProductCategory)).required(),
  brand: Joi.string().max(100),
  model: Joi.string().max(100),
  specifications: Joi.object(),
  price: Joi.number().min(0).required(),
  minStockLevel: Joi.number().min(0).required()
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
  category: Joi.string().valid(...Object.values(ProductCategory)),
  brand: Joi.string().max(100),
  model: Joi.string().max(100),
  specifications: Joi.object(),
  price: Joi.number().min(0),
  minStockLevel: Joi.number().min(0),
  isActive: Joi.boolean()
});

// Stock validation schemas
export const createStockLocationSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  address: Joi.string().max(500).required(),
  type: Joi.string().valid('main_office', 'warehouse', 'service_center').required(),
  // contactPerson: Joi.string().max(100),
  // phone: Joi.string()
});

export const updateStockSchema = Joi.object({
  quantity: Joi.number().min(0).required()
});

export const transferStockSchema = Joi.object({
  fromLocation: Joi.string().required(),
  toLocation: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  notes: Joi.string().max(500)
});

// Service Ticket validation schemas
export const createServiceTicketSchema = Joi.object({
  customer: Joi.string().required(),
  product: Joi.string(),
  serialNumber: Joi.string().max(100),
  description: Joi.string().max(2000).required(),
  priority: Joi.string().valid(...Object.values(TicketPriority)),
  assignedTo: Joi.string(),
  scheduledDate: Joi.date()
});

export const updateServiceTicketSchema = Joi.object({
  description: Joi.string().max(2000),
  priority: Joi.string().valid(...Object.values(TicketPriority)),
  status: Joi.string().valid(...Object.values(TicketStatus)),
  assignedTo: Joi.string(),
  scheduledDate: Joi.date(),
  serviceReport: Joi.string().max(5000),
  customerSignature: Joi.string()
});

export const addPartsUsedSchema = Joi.object({
  product: Joi.string().required(),
  quantity: Joi.number().min(1).required(),
  serialNumbers: Joi.array().items(Joi.string())
});

// AMC validation schemas
export const createAMCSchema = Joi.object({
  customer: Joi.string().required(),
  products: Joi.array().items(Joi.string()).min(1).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  contractValue: Joi.number().min(0).required(),
  scheduledVisits: Joi.number().min(1).required(),
  terms: Joi.string().max(5000)
});

export const updateAMCSchema = Joi.object({
  products: Joi.array().items(Joi.string()).min(1),
  startDate: Joi.date(),
  endDate: Joi.date(),
  contractValue: Joi.number().min(0),
  scheduledVisits: Joi.number().min(1),
  status: Joi.string().valid(...Object.values(AMCStatus)),
  terms: Joi.string().max(5000)
});

export const completeVisitSchema = Joi.object({
  visitId: Joi.string().required(),
  completedDate: Joi.date().required(),
  assignedTo: Joi.string(),
  notes: Joi.string().max(1000)
});

// Purchase Order validation schemas
export const createPurchaseOrderSchema = Joi.object({
  supplier: Joi.string().max(200).required(),
  items: Joi.array().items(Joi.object({
    product: Joi.string().required(),
    quantity: Joi.number().min(1).required(),
    unitPrice: Joi.number().min(0).required()
  })).min(1).required(),
  expectedDeliveryDate: Joi.date()
});

export const updatePurchaseOrderSchema = Joi.object({
  supplier: Joi.string().max(200),
  expectedDeliveryDate: Joi.date(),
  status: Joi.string().valid('draft', 'sent', 'confirmed', 'received', 'cancelled')
});

// Query validation schemas
export const querySchema = Joi.object({
  page: Joi.number().min(1),
  limit: Joi.number().min(1).max(100),
  sort: Joi.string(),
  search: Joi.string(),
  startDate: Joi.date(),
  endDate: Joi.date()
});

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Include all errors
      allowUnknown: false, // Don't allow unknown fields
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');
      
      return next(new AppError(errorMessage, 400));
    }

    // Replace the request property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

// Multiple validation middleware (for validating multiple properties)
export const validateMultiple = (validations: Array<{
  schema: Joi.ObjectSchema;
  property: 'body' | 'query' | 'params';
}>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    for (const validation of validations) {
      const { error, value } = validation.schema.validate(req[validation.property], {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
      });

      if (error) {
        const errorMessages = error.details.map((detail) => detail.message);
        errors.push(...errorMessages);
      } else {
        req[validation.property] = value;
      }
    }

    if (errors.length > 0) {
      return next(new AppError(errors.join(', '), 400));
    }

    next();
  };
};

// Conditional validation middleware
export const validateConditional = (
  condition: (req: Request) => boolean,
  schema: Joi.ObjectSchema,
  property: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!condition(req)) {
      return next();
    }

    return validate(schema, property)(req, res, next);
  };
};

// File validation utility
export const validateFile = (
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize: number = 5 * 1024 * 1024 // 5MB default
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];

    for (const file of files) {
      if (!file) continue;

      if (!allowedTypes.includes(file.mimetype)) {
        return next(new AppError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, 400));
      }

      if (file.size > maxSize) {
        return next(new AppError(`File size too large. Maximum size: ${maxSize / (1024 * 1024)}MB`, 400));
      }
    }

    next();
  };
};

// Array validation helper
export const validateArray = (itemSchema: Joi.Schema, minItems: number = 1, maxItems: number = 100) => {
  return Joi.array().items(itemSchema).min(minItems).max(maxItems);
};

// MongoDB ObjectId validation helper
export const validateObjectId = () => {
  return Joi.string().hex().length(24).messages({
    'string.hex': 'Invalid ObjectId format',
    'string.length': 'ObjectId must be 24 characters long'
  });
};

// Date range validation helper
export const validateDateRange = (fromField: string = 'from', toField: string = 'to') => {
  return Joi.object({
    [fromField]: Joi.date().iso().required(),
    [toField]: Joi.date().iso().greater(Joi.ref(fromField)).required()
  });
};

// Password strength validation
export const validatePassword = () => {
  return Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    });
};

// Email validation with custom domain restrictions
export const validateEmail = (allowedDomains?: string[]) => {
  let emailSchema = Joi.string().email().lowercase();

  if (allowedDomains && allowedDomains.length > 0) {
    const domainPattern = allowedDomains.map(domain => domain.replace('.', '\\.')).join('|');
    emailSchema = emailSchema.pattern(new RegExp(`@(${domainPattern})$`), 'allowed domains');
  }

  return emailSchema;
};

// Phone number validation with country code support
export const validatePhone = (requireCountryCode: boolean = false) => {
  const pattern = requireCountryCode 
    ? /^\+[1-9]\d{1,14}$/ // Must start with + and country code
    : /^\+?[1-9]\d{1,14}$/; // Optional country code

  return Joi.string().pattern(pattern).messages({
    'string.pattern.base': requireCountryCode 
      ? 'Phone number must include country code (e.g., +1234567890)'
      : 'Invalid phone number format'
  });
};

// Custom validation for business rules
export const validateBusinessRule = <T>(
  validator: (value: T) => boolean | Promise<boolean>,
  message: string
) => {
  return Joi.any().external(async (value: T) => {
    const isValid = await validator(value);
    if (!isValid) {
      throw new Error(message);
    }
    return value;
  });
};

// Sanitization helpers
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' '); // Remove extra whitespace
};

export const sanitizeObject = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}; 