import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerFeedback extends Document {
  ticketId: mongoose.Types.ObjectId;
  customerEmail: string;
  customerName: string;
  rating: number;
  comments?: string;
  serviceQuality: 'excellent' | 'good' | 'average' | 'poor';
  technicianRating: number;
  timelinessRating: number;
  qualityRating: number;
  wouldRecommend: boolean;
  improvementSuggestions?: string;
  feedbackDate: Date;
  isSubmitted: boolean;
  token: string; // For secure access to feedback form
  expiresAt: Date;
}

const customerFeedbackSchema = new Schema<ICustomerFeedback>({
  ticketId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceTicket',
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: function(this: any, value: number) {
        // Allow 0 for initial records, require 1-5 for submitted feedback
        if (this.isSubmitted && value === 0) {
          return false;
        }
        return true;
      },
      message: 'Rating must be between 1-5 when feedback is submitted'
    }
  },
  comments: {
    type: String,
    maxlength: 1000
  },
  serviceQuality: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor'],
    required: true
  },
  technicianRating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: function(this: any, value: number) {
        // Allow 0 for initial records, require 1-5 for submitted feedback
        if (this.isSubmitted && value === 0) {
          return false;
        }
        return true;
      },
      message: 'Technician rating must be between 1-5 when feedback is submitted'
    }
  },
  timelinessRating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: function(this: any, value: number) {
        // Allow 0 for initial records, require 1-5 for submitted feedback
        if (this.isSubmitted && value === 0) {
          return false;
        }
        return true;
      },
      message: 'Timeliness rating must be between 1-5 when feedback is submitted'
    }
  },
  qualityRating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    validate: {
      validator: function(this: any, value: number) {
        // Allow 0 for initial records, require 1-5 for submitted feedback
        if (this.isSubmitted && value === 0) {
          return false;
        }
        return true;
      },
      message: 'Quality rating must be between 1-5 when feedback is submitted'
    }
  },
  wouldRecommend: {
    type: Boolean,
    required: true
  },
  improvementSuggestions: {
    type: String,
    maxlength: 500
  },
  feedbackDate: {
    type: Date,
    default: Date.now
  },
  isSubmitted: {
    type: Boolean,
    default: false
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index for token lookup
customerFeedbackSchema.index({ token: 1 });
customerFeedbackSchema.index({ ticketId: 1 });
customerFeedbackSchema.index({ expiresAt: 1 });

export const CustomerFeedback = mongoose.model<ICustomerFeedback>('CustomerFeedback', customerFeedbackSchema); 