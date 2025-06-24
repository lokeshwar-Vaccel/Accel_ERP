import mongoose, { Schema, Document } from 'mongoose';
import { TicketStatus, TicketPriority } from '../types';

// Simple interface for parts used
interface IPartUsedSchema {
  product: mongoose.Types.ObjectId;
  quantity: number;
  serialNumbers?: string[];
}

// Main service ticket interface
interface IServiceTicketSchema extends Document {
  ticketNumber: string;
  customer: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
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
  ticketNumber: {
    type: String,
    required: [true, 'Ticket number is required'],
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
  serialNumber: {
    type: String,
    trim: true,
    maxlength: [100, 'Serial number cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
serviceTicketSchema.index({ ticketNumber: 1 });
serviceTicketSchema.index({ customer: 1 });
serviceTicketSchema.index({ status: 1 });
serviceTicketSchema.index({ assignedTo: 1 });
serviceTicketSchema.index({ priority: 1 });
serviceTicketSchema.index({ createdAt: -1 });

// Text search index
serviceTicketSchema.index({ 
  ticketNumber: 'text', 
  description: 'text',
  serviceReport: 'text'
});

// Virtual for turnaround time
serviceTicketSchema.virtual('turnaroundTime').get(function(this: IServiceTicketSchema) {
  if (this.completedDate && this.createdAt) {
    const diff = this.completedDate.getTime() - this.createdAt.getTime();
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

// Generate unique ticket number
serviceTicketSchema.pre('save', async function(this: IServiceTicketSchema, next) {
  if (this.isNew && !this.ticketNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Find the last ticket number for this month
    const ServiceTicketModel = this.constructor as mongoose.Model<IServiceTicketSchema>;
    const lastTicket = await ServiceTicketModel.findOne({
      ticketNumber: { $regex: `^TKT-${year}${month}` }
    }).sort({ ticketNumber: -1 });
    
    let sequence = 1;
    if (lastTicket) {
      const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.ticketNumber = `TKT-${year}${month}-${String(sequence).padStart(4, '0')}`;
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