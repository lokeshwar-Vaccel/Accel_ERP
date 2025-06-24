import mongoose, { Schema, Types } from 'mongoose';
import { ICustomer, IContactHistory, CustomerType, LeadStatus } from '../types';

const contactHistorySchema = new Schema({
  type: {
    type: String,
    enum: ['call', 'meeting', 'email', 'whatsapp'],
    required: [true, 'Contact type is required']
  },
  date: {
    type: Date,
    required: [true, 'Contact date is required']
  },
  notes: {
    type: String,
    required: [true, 'Contact notes are required'],
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  followUpDate: {
    type: Date
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Contact creator is required']
  }
}, { timestamps: true });

const customerSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  customerType: {
    type: String,
    enum: Object.values(CustomerType),
    required: [true, 'Customer type is required']
  },
  leadSource: {
    type: String,
    maxlength: [100, 'Lead source cannot exceed 100 characters']
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: Object.values(LeadStatus),
    default: LeadStatus.NEW,
    required: [true, 'Customer status is required']
  },
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  contactHistory: [contactHistorySchema],
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer creator is required']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for searching
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ status: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ assignedTo: 1 });

// Virtual for latest contact
customerSchema.virtual('latestContact').get(function(this: any) {
  if (this.contactHistory && this.contactHistory.length > 0) {
    return this.contactHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }
  return null;
});

// Method to add contact history
customerSchema.methods.addContact = function(this: any, contactData: any) {
  this.contactHistory.push(contactData);
  return this.save();
};

// Pre-save middleware to update follow-up dates
customerSchema.pre('save', function(this: any, next) {
  if (this.contactHistory && this.contactHistory.length > 0) {
    const latestContact = this.contactHistory[this.contactHistory.length - 1];
    if (latestContact.followUpDate && new Date(latestContact.followUpDate) > new Date()) {
      // Schedule follow-up notification logic here
    }
  }
  next();
});

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema); 