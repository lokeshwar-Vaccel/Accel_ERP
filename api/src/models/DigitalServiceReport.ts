import mongoose, { Schema, Document } from 'mongoose';

export interface IDigitalServiceReport extends Document {
  ticketId: mongoose.Types.ObjectId;
  reportNumber: string;
  technician: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  product?: mongoose.Types.ObjectId;
  serviceDate: Date;
  workCompleted: string;
  partsUsed: Array<{
    product: mongoose.Types.ObjectId;
    quantity: number;
    serialNumbers?: string[];
    cost: number;
  }>;
  recommendations: string;
  customerFeedback: string;
  customerSignature: string;
  technicianSignature: string;
  nextVisitRequired: boolean;
  nextVisitDate?: Date;
  serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
  customerSatisfaction: number; // 1-5 rating
  photos: string[]; // URLs to uploaded photos
  attachments: string[]; // URLs to other attachments
  status: 'draft' | 'completed' | 'approved' | 'rejected';
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const digitalServiceReportSchema = new Schema<IDigitalServiceReport>({
  ticketId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceTicket',
    required: [true, 'Service ticket is required'],
    unique: true
  },
  reportNumber: {
    type: String,
    required: [true, 'Report number is required']
  },
  technician: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Technician is required']
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  serviceDate: {
    type: Date,
    required: [true, 'Service date is required'],
    default: Date.now
  },
  workCompleted: {
    type: String,
    required: [true, 'Work completed description is required'],
    maxlength: [2000, 'Work completed description cannot exceed 2000 characters']
  },
  partsUsed: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1']
    },
    serialNumbers: [{
      type: String,
      trim: true
    }],
    cost: {
      type: Number,
      required: true,
      min: [0, 'Cost cannot be negative']
    }
  }],
  recommendations: {
    type: String,
    maxlength: [1000, 'Recommendations cannot exceed 1000 characters']
  },
  customerFeedback: {
    type: String,
    maxlength: [500, 'Customer feedback cannot exceed 500 characters']
  },
  customerSignature: {
    type: String,
    required: [true, 'Customer signature is required']
  },
  technicianSignature: {
    type: String,
    required: [true, 'Technician signature is required']
  },
  nextVisitRequired: {
    type: Boolean,
    default: false
  },
  nextVisitDate: {
    type: Date
  },
  serviceQuality: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    default: 'good'
  },
  customerSatisfaction: {
    type: Number,
    min: [1, 'Customer satisfaction must be at least 1'],
    max: [5, 'Customer satisfaction cannot exceed 5'],
    default: 5
  },
  photos: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String,
    trim: true
  }],
  status: {
    type: String,
    enum: ['draft', 'completed', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Generate report number if not provided
digitalServiceReportSchema.pre('save', async function(next) {
  if (this.isNew && !this.reportNumber) {
    try {
      const count = await mongoose.model('DigitalServiceReport').countDocuments();
      this.reportNumber = `DSR-${String(count + 1).padStart(6, '0')}`;
    } catch (error) {
      // Fallback to timestamp-based number if count fails
      this.reportNumber = `DSR-${Date.now()}`;
    }
  }
  next();
});

// Indexes
digitalServiceReportSchema.index({ ticketId: 1 });
digitalServiceReportSchema.index({ reportNumber: 1 });
digitalServiceReportSchema.index({ technician: 1 });
digitalServiceReportSchema.index({ customer: 1 });
digitalServiceReportSchema.index({ serviceDate: 1 });
digitalServiceReportSchema.index({ status: 1 });
digitalServiceReportSchema.index({ createdAt: 1 });

export const DigitalServiceReport = mongoose.model<IDigitalServiceReport>('DigitalServiceReport', digitalServiceReportSchema); 