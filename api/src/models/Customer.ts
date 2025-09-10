import mongoose, { Schema, Types } from 'mongoose';
import { ICustomer, IContactHistory, CustomerType, LeadStatus, CustomerMainType } from '../types';

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

// Address sub-schema
const addressSchema = new Schema({
  id: {
    type: Number,
    required: true
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    maxlength: [500, 'Address cannot exceed 500 characters']
  },
  state: {
    type: String,
    // required: [true, 'State is required'],
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  district: {
    type: String,
    // required: [true, 'District is required'],
    maxlength: [100, 'District cannot exceed 100 characters']
  },
  pincode: {
    type: String,
    // required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Pincode must be 6 digits']
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  gstNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'GST number cannot exceed 50 characters'],
    required: false
  },
  contactPersonName: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  designation: {
    type: String,
    trim: true,
    maxlength: [100, 'Designation cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true
  },
  phone: {
    type: String
  },
  registrationStatus: {
    type: String,
    enum: ['registered', 'non_registered'],
    required: true,
    default: 'non_registered'
  }
}, { _id: false });

const customerSchema = new Schema({
  name: {
    type: String,
    // required: [true, 'Customer name is required'],
    trim: true,
    default: '',
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  alice: {
    type: String,
    trim: true,
    maxlength: [100, 'Customer alias cannot exceed 100 characters']
  },
  contactPersonName: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  email: {
    type: String,
    lowercase: true,
    // match: [
    //   /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    //   'Please provide a valid email'
    // ]
  },
  phone: {
    type: String,
    // required: [true, 'Phone number is required'],
    // match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  panNumber: {
    type: String,
    trim: true,
    maxlength: [10, 'PAN number cannot exceed 10 characters'],
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)'],
    required: false
  },
  addresses: {
    type: [addressSchema],
    required: true,
    validate: [(arr: any[]) => arr.length > 0, 'At least one address is required']
  },
  siteAddress: {
    type: String,
    trim: true,
    maxlength: [500, 'Site address cannot exceed 500 characters']
  },
  numberOfDG: {
    type: Number,
    min: [0, 'Number of DG cannot be negative'],
    max: [100, 'Number of DG cannot exceed 100']
  },
  dgDetails: {
    type: [Schema.Types.ObjectId],
    ref: 'DGDetails',
    default: []
  },
  customerType: {
    type: String,
    enum: Object.values(CustomerType),
    required: [true, 'Customer type is required']
  },
  type: {
    type: String,
    enum: Object.values(CustomerMainType),
    required: [true, 'Type is required']
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
  customerId: {
    type: String,
    unique: true,
    sparse: true, // allow legacy customers without customerId
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer creator is required']
  },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountNo: { type: String, trim: true },
    ifsc: { type: String, trim: true },
    branch: { type: String, trim: true }
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
// Add unique compound index for name + phone
customerSchema.index({ name: 1, phone: 1 }, { unique: true, sparse: true });

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