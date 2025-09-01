import mongoose, { Schema, Document } from 'mongoose';
import { AMCStatus } from '../types';

// Visit schedule interface
interface IVisitScheduleSchema {
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'cancelled';
}

// Main AMC interface
interface IAMCSchema extends Document {
  contractNumber: string;
  customer: mongoose.Types.ObjectId;
  // New fields as per client requirements
  customerAddress: string; // Selected address from customer's addresses
  contactPersonName: string;
  contactNumber: string;
  engineSerialNumber: string;
  engineModel: string; // Auto-populated from engine selection
  kva: number; // Auto-populated from engine selection
  dgMake: string; // Auto-populated from engine selection
  dateOfCommissioning: Date; // Auto-populated from engine selection
  amcStartDate: Date;
  amcEndDate: Date;
  amcType: 'AMC' | 'CAMC';
  numberOfVisits: number;
  numberOfOilServices: number;
  // Legacy fields (keeping for backward compatibility)
  products: mongoose.Types.ObjectId[];
  startDate: Date;
  endDate: Date;
  contractValue: number;
  scheduledVisits: number;
  completedVisits: number;
  status: AMCStatus;
  nextVisitDate?: Date;
  visitSchedule: IVisitScheduleSchema[];
  terms?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const visitScheduleSchema = new Schema({
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  completedDate: {
    type: Date
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    required: [true, 'Visit status is required']
  },
  serviceReport: {
    type: String,
    maxlength: [2000, 'Service report cannot exceed 2000 characters']
  },
  issues: [{
    description: {
      type: String,
      maxlength: [500, 'Issue description cannot exceed 500 characters']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    resolved: {
      type: Boolean,
      default: false
    },
    followUpRequired: {
      type: Boolean,
      default: false
    }
  }],
  customerSignature: {
    type: String,
    maxlength: [10000, 'Customer signature cannot exceed 10000 characters']
  },
  nextVisitRecommendations: {
    type: String,
    maxlength: [1000, 'Next visit recommendations cannot exceed 1000 characters']
  }
});

const amcSchema = new Schema({
  contractNumber: {
    type: String,
    required: [true, 'Contract number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  // New fields as per client requirements
  customerAddress: {
    type: String,
    required: [true, 'Customer address is required'],
    trim: true
  },
  contactPersonName: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  engineSerialNumber: {
    type: String,
    required: [true, 'Engine serial number is required'],
    trim: true
  },
  engineModel: {
    type: String,
    required: [true, 'Engine model is required'],
    trim: true
  },
  kva: {
    type: Number,
    required: [true, 'KVA is required'],
    min: [0, 'KVA cannot be negative']
  },
  dgMake: {
    type: String,
    required: [true, 'DG make is required'],
    trim: true
  },
  dateOfCommissioning: {
    type: Date,
    required: [true, 'Date of commissioning is required']
  },
  amcStartDate: {
    type: Date,
    required: [true, 'AMC start date is required']
  },
  amcEndDate: {
    type: Date,
    required: [true, 'AMC end date is required']
  },
  amcType: {
    type: String,
    enum: ['AMC', 'CAMC'],
    required: [true, 'AMC type is required']
  },
  numberOfVisits: {
    type: Number,
    required: [true, 'Number of visits is required'],
    min: [1, 'Must have at least 1 visit']
  },
  numberOfOilServices: {
    type: Number,
    required: [true, 'Number of oil services is required'],
    min: [0, 'Number of oil services cannot be negative']
  },
  // Legacy fields (keeping for backward compatibility)
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  contractValue: {
    type: Number,
    min: [0, 'Contract value cannot be negative']
  },
  scheduledVisits: {
    type: Number,
    min: [1, 'Must have at least 1 scheduled visit']
  },
  completedVisits: {
    type: Number,
    default: 0,
    min: [0, 'Completed visits cannot be negative']
  },
  status: {
    type: String,
    enum: Object.values(AMCStatus),
    default: AMCStatus.ACTIVE,
    required: [true, 'Status is required']
  },
  nextVisitDate: {
    type: Date
  },
  visitSchedule: [visitScheduleSchema],
  terms: {
    type: String,
    maxlength: [5000, 'Terms cannot exceed 5000 characters']
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Contract creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching and performance
amcSchema.index({ contractNumber: 1 });
amcSchema.index({ customer: 1 });
amcSchema.index({ status: 1 });
amcSchema.index({ amcStartDate: 1 });
amcSchema.index({ amcEndDate: 1 });
amcSchema.index({ engineSerialNumber: 1 });
amcSchema.index({ nextVisitDate: 1 });

// Virtual for remaining visits
amcSchema.virtual('remainingVisits').get(function(this: IAMCSchema) {
  return Math.max(0, this.numberOfVisits - this.completedVisits);
});

// Virtual for contract duration
amcSchema.virtual('contractDuration').get(function(this: IAMCSchema) {
  if (this.amcStartDate && this.amcEndDate) {
    const diff = this.amcEndDate.getTime() - this.amcStartDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // in days
  }
  return null;
});

// Virtual for days until expiry
amcSchema.virtual('daysUntilExpiry').get(function(this: IAMCSchema) {
  if (this.amcEndDate) {
    const now = new Date();
    const diff = this.amcEndDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for completion percentage
amcSchema.virtual('completionPercentage').get(function(this: IAMCSchema) {
  if (this.numberOfVisits === 0) return 0;
  return Math.round((this.completedVisits / this.numberOfVisits) * 100);
});

// Generate unique contract number
amcSchema.pre('save', async function(this: IAMCSchema, next) {
  if (this.isNew && !this.contractNumber) {
    const year = new Date().getFullYear();
    
    // Find the last contract number for this year
    const AMCModel = this.constructor as mongoose.Model<IAMCSchema>;
    const lastContract = await AMCModel.findOne({
      contractNumber: { $regex: `^AMC-${year}` }
    }).sort({ contractNumber: -1 });
    
    let sequence = 1;
    if (lastContract) {
      const lastSequence = parseInt(lastContract.contractNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.contractNumber = `AMC-${year}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Validate that AMC end date is after start date
amcSchema.pre('save', function(this: IAMCSchema, next) {
  if (this.amcStartDate && this.amcEndDate && this.amcEndDate <= this.amcStartDate) {
    throw new Error('AMC end date must be after start date');
  }
  next();
});

// Generate visit schedule when contract is created
amcSchema.pre('save', function(this: IAMCSchema, next) {
  if (this.isNew && this.numberOfVisits > 0) {
    // Calculate the interval in months based on contract duration and number of visits
    const totalMonths = (this.amcEndDate.getFullYear() - this.amcStartDate.getFullYear()) * 12 + 
                       (this.amcEndDate.getMonth() - this.amcStartDate.getMonth());
    const intervalMonths = Math.floor(totalMonths / this.numberOfVisits);
    
    this.visitSchedule = [];
    
    for (let i = 0; i < this.numberOfVisits; i++) {
      const visitDate = new Date(this.amcStartDate);
      // Schedule visits with proper interval (first visit after interval, not on start date)
      visitDate.setMonth(this.amcStartDate.getMonth() + ((i + 1) * intervalMonths));
      
      this.visitSchedule.push({
        scheduledDate: visitDate,
        status: 'pending' as const
      });
    }
    
    // Set next visit date to first visit
    this.nextVisitDate = this.visitSchedule[0].scheduledDate;
  }
  next();
});

// Auto-update status when contract expires
amcSchema.pre('save', function(this: IAMCSchema, next) {
  const now = new Date();
  if (this.amcEndDate < now && this.status === AMCStatus.ACTIVE) {
    this.status = AMCStatus.EXPIRED;
  }
  
  // Update next visit date
  const pendingVisit = this.visitSchedule.find((visit: any) => visit.status === 'pending');
  this.nextVisitDate = pendingVisit ? pendingVisit.scheduledDate : undefined;
  
  next();
});

// Method to schedule next visit
amcSchema.methods.scheduleNextVisit = function(this: IAMCSchema, visitDate: Date, assignedTo?: string) {
  const nextVisit = {
    scheduledDate: visitDate,
    assignedTo: assignedTo ? new mongoose.Types.ObjectId(assignedTo) : undefined,
    status: 'pending' as const
  };
  
  this.visitSchedule.push(nextVisit);
  this.nextVisitDate = visitDate;
  
  return this.save();
};

// Method to complete a visit
amcSchema.methods.completeVisit = function(this: IAMCSchema, visitId: string) {
  const visit = (this.visitSchedule as any).id(visitId);
  if (!visit) {
    throw new Error('Visit not found');
  }
  
  visit.completedDate = new Date();
  visit.status = 'completed';
  
  this.completedVisits += 1;
  
  // Update next visit date
  const pendingVisit = this.visitSchedule.find((v: any) => v.status === 'pending');
  this.nextVisitDate = pendingVisit ? pendingVisit.scheduledDate : undefined;
  
  return this.save();
};

// Static method to get expiring contracts
amcSchema.statics.getExpiringContracts = async function(days: number = 30) {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + days);
  
  return this.find({
    amcEndDate: { $lte: expiryDate },
    status: AMCStatus.ACTIVE
  }).populate('customer').populate('products');
};

export const AMC = mongoose.model<IAMCSchema>('AMC', amcSchema); 