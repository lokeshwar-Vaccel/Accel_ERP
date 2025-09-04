import mongoose, { Schema, Document } from 'mongoose';
import { TicketStatus, TicketPriority, TypeOfVisit, NatureOfWork, SubNatureOfWork } from '../types';

// Simple interface for parts used
interface IPartUsedSchema {
  product: mongoose.Types.ObjectId;
  quantity: number;
  serialNumbers?: string[];
}

// Main service ticket interface with new Excel structure
interface IServiceTicketSchema extends Document {
  // Database fields based on new structure
  ServiceRequestNumber?: string; // SRNumber from Excel
  CustomerType?: string; // CustomerType from Excel
  CustomerName?: string; // CustomerName from Excel
  EngineSerialNumber?: string; // EngineNo from Excel
  EngineModel?: string; // ModelCode from Excel
  KVA?: string; // KVA from Excel
  ServiceRequestDate?: Date; // RequestedDate from Excel
  ServiceAttendedDate?: Date; // RequestedDate from Excel (duplicate field)
  HourMeterReading?: string; // AttendedHrs from Excel
  TypeofService?: string; // SRType from Excel
  SiteID?: string; // SITEID from Excel
  ServiceEngineerName?: mongoose.Types.ObjectId; // SREngineer from Excel - stored as User reference
  ComplaintCode?: string; // ComplaintCode from Excel
  ComplaintDescription?: string; // ComplaintDescription from Excel
  ResolutionDescription?: string; // ResolutionDesc from Excel
  eFSRNumber?: string; // eFSRNo from Excel
  eFSRClosureDateAndTime?: Date; // eFSRClosureDateTime from Excel
  ServiceRequestStatus?: string; // SRStatus from Excel
  OemName?: string; // OEMName from Excel
  

  
  // Essential fields for system functionality
  createdBy?: mongoose.Types.ObjectId; // For backward compatibility
  createdAt: Date;
  updatedAt: Date;
  
  // Additional fields for system functionality
  completedDate?: Date;
  slaDeadline?: Date;
  requestSubmissionDate?: Date;
  serviceRequestStatus?: string; // Alias for ServiceRequestStatus
  assignedTo?: mongoose.Types.ObjectId;
  scheduledDate?: Date;
  serviceReport?: string;
  customerSignature?: string;
  
  // Legacy fields for backward compatibility
  customer?: mongoose.Types.ObjectId;
  products?: mongoose.Types.ObjectId[]; // Multiple products support
  partsUsed: IPartUsedSchema[];
  
  // Visit Details fields
  typeOfVisit?: TypeOfVisit;
  natureOfWork?: NatureOfWork;
  subNatureOfWork?: SubNatureOfWork;
  
  // Import tracking
  uploadedViaExcel?: boolean;
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
  // Database fields based on new structure
  ServiceRequestNumber: {
    type: String,
    unique: true,
    sparse: true, // Allow multiple null values
    trim: true
  },
  CustomerType: {
    type: String,
    trim: true,
    maxlength: [100, 'Customer type cannot exceed 100 characters']
  },
  CustomerName: {
    type: String,
    trim: true,
    maxlength: [200, 'Customer name cannot exceed 200 characters']
  },
  EngineSerialNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Engine serial number cannot exceed 50 characters']
  },
  EngineModel: {
    type: String,
    trim: true,
    maxlength: [100, 'Engine model cannot exceed 100 characters']
  },
  KVA: {
    type: String,
    trim: true,
    maxlength: [50, 'KVA cannot exceed 50 characters']
  },
  ServiceRequestDate: {
    type: Date
  },
  ServiceAttendedDate: {
    type: Date
  },
  HourMeterReading: {
    type: String,
    trim: true,
    maxlength: [100, 'Hour meter reading cannot exceed 100 characters']
  },
  TypeofService: {
    type: String,
    trim: true,
    maxlength: [100, 'Type of service cannot exceed 100 characters']
  },
  SiteID: {
    type: String,
    trim: true,
    maxlength: [100, 'Site ID cannot exceed 100 characters']
  },
  ServiceEngineerName: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    trim: true
  },
  ComplaintCode: {
    type: String,
    trim: true,
    maxlength: [100, 'Complaint code cannot exceed 100 characters']
  },
  ComplaintDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Complaint description cannot exceed 2000 characters']
  },
  ResolutionDescription: {
    type: String,
    trim: true,
    maxlength: [2000, 'Resolution description cannot exceed 2000 characters']
  },
  eFSRNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'eFSR number cannot exceed 100 characters']
  },
  eFSRClosureDateAndTime: {
    type: Date
  },
  ServiceRequestStatus: {
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN,
    required: [true, 'Service Request Status is required']
  },
  OemName: {
    type: String,
    trim: true,
    maxlength: [200, 'OEM name cannot exceed 200 characters']
  },
  requestSubmissionDate: {
    type: Date,
    default: Date.now
  },



  // Legacy fields for backward compatibility
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
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
  
  // Visit Details fields
  typeOfVisit: {
    type: String,
    enum: Object.values(TypeOfVisit),
    trim: true
  },
  natureOfWork: {
    type: String,
    enum: Object.values(NatureOfWork),
    trim: true
  },
  subNatureOfWork: {
    type: String,
    enum: Object.values(SubNatureOfWork),
    trim: true
  },
  
  // Import tracking
  uploadedViaExcel: {
    type: Boolean,
    default: false
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
serviceTicketSchema.index({ ServiceRequestNumber: 1 });
serviceTicketSchema.index({ customer: 1 });
serviceTicketSchema.index({ ServiceRequestStatus: 1 });
serviceTicketSchema.index({ assignedTo: 1 });
serviceTicketSchema.index({ priority: 1 });
serviceTicketSchema.index({ createdAt: -1 });
serviceTicketSchema.index({ requestSubmissionDate: -1 });
serviceTicketSchema.index({ serviceRequiredDate: -1 });

// Text search index
serviceTicketSchema.index({ 
  ServiceRequestNumber: 'text', 
  CustomerName: 'text',
  ComplaintDescription: 'text',
  description: 'text',
  serviceReport: 'text'
});

// Virtual for convenience charges mapped to serviceCharge
serviceTicketSchema.virtual('convenienceCharges')
  .get(function(this: IServiceTicketSchema) {
    const charge = (this as any).serviceCharge;
    if (charge === undefined || charge === null) return '';
    return String(charge);
  })
  .set(function(this: any, value: any) {
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    this.set('serviceCharge', isNaN(num) ? 0 : num);
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
  
  if (this.ServiceRequestStatus === TicketStatus.CLOSED || this.ServiceRequestStatus === TicketStatus.RESOLVED) {
    return this.completedDate && this.completedDate <= deadline ? 'met' : 'breached';
  }
  
  return now <= deadline ? 'on_track' : 'breached';
});

// Handle service request number generation
serviceTicketSchema.pre('save', async function(this: IServiceTicketSchema, next) {
  if (this.isNew && (!this.ServiceRequestNumber || this.ServiceRequestNumber.trim() === '')) {
    // Auto-generate ServiceRequestNumber if not provided or empty
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year (e.g., "25" for 2025)
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero (e.g., "08" for August)
    
    // Find the last service request number for this month
    const ServiceTicketModel = this.constructor as mongoose.Model<IServiceTicketSchema>;
    const lastTicket = await ServiceTicketModel.findOne({
      ServiceRequestNumber: { $regex: `^SPS${year}${month}` }
    }).sort({ ServiceRequestNumber: -1 });
    
    let sequence = 1;
    if (lastTicket && lastTicket.ServiceRequestNumber) {
      // Extract sequence from format SPS25080001
      const sequencePart = lastTicket.ServiceRequestNumber.slice(-4); // Get last 4 digits
      const lastSequence = parseInt(sequencePart);
      sequence = lastSequence + 1;
    }
    
    const generatedNumber = `SPS${year}${month}${String(sequence).padStart(4, '0')}`;
    this.ServiceRequestNumber = generatedNumber;
  }
  next();
});

// Set default SLA deadline when creating ticket
serviceTicketSchema.pre('save', function(this: IServiceTicketSchema, next) {
  if (this.isNew && !this.slaDeadline) {
    // Set default SLA to 72 hours (3 days)
    const hoursToAdd = 72;
    this.slaDeadline = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  }
  next();
});

// Update completed date when ServiceRequestStatus changes to resolved or closed
serviceTicketSchema.pre('save', function(this: IServiceTicketSchema, next) {
  if (this.isModified('ServiceRequestStatus') && 
      (this.ServiceRequestStatus === TicketStatus.RESOLVED || this.ServiceRequestStatus === TicketStatus.CLOSED) &&
      !this.completedDate) {
    this.completedDate = new Date();
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
    matchCondition.ServiceRequestStatus = { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
  } else if (slaStatus === 'breached') {
    matchCondition.$or = [
      {
        slaDeadline: { $lt: now },
        ServiceRequestStatus: { $nin: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
      },
      {
        slaDeadline: { $lt: '$completedDate' },
        ServiceRequestStatus: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
      }
    ];
  } else if (slaStatus === 'met') {
    matchCondition.slaDeadline = { $gte: '$completedDate' };
    matchCondition.ServiceRequestStatus = { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] };
  }
  
  return this.find(matchCondition);
};

export const ServiceTicket = mongoose.model<IServiceTicketSchema>('ServiceTicket', serviceTicketSchema); 