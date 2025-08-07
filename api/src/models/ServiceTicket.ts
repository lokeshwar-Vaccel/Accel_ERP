import mongoose, { Schema, Document } from 'mongoose';
import { TicketStatus, TicketPriority } from '../types';

// Simple interface for parts used
interface IPartUsedSchema {
  product: mongoose.Types.ObjectId;
  quantity: number;
  serialNumbers?: string[];
}

// Main service ticket interface with standardized fields
interface IServiceTicketSchema extends Document {
  // Standardized fields based on client requirements
  serviceRequestNumber?: string; // SR Number -> Service Request Number (auto-generated)
  serviceRequestType: string; // SR Type -> Service Request Type (allow any string)
  requestSubmissionDate: Date; // Requested Date -> Request Submission Date
  serviceRequiredDate: Date; // Service Required On Date -> Service Required Date
  engineSerialNumber?: string; // Engine Sr No -> Engine Serial Number
  customerName: string; // Customer Name
  magiecSystemCode: string; // MAGIEC -> MAGIEC (System Code or Identifier)
  magiecCode: string; // MAGIEC Code
  serviceRequestEngineer: mongoose.Types.ObjectId; // SR Engineer -> Service Request Engineer
  serviceRequestStatus: TicketStatus; // SR Status -> Service Request Status
  complaintDescription: string; // Complaint -> Complaint Description
  businessVertical: string; // Vertical -> Business Vertical
  invoiceRaised: boolean; // Invoice Raised -> Invoice Raised (Yes/No)
  siteIdentifier: string; // Site ID -> Site Identifier
  stateName: string; // State Name
  siteLocation: string; // SiteLocation -> Site Location

  // Legacy fields for backward compatibility
  ticketNumber?: string; // Auto-generated
  customer: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  products?: mongoose.Types.ObjectId[]; // Multiple products support
  serialNumber?: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: mongoose.Types.ObjectId;
  scheduledDate?: Date;
  completedDate?: Date;
  partsUsed: IPartUsedSchema[];
  serviceReport?: string;
  customerSignature?: string;
  slaDeadline?: Date;
  serviceCharge?: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const partUsedSchema = new Schema({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  serialNumbers: [{
    type: String,
    trim: true
  }]
}, { _id: false });

const serviceTicketSchema = new Schema({
  // Standardized fields
  serviceRequestNumber: {
    type: String,
    unique: true,
    trim: true
  },
  serviceRequestType: {
    type: String,
    default: 'repair',
    required: [true, 'Service request type is required']
  },
  requestSubmissionDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Request submission date is required']
  },
  serviceRequiredDate: {
    type: Date,
    required: [true, 'Service required date is required']
  },
  engineSerialNumber: {
    type: String,
    trim: true,
    validate: {
      validator: function(value: string) {
        // If no value is provided, it's valid (optional field)
        if (!value || value.trim() === '') return true;
        // If value is provided, it must be at least 6 characters and max 12 characters
        return value.length >= 6 && value.length <= 12;
      },
      message: 'Engine serial number must be between 6 and 12 characters when provided'
    }
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters']
  },
  magiecSystemCode: {
    type: String,
    trim: true,
    maxlength: [50, 'MAGIEC system code cannot exceed 50 characters']
  },
  magiecCode: {
    type: String,
    trim: true,
    maxlength: [50, 'MAGIEC code cannot exceed 50 characters']
  },
  serviceRequestEngineer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Service request engineer is required']
  },
  serviceRequestStatus: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN,
    required: [true, 'Service request status is required']
  },
  complaintDescription: {
    type: String,
    required: [true, 'Complaint description is required'],
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Let required validation handle empty values
        const wordCount = value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        return wordCount <= 500;
      },
      message: 'Complaint description cannot exceed 500 words'
    }
  },
  businessVertical: {
    type: String,
    trim: true,
    maxlength: [100, 'Business vertical cannot exceed 100 characters']
  },
  invoiceRaised: {
    type: Boolean,
    default: false
  },
  siteIdentifier: {
    type: String,
    trim: true,
    maxlength: [100, 'Site identifier cannot exceed 100 characters']
  },
  stateName: {
    type: String,
    trim: true,
    maxlength: [100, 'State name cannot exceed 100 characters']
  },
  siteLocation: {
    type: String,
    trim: true,
    maxlength: [500, 'Site location cannot exceed 500 characters']
  },

  // Legacy fields for backward compatibility
  ticketNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product'
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Serial number cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    validate: {
      validator: function(value: string) {
        if (!value) return true; // Let required validation handle empty values
        const wordCount = value.trim().split(/\s+/).filter((word: string) => word.length > 0).length;
        return wordCount <= 500;
      },
      message: 'Description cannot exceed 500 words'
    }
  },
  priority: {
    type: String,
    enum: Object.values(TicketPriority),
    default: TicketPriority.MEDIUM,
    required: [true, 'Priority is required']
  },
  status: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN,
    required: [true, 'Status is required']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  scheduledDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  partsUsed: [partUsedSchema],
  serviceReport: {
    type: String,
    maxlength: [5000, 'Service report cannot exceed 5000 characters']
  },
  customerSignature: {
    type: String // Base64 encoded signature image
  },
  slaDeadline: {
    type: Date
  },
  serviceCharge: {
    type: Number,
    min: [0, 'Service charge cannot be negative'],
    default: 0
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ticket creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching and performance
serviceTicketSchema.index({ serviceRequestNumber: 1 });
serviceTicketSchema.index({ ticketNumber: 1 });
serviceTicketSchema.index({ customer: 1 });
serviceTicketSchema.index({ status: 1 });
serviceTicketSchema.index({ serviceRequestStatus: 1 });
serviceTicketSchema.index({ assignedTo: 1 });
serviceTicketSchema.index({ serviceRequestEngineer: 1 });
serviceTicketSchema.index({ priority: 1 });
serviceTicketSchema.index({ createdAt: -1 });
serviceTicketSchema.index({ requestSubmissionDate: -1 });
serviceTicketSchema.index({ serviceRequiredDate: -1 });

// Text search index
serviceTicketSchema.index({ 
  serviceRequestNumber: 'text', 
  ticketNumber: 'text',
  customerName: 'text',
  complaintDescription: 'text',
  description: 'text',
  serviceReport: 'text'
});

// Virtual for turnaround time
serviceTicketSchema.virtual('turnaroundTime').get(function(this: IServiceTicketSchema) {
  if (this.completedDate && this.requestSubmissionDate) {
    const diff = this.completedDate.getTime() - this.requestSubmissionDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // in days
  }
  return null;
});

// Virtual for SLA status
serviceTicketSchema.virtual('slaStatus').get(function(this: IServiceTicketSchema) {
  if (!this.slaDeadline) return 'no_sla';
  
  const now = new Date();
  const deadline = new Date(this.slaDeadline);
  
  if (this.status === TicketStatus.CLOSED || this.status === TicketStatus.RESOLVED) {
    return this.completedDate && this.completedDate <= deadline ? 'met' : 'breached';
  }
  
  return now <= deadline ? 'on_track' : 'breached';
});

// Handle service request number and ticket number
serviceTicketSchema.pre('save', async function(this: IServiceTicketSchema, next) {
  if (this.isNew) {
    // If serviceRequestNumber is provided (from Excel), use it as both SR Number and Ticket Number
    if (this.serviceRequestNumber && this.serviceRequestNumber.trim() !== '') {
      // Use the provided SR Number as ticket number (Excel import)
      this.ticketNumber = this.serviceRequestNumber;
    } else {
      // Only auto-generate if no SR Number is provided (manual form creation)
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      
      // Find the last service request number for this month
      const ServiceTicketModel = this.constructor as mongoose.Model<IServiceTicketSchema>;
      const lastTicket = await ServiceTicketModel.findOne({
        serviceRequestNumber: { $regex: `^SR-${year}${month}` }
      }).sort({ serviceRequestNumber: -1 });
      
      let sequence = 1;
      if (lastTicket && lastTicket.serviceRequestNumber) {
        const lastSequence = parseInt(lastTicket.serviceRequestNumber.split('-')[2]);
        sequence = lastSequence + 1;
      }
      
      const generatedNumber = `SR-${year}${month}-${String(sequence).padStart(4, '0')}`;
      this.serviceRequestNumber = generatedNumber;
      this.ticketNumber = generatedNumber;
    }
  }
  next();
});

// Set SLA deadline based on priority when creating ticket
serviceTicketSchema.pre('save', function(this: IServiceTicketSchema, next) {
  if (this.isNew && !this.slaDeadline) {
    const hoursToAdd = this.priority === TicketPriority.CRITICAL ? 4 :
                      this.priority === TicketPriority.HIGH ? 24 :
                      this.priority === TicketPriority.MEDIUM ? 72 : 120;
    
    this.slaDeadline = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  }
  next();
});

// Update completed date when status changes to resolved or closed
serviceTicketSchema.pre('save', function(this: IServiceTicketSchema, next) {
  if (this.isModified('status') && 
      (this.status === TicketStatus.RESOLVED || this.status === TicketStatus.CLOSED) &&
      !this.completedDate) {
    this.completedDate = new Date();
  }
  
  // Sync service request status with legacy status
  if (this.isModified('status')) {
    this.serviceRequestStatus = this.status;
  }
  
  if (this.isModified('serviceRequestStatus')) {
    this.status = this.serviceRequestStatus;
  }
  
  next();
});

// Method to add parts used
serviceTicketSchema.methods.addPartUsed = function(this: IServiceTicketSchema, partData: IPartUsedSchema) {
  this.partsUsed.push(partData);
  return this.save();
};

// Static method to get tickets by SLA status
serviceTicketSchema.statics.getTicketsBySLA = async function(slaStatus: 'on_track' | 'breached' | 'met') {
  const now = new Date();
  
  const matchCondition: any = {};
  
  if (slaStatus === 'on_track') {
    matchCondition.slaDeadline = { $gte: now };
    matchCondition.status = { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
  } else if (slaStatus === 'breached') {
    matchCondition.$or = [
      {
        slaDeadline: { $lt: now },
        status: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
      },
      {
        slaDeadline: { $lt: '$completedDate' },
        status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
      }
    ];
  } else if (slaStatus === 'met') {
    matchCondition.slaDeadline = { $gte: '$completedDate' };
    matchCondition.status = { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
  }
  
  return this.find(matchCondition);
};

export const ServiceTicket = mongoose.model<IServiceTicketSchema>('ServiceTicket', serviceTicketSchema); 