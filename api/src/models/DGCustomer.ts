import mongoose, { Schema, Types } from 'mongoose';

// DG Customer specific enums
export enum DGCustomerType {
  RETAIL = 'RETAIL',
  CORPORATE = 'CORPORATE',
  INDUSTRIAL = 'INDUSTRIAL',
  COMMERCIAL = 'COMMERCIAL',
  RESIDENTIAL = 'RESIDENTIAL'
}

export enum DGCustomerStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  QUOTED = 'QUOTED',
  NEGOTIATING = 'NEGOTIATING',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
  INACTIVE = 'INACTIVE'
}

export enum DGLeadSource {
  PORTAL_UPLOAD = 'PORTAL_UPLOAD',
  WEBSITE = 'WEBSITE',
  REFERRAL = 'REFERRAL',
  COLD_CALL = 'COLD_CALL',
  EXHIBITION = 'EXHIBITION',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  PRINT_MEDIA = 'PRINT_MEDIA',
  OTHER = 'OTHER'
}

export enum DGPhase {
  SINGLE = 'SINGLE',
  THREE = 'THREE'
}

// export enum DGSegment {
//   TELECOM = 'TELECOM',
//   RETAIL = 'RETAIL',
//   INDUSTRIAL = 'INDUSTRIAL',
//   COMMERCIAL = 'COMMERCIAL',
//   RESIDENTIAL = 'RESIDENTIAL',
//   HEALTHCARE = 'HEALTHCARE',
//   EDUCATION = 'EDUCATION',
//   BANKING = 'BANKING',
//   OTHER = 'OTHER'
// }

// DG Requirements sub-schema
const dgRequirementsSchema = new Schema({
  kva: {
    type: String,
    required: [true, 'KVA requirement is required'],
    trim: true
  },
  phase: {
    type: String,
    enum: Object.values(DGPhase),
    required: [true, 'Phase requirement is required']
  },
  quantity: {
    type: Number,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  segment: {
    type: String,
    // enum: Object.values(DGSegment),
    // required: [true, 'Segment is required']
  },
  subSegment: {
    type: String,
    trim: true,
    maxlength: [100, 'Sub segment cannot exceed 100 characters']
  },
  dgOwnership: {
    type: String,
    // enum: ['OWNED', 'RENTED', 'NOT_OWNED'],
    default: ''
  },
  financeRequired: {
    type: Boolean,
    default: false
  },
  financeCompany: {
    type: String,
    trim: true,
    maxlength: [100, 'Finance company cannot exceed 100 characters']
  },
  remarks: {
    type: String,
    maxlength: [1000, 'Remarks cannot exceed 1000 characters']
  }
}, { _id: false });

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
    required: [true, 'State is required'],
    maxlength: [100, 'State cannot exceed 100 characters']
  },
  district: {
    type: String,
    required: [true, 'District is required'],
    maxlength: [100, 'District cannot exceed 100 characters']
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Pincode must be 6 digits']
  },
  tehsil: {
    type: String,
    trim: true,
    maxlength: [100, 'Tehsil cannot exceed 100 characters']
  },
  isPrimary: {
    type: Boolean,
    default: false
  }
}, { _id: false });

// Contact History sub-schema
const contactHistorySchema = new Schema({
  type: {
    type: String,
    enum: ['call', 'meeting', 'email', 'whatsapp', 'site_visit', 'follow_up'],
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
  outcome: {
    type: String,
    enum: ['positive', 'negative', 'neutral', 'pending'],
    default: 'neutral'
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Contact creator is required']
  }
}, { timestamps: true });

// Main DGCustomer Schema
const dgCustomerSchema = new Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true,
    maxlength: [100, 'Customer name cannot exceed 100 characters']
  },
  corporateName: {
    type: String,
    trim: true,
    maxlength: [200, 'Corporate name cannot exceed 200 characters']
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

  // Contact Information
  email: {
    type: String,
    lowercase: true,
    trim: true,
    // match: [
    //   /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
    //   'Please provide a valid email'
    // ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    // match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  alternatePhone: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },

  // Business Information
  panNumber: {
    type: String,
    trim: true,
    maxlength: [10, 'PAN number cannot exceed 10 characters'],
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)']
  },
  gstNumber: {
    type: String,
    trim: true,
    maxlength: [15, 'GST number cannot exceed 15 characters']
  },

  // Addresses
  addresses: {
    type: [addressSchema],
    required: true,
    validate: [(arr: any[]) => arr.length > 0, 'At least one address is required']
  },

  // DG Specific Information
  dgRequirements: {
    type: dgRequirementsSchema,
    required: [true, 'DG requirements are required']
  },

  // Sales Information
  customerType: {
    type: String,
    enum: Object.values(DGCustomerType),
    required: [true, 'Customer type is required'],
    default: DGCustomerType.RETAIL
  },
  status: {
    type: String,
    enum: Object.values(DGCustomerStatus),
    default: DGCustomerStatus.NEW,
    required: [true, 'Customer status is required']
  },
  leadSource: {
    type: String,
    enum: Object.values(DGLeadSource),
    default: DGLeadSource.PORTAL_UPLOAD
  },
  sourceFrom: {
    type: String,
    trim: true,
    maxlength: [100, 'Source from cannot exceed 100 characters']
  },

  // Assignment and Tracking
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedEmployeeCode: {
    type: String,
    trim: true,
    maxlength: [50, 'Employee code cannot exceed 50 characters']
  },
  assignedEmployeeName: {
    type: String,
    trim: true,
    maxlength: [100, 'Employee name cannot exceed 100 characters']
  },
  employeeStatus: {
    type: String,
    trim: true,
    maxlength: [50, 'Employee status cannot exceed 50 characters']
  },

  // Reference Information
  referenceEmployeeName: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference employee name cannot exceed 100 characters']
  },
  referenceEmployeeMobileNumber: {
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
  },
  referredBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Referred by cannot exceed 100 characters']
  },

  // Follow-up Information
  numberOfFollowUps: {
    type: Number,
    min: [0, 'Number of follow-ups cannot be negative'],
    default: 0
  },
  lastFollowUpDate: {
    type: Date
  },
  plannedFollowUpDate: {
    type: Date
  },

  // Contact History
  contactHistory: [contactHistorySchema],

  // Notes and Additional Information
  notes: {
    type: String,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  events: {
    type: String,
    trim: true,
    maxlength: [500, 'Events cannot exceed 500 characters']
  },

  // System Information
  customerId: {
    type: String,
    // unique: true,
    // sparse: true,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Customer creator is required']
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isDGSalesCustomer: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
dgCustomerSchema.index({ name: 'text', phone: 'text' });
dgCustomerSchema.index({ status: 1 });
dgCustomerSchema.index({ customerType: 1 });
dgCustomerSchema.index({ assignedTo: 1 });
// dgCustomerSchema.index({ leadSource: 1 });
// dgCustomerSchema.index({ 'dgRequirements.segment': 1 });
// dgCustomerSchema.index({ 'dgRequirements.kva': 1 });
dgCustomerSchema.index({ createdBy: 1 });
dgCustomerSchema.index({ createdAt: -1 });
// dgCustomerSchema.index({ lastFollowUpDate: 1 });
// dgCustomerSchema.index({ plannedFollowUpDate: 1 });

// Compound indexes
dgCustomerSchema.index({ name: 1, phone: 1 }); // Removed unique constraint to allow multiple customers with same name+phone
// dgCustomerSchema.index({ email: 1, phone: 1 }, { unique: true, sparse: true });

// Virtual for latest contact
dgCustomerSchema.virtual('latestContact').get(function(this: any) {
  if (this.contactHistory && this.contactHistory.length > 0) {
    return this.contactHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }
  return null;
});

// Virtual for full name
dgCustomerSchema.virtual('fullName').get(function(this: any) {
  return this.corporateName || this.name;
});

// Method to add contact history
dgCustomerSchema.methods.addContact = function(this: any, contactData: any) {
  this.contactHistory.push(contactData);
  this.numberOfFollowUps = this.contactHistory.length;
  this.lastFollowUpDate = new Date();
  return this.save();
};

// Method to update follow-up date
dgCustomerSchema.methods.updateFollowUpDate = function(this: any, followUpDate: Date) {
  this.plannedFollowUpDate = followUpDate;
  return this.save();
};

// Pre-save middleware to update follow-up dates
dgCustomerSchema.pre('save', function(this: any, next) {
  if (this.contactHistory && this.contactHistory.length > 0) {
    const latestContact = this.contactHistory[this.contactHistory.length - 1];
    if (latestContact.followUpDate && new Date(latestContact.followUpDate) > new Date()) {
      this.plannedFollowUpDate = latestContact.followUpDate;
    }
  }
  next();
});

// Interface for TypeScript
export interface IDGCustomer {
  _id: Types.ObjectId;
  name: string;
  corporateName?: string;
  contactPersonName?: string;
  designation?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  panNumber?: string;
  gstNumber?: string;
  addresses: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    tehsil?: string;
    isPrimary: boolean;
  }>;
  dgRequirements: {
    kva: string;
    phase: DGPhase;
    quantity: number;
    segment: string;
    subSegment?: string;
    dgOwnership: string;
    financeRequired: boolean;
    financeCompany?: string;
    remarks?: string;
  };
  customerType: DGCustomerType;
  status: DGCustomerStatus;
  leadSource: DGLeadSource;
  sourceFrom?: string;
  assignedTo?: Types.ObjectId;
  assignedEmployeeCode?: string;
  assignedEmployeeName?: string;
  employeeStatus?: string;
  referenceEmployeeName?: string;
  referenceEmployeeMobileNumber?: string;
  referredBy?: string;
  numberOfFollowUps: number;
  lastFollowUpDate?: Date;
  plannedFollowUpDate?: Date;
  contactHistory: Array<{
    type: string;
    date: Date;
    notes: string;
    followUpDate?: Date;
    outcome: string;
    createdBy: Types.ObjectId;
  }>;
  notes?: string;
  events?: string;
  customerId?: string;
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  isActive: boolean;
  isDGSalesCustomer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DGCustomer = mongoose.model<IDGCustomer>('DGCustomer', dgCustomerSchema); 