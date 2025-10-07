import Joi from 'joi';

// EV Customer validation schema
export const createEVCustomerSchema = Joi.object({
  customer: Joi.object({
    bookingReference: Joi.string().trim().required().messages({
      'string.empty': 'Booking reference is required',
      'any.required': 'Booking reference is required'
    }),
    customerName: Joi.string().trim().required().messages({
      'string.empty': 'Customer name is required',
      'any.required': 'Customer name is required'
    }),
    contactNumber: Joi.number().integer().positive().required().messages({
      'number.base': 'Contact number must be a valid number',
      'number.integer': 'Contact number must be an integer',
      'number.positive': 'Contact number must be positive',
      'any.required': 'Contact number is required'
    }),
    location: Joi.string().trim().required().messages({
      'string.empty': 'Location is required',
      'any.required': 'Location is required'
    }),
    address: Joi.string().trim().required().messages({
      'string.empty': 'Address is required',
      'any.required': 'Address is required'
    }),
    vehicleModel: Joi.string().trim().required().messages({
      'string.empty': 'Vehicle model is required',
      'any.required': 'Vehicle model is required'
    }),
    automobileDealerName: Joi.string().trim().required().messages({
      'string.empty': 'Automobile dealer name is required',
      'any.required': 'Automobile dealer name is required'
    })
  }).required(),
  serviceRequest: Joi.object({
    serviceRequestNumber: Joi.string().trim().required().messages({
      'string.empty': 'Service request number is required',
      'any.required': 'Service request number is required'
    }),
    serviceType: Joi.string().trim().required().messages({
      'string.empty': 'Service type is required',
      'any.required': 'Service type is required'
    }),
    requestedDate: Joi.date().iso().messages({
      'date.base': 'Requested date must be a valid date',
      'date.format': 'Requested date must be in ISO format'
    }),
    completedDate: Joi.date().iso().messages({
      'date.base': 'Completed date must be a valid date',
      'date.format': 'Completed date must be in ISO format'
    }),
    serviceEngineerName1: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 1 cannot be empty'
    }),
    serviceEngineerName2: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 2 cannot be empty'
    }),
    serviceEngineerName3: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 3 cannot be empty'
    }),
    additionalMcb: Joi.boolean().default(false).messages({
      'boolean.base': 'Additional MCB must be a boolean value'
    }),
    cableLength: Joi.alternatives().try(Joi.number().positive(), Joi.string().allow(''), Joi.allow(null)).messages({
      'number.base': 'Cable length must be a valid number',
      'number.positive': 'Cable length must be positive'
    }),
    actualCableLength: Joi.alternatives().try(Joi.number().positive(), Joi.string().allow(''), Joi.allow(null)).messages({
      'number.base': 'Actual cable length must be a valid number',
      'number.positive': 'Actual cable length must be positive'
    }),
    chargerSerialNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger serial number cannot be empty'
    }),
    chargerID: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger ID cannot be empty'
    }),
    chargerRating: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger rating cannot be empty'
    }),
    VINNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'VIN number cannot be empty'
    }),
    DBSerialNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'DB serial number cannot be empty'
    }),
    scope: Joi.string().valid('in scope', 'out scope').messages({
      'any.only': 'Scope must be either "in scope" or "out scope"'
    }),
    serviceRequestStatus: Joi.string().valid('open', 'pending', 'resolved', 'closed').default('open').messages({
      'any.only': 'Service request status must be one of: open, pending, resolved, closed'
    })
  }).required()
});

// Import EV Customer validation schema (all fields optional for Excel upload)
export const importEVCustomerSchema = Joi.object({
  customer: Joi.object({
    bookingReference: Joi.string().trim().allow('').messages({
      'string.empty': 'Booking reference cannot be empty'
    }),
    customerName: Joi.string().trim().allow('').messages({
      'string.empty': 'Customer name cannot be empty'
    }),
    contactNumber: Joi.alternatives().try(
      Joi.number().integer().positive(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).messages({
      'alternatives.match': 'Contact number must be a valid number'
    }),
    location: Joi.string().trim().allow('').messages({
      'string.empty': 'Location cannot be empty'
    }),
    address: Joi.string().trim().allow('').messages({
      'string.empty': 'Address cannot be empty'
    }),
    vehicleModel: Joi.string().trim().allow('').messages({
      'string.empty': 'Vehicle model cannot be empty'
    }),
    automobileDealerName: Joi.string().trim().allow('').messages({
      'string.empty': 'Automobile dealer name cannot be empty'
    })
  }),
  serviceRequest: Joi.object({
    serviceRequestNumber: Joi.string().trim().allow('').messages({
      'string.empty': 'Service request number cannot be empty'
    }),
    serviceType: Joi.string().trim().allow('').messages({
      'string.empty': 'Service type cannot be empty'
    }),
    requestedDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).messages({
      'alternatives.match': 'Requested date must be a valid date'
    }),
    completedDate: Joi.alternatives().try(
      Joi.date(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).messages({
      'alternatives.match': 'Completed date must be a valid date'
    }),
    serviceEngineerName1: Joi.string().trim().allow('').messages({
      'string.empty': 'Service engineer name 1 cannot be empty'
    }),
    serviceEngineerName2: Joi.string().trim().allow('').messages({
      'string.empty': 'Service engineer name 2 cannot be empty'
    }),
    serviceEngineerName3: Joi.string().trim().allow('').messages({
      'string.empty': 'Service engineer name 3 cannot be empty'
    }),
    additionalMcb: Joi.boolean().allow(null).messages({
      'boolean.base': 'Additional MCB must be a boolean value'
    }),
    cableLength: Joi.alternatives().try(
      Joi.number().positive(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).messages({
      'alternatives.match': 'Cable length must be a valid number'
    }),
    actualCableLength: Joi.alternatives().try(
      Joi.number().positive(),
      Joi.string().allow(''),
      Joi.allow(null)
    ).messages({
      'alternatives.match': 'Actual cable length must be a valid number'
    }),
    chargerSerialNumber: Joi.string().trim().allow('').messages({
      'string.empty': 'Charger serial number cannot be empty'
    }),
    chargerID: Joi.string().trim().allow('').messages({
      'string.empty': 'Charger ID cannot be empty'
    }),
    chargerRating: Joi.string().trim().allow('').messages({
      'string.empty': 'Charger rating cannot be empty'
    }),
    VINNumber: Joi.string().trim().allow('').messages({
      'string.empty': 'VIN number cannot be empty'
    }),
    DBSerialNumber: Joi.string().trim().allow('').messages({
      'string.empty': 'DB serial number cannot be empty'
    }),
    scope: Joi.string().valid('in scope', 'out scope').default('in scope').messages({
      'any.only': 'Scope must be either "in scope" or "out scope"'
    }),
    serviceRequestStatus: Joi.string().valid('open', 'pending', 'resolved', 'closed').default('open').messages({
      'any.only': 'Service request status must be one of: open, pending, resolved, closed'
    })
  })
});

// Update EV Customer validation schema (all fields optional)
export const updateEVCustomerSchema = Joi.object({
  customer: Joi.object({
    bookingReference: Joi.string().trim().messages({
      'string.empty': 'Booking reference cannot be empty'
    }),
    customerName: Joi.string().trim().messages({
      'string.empty': 'Customer name cannot be empty'
    }),
    contactNumber: Joi.number().integer().positive().messages({
      'number.base': 'Contact number must be a valid number',
      'number.integer': 'Contact number must be an integer',
      'number.positive': 'Contact number must be positive'
    }),
    location: Joi.string().trim().messages({
      'string.empty': 'Location cannot be empty'
    }),
    address: Joi.string().trim().messages({
      'string.empty': 'Address cannot be empty'
    }),
    vehicleModel: Joi.string().trim().messages({
      'string.empty': 'Vehicle model cannot be empty'
    }),
    automobileDealerName: Joi.string().trim().messages({
      'string.empty': 'Automobile dealer name cannot be empty'
    })
  }),
  serviceRequest: Joi.object({
    serviceRequestNumber: Joi.string().trim().messages({
      'string.empty': 'Service request number cannot be empty'
    }),
    serviceType: Joi.string().trim().messages({
      'string.empty': 'Service type cannot be empty'
    }),
    requestedDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow(''), Joi.allow(null)).messages({
      'date.base': 'Requested date must be a valid date',
      'date.format': 'Requested date must be in ISO format'
    }),
    completedDate: Joi.alternatives().try(Joi.date().iso(), Joi.string().allow(''), Joi.allow(null)).messages({
      'date.base': 'Completed date must be a valid date',
      'date.format': 'Completed date must be in ISO format'
    }),
    serviceEngineerName1: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 1 cannot be empty'
    }),
    serviceEngineerName2: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 2 cannot be empty'
    }),
    serviceEngineerName3: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Service engineer name 3 cannot be empty'
    }),
    additionalMcb: Joi.boolean().messages({
      'boolean.base': 'Additional MCB must be a boolean value'
    }),
    cableLength: Joi.alternatives().try(Joi.number().positive(), Joi.string().allow(''), Joi.allow(null)).messages({
      'number.base': 'Cable length must be a valid number',
      'number.positive': 'Cable length must be positive'
    }),
    actualCableLength: Joi.alternatives().try(Joi.number().positive(), Joi.string().allow(''), Joi.allow(null)).messages({
      'number.base': 'Actual cable length must be a valid number',
      'number.positive': 'Actual cable length must be positive'
    }),
    chargerSerialNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger serial number cannot be empty'
    }),
    chargerID: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger ID cannot be empty'
    }),
    chargerRating: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'Charger rating cannot be empty'
    }),
    VINNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'VIN number cannot be empty'
    }),
    DBSerialNumber: Joi.string().trim().allow('', null).optional().messages({
      'string.empty': 'DB serial number cannot be empty'
    }),
    scope: Joi.string().valid('in scope', 'out scope').messages({
      'any.only': 'Scope must be either "in scope" or "out scope"'
    }),
    serviceRequestStatus: Joi.string().valid('open', 'pending', 'resolved', 'closed').messages({
      'any.only': 'Service request status must be one of: open, pending, resolved, closed'
    })
  })
});

// TypeScript interfaces for validation results
export interface CreateEVCustomerInput {
  customer: {
    bookingReference: string;
    customerName: string;
    contactNumber: number;
    location: string;
    address: string;
    vehicleModel: string;
    automobileDealerName: string;
  };
  serviceRequest: {
    serviceRequestNumber: string;
    serviceType: string;
    surveyPlannedDate: Date;
    surveyCompletedDate: Date;
    installationPlannedDate: Date;
    installationCompletedDate: Date;
    commissionPlannedDate: Date;
    commissionCompletedDate: Date;
    serviceEngineerName1: string;
    serviceEngineerName2: string;
    serviceEngineerName3: string;
    additionalMcb?: boolean;
    cableLength: number;
    actualCableLength: number;
    chargerSerialNumber: string;
    chargerID: string;
    chargerRating: string;
    VINNumber: string;
    DBSerialNumber: string;
    scope?: 'in scope' | 'out scope';
    serviceRequestStatus?: 'open' | 'pending' | 'resolved' | 'closed';
  };
}

export interface UpdateEVCustomerInput {
  customer?: {
    bookingReference?: string;
    customerName?: string;
    contactNumber?: number;
    location?: string;
    address?: string;
    vehicleModel?: string;
    automobileDealerName?: string;
  };
  serviceRequest?: {
    serviceRequestNumber?: string;
    serviceType?: string;
    surveyPlannedDate?: Date;
    surveyCompletedDate?: Date;
    installationPlannedDate?: Date;
    installationCompletedDate?: Date;
    commissionPlannedDate?: Date;
    commissionCompletedDate?: Date;
    serviceEngineerName1?: string;
    serviceEngineerName2?: string;
    serviceEngineerName3?: string;
    additionalMcb?: boolean;
    cableLength?: number;
    actualCableLength?: number;
    chargerSerialNumber?: string;
    chargerID?: string;
    chargerRating?: string;
    VINNumber?: string;
    DBSerialNumber?: string;
    scope?: 'in scope' | 'out scope';
    serviceRequestStatus?: 'open' | 'pending' | 'resolved' | 'closed';
  };
}

// Import EV Customer input interface (all fields optional)
export interface ImportEVCustomerInput {
  customer?: {
    bookingReference?: string;
    customerName?: string;
    contactNumber?: number | null;
    location?: string;
    address?: string;
    vehicleModel?: string;
    automobileDealerName?: string;
  };
  serviceRequest?: {
    serviceRequestNumber?: string;
    serviceType?: string;
    requestedDate?: Date | null;
    completedDate?: Date | null;
    serviceEngineerName1?: string;
    serviceEngineerName2?: string;
    serviceEngineerName3?: string;
    additionalMcb?: boolean | null;
    cableLength?: number | null;
    actualCableLength?: number | null;
    chargerSerialNumber?: string;
    chargerID?: string;
    chargerRating?: string;
    VINNumber?: string;
    DBSerialNumber?: string;
    scope?: 'in scope' | 'out scope';
    serviceRequestStatus?: 'open' | 'pending' | 'resolved' | 'closed';
  };
}
