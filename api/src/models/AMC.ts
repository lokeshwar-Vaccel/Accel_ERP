import mongoose, { Schema, Document } from 'mongoose';
import { AMCStatus } from '../types';

// Visit schedule interface
interface IVisitScheduleSchema {
  scheduledDate: Date;
  completedDate?: Date;
  assignedTo?: mongoose.Types.ObjectId;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

// Main AMC interface
interface IAMCSchema extends Document {
  contractNumber: string;
  customer: mongoose.Types.ObjectId;
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
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, { _id: false });

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
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'At least one product is required']
  }],
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  contractValue: {
    type: Number,
    required: [true, 'Contract value is required'],
    min: [0, 'Contract value cannot be negative']
  },
  scheduledVisits: {
    type: Number,
    required: [true, 'Number of scheduled visits is required'],
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
amcSchema.index({ startDate: 1 });
amcSchema.index({ endDate: 1 });
amcSchema.index({ nextVisitDate: 1 });

// Virtual for remaining visits
amcSchema.virtual('remainingVisits').get(function(this: IAMCSchema) {
  return Math.max(0, this.scheduledVisits - this.completedVisits);
});

// Virtual for contract duration
amcSchema.virtual('contractDuration').get(function(this: IAMCSchema) {
  if (this.startDate && this.endDate) {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // in days
  }
  return null;
});

// Virtual for days until expiry
amcSchema.virtual('daysUntilExpiry').get(function(this: IAMCSchema) {
  if (this.endDate) {
    const now = new Date();
    const diff = this.endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for completion percentage
amcSchema.virtual('completionPercentage').get(function(this: IAMCSchema) {
  if (this.scheduledVisits === 0) return 0;
  return Math.round((this.completedVisits / this.scheduledVisits) * 100);
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

// Validate that end date is after start date
amcSchema.pre('save', function(this: IAMCSchema, next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    throw new Error('End date must be after start date');
  }
  next();
});

// Generate visit schedule when contract is created
amcSchema.pre('save', function(this: IAMCSchema, next) {
  if (this.isNew && this.scheduledVisits > 0) {
    const contractDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.floor(contractDays / this.scheduledVisits);
    
    this.visitSchedule = [];
    
    for (let i = 0; i < this.scheduledVisits; i++) {
      const visitDate = new Date(this.startDate.getTime() + (i * intervalDays * 24 * 60 * 60 * 1000));
      
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
  if (this.endDate < now && this.status === AMCStatus.ACTIVE) {
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
amcSchema.methods.completeVisit = function(this: IAMCSchema, visitId: string, notes?: string) {
  const visit = (this.visitSchedule as any).id(visitId);
  if (!visit) {
    throw new Error('Visit not found');
  }
  
  visit.completedDate = new Date();
  visit.status = 'completed';
  if (notes) visit.notes = notes;
  
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
    endDate: { $lte: expiryDate },
    status: AMCStatus.ACTIVE
  }).populate('customer').populate('products');
};

export const AMC = mongoose.model<IAMCSchema>('AMC', amcSchema); 