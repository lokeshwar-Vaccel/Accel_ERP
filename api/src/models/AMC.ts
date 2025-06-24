import mongoose, { Schema } from 'mongoose';
import { IAMC, IVisitSchedule, AMCStatus } from '../types';

const visitScheduleSchema = new Schema<IVisitSchedule>({
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
}, { timestamps: true });

const amcSchema = new Schema<IAMC>({
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
    min: [1, 'At least 1 visit must be scheduled']
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
    required: [true, 'AMC status is required']
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
    required: [true, 'AMC creator is required']
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
amcSchema.index({ startDate: 1, endDate: 1 });
amcSchema.index({ nextVisitDate: 1 });

// Virtual for remaining visits
amcSchema.virtual('remainingVisits').get(function() {
  return Math.max(0, this.scheduledVisits - this.completedVisits);
});

// Virtual for contract duration
amcSchema.virtual('contractDuration').get(function() {
  if (this.startDate && this.endDate) {
    const diff = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)); // in days
  }
  return 0;
});

// Virtual for days remaining
amcSchema.virtual('daysRemaining').get(function() {
  if (this.endDate) {
    const now = new Date();
    const diff = this.endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }
  return 0;
});

// Virtual for completion percentage
amcSchema.virtual('completionPercentage').get(function() {
  if (this.scheduledVisits === 0) return 0;
  return Math.round((this.completedVisits / this.scheduledVisits) * 100);
});

// Generate unique contract number
amcSchema.pre('save', async function(next) {
  if (this.isNew && !this.contractNumber) {
    const year = new Date().getFullYear();
    
    // Find the last contract number for this year
    const lastContract = await this.constructor.findOne({
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

// Validate end date is after start date
amcSchema.pre('save', function(next) {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    throw new Error('End date must be after start date');
  }
  next();
});

// Auto-generate visit schedule when AMC is created
amcSchema.pre('save', async function(next) {
  if (this.isNew && this.scheduledVisits > 0) {
    const contractDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.floor(contractDays / this.scheduledVisits);
    
    this.visitSchedule = [];
    
    for (let i = 0; i < this.scheduledVisits; i++) {
      const visitDate = new Date(this.startDate.getTime() + (i * intervalDays * 24 * 60 * 60 * 1000));
      
      this.visitSchedule.push({
        scheduledDate: visitDate,
        status: 'pending'
      } as IVisitSchedule);
    }
    
    // Set next visit date to first scheduled visit
    this.nextVisitDate = this.visitSchedule[0].scheduledDate;
  }
  next();
});

// Update status based on dates and completion
amcSchema.pre('save', function(next) {
  const now = new Date();
  
  if (this.endDate < now && this.status === AMCStatus.ACTIVE) {
    this.status = AMCStatus.EXPIRED;
  }
  
  // Update next visit date
  const pendingVisit = this.visitSchedule.find(visit => visit.status === 'pending');
  this.nextVisitDate = pendingVisit ? pendingVisit.scheduledDate : null;
  
  next();
});

// Method to mark visit as completed
amcSchema.methods.completeVisit = function(visitId: string, completionData: { completedDate: Date; assignedTo?: string; notes?: string }) {
  const visit = this.visitSchedule.id(visitId);
  if (!visit) {
    throw new Error('Visit not found');
  }
  
  if (visit.status === 'completed') {
    throw new Error('Visit is already completed');
  }
  
  visit.status = 'completed';
  visit.completedDate = completionData.completedDate;
  visit.assignedTo = completionData.assignedTo;
  visit.notes = completionData.notes;
  
  this.completedVisits += 1;
  
  return this.save();
};

// Method to reschedule visit
amcSchema.methods.rescheduleVisit = function(visitId: string, newDate: Date) {
  const visit = this.visitSchedule.id(visitId);
  if (!visit) {
    throw new Error('Visit not found');
  }
  
  if (visit.status === 'completed') {
    throw new Error('Cannot reschedule completed visit');
  }
  
  visit.scheduledDate = newDate;
  
  return this.save();
};

// Static method to get expiring AMCs
amcSchema.statics.getExpiringAMCs = async function(days: number = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    endDate: { $lte: futureDate, $gte: new Date() },
    status: AMCStatus.ACTIVE
  }).populate('customer').populate('products');
};

// Static method to get AMCs with pending visits
amcSchema.statics.getAMCsWithPendingVisits = async function() {
  return this.find({
    status: AMCStatus.ACTIVE,
    'visitSchedule.status': 'pending'
  }).populate('customer').populate('products');
};

export const AMC = mongoose.model<IAMC>('AMC', amcSchema); 