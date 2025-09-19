import mongoose, { Schema, Document } from 'mongoose';

export interface IDGEnquiry extends Document {
  zone: string;
  state: string;
  areaOffice: string;
  dealer: string;
  branch: string;
  location: string;
  assignedEmployeeCode: string;
  assignedEmployeeName: string;
  employeeStatus: string;
  enquiryNo: string;
  enquiryDate: Date;
  customerType: string;
  corporateName: string; // Will store customerName (company name)
  customerName: string; // Will store contactPersonName from primary address
  alice?: string;
  designation: string; // Will store designation from primary address
  phoneNumber: string; // Will store phone from primary address
  email: string; // Will store email from primary address
  address: string; // Will store address from primary address
  pinCode: string; // Will store pincode from primary address
  district: string; // Will store district from primary address
  tehsil: string; // Will store tehsil from primary address
  kva: string;
  phase: string;
  quantity: number;
  remarks: string;
  enquiryStatus: string;
  enquiryType: string;
  enquiryStage: string;
  eoPoDate: Date;
  plannedFollowUpDate: Date;
  source: string;
  sourceFrom: string;
  numberOfFollowUps: number;
  referenceEmployeeName: string;
  referenceEmployeeMobileNumber: string;
  events: string;
  segment: string;
  subSegment: string;
  dgOwnership: string;
  createdBy: string;
  panNumber: string;
  lastFollowUpDate: Date;
  enquiryClosureDate: Date;
  financeRequired: string;
  financeCompany: string;
  referredBy: string;
  customer?: any; // Add customer reference
  // New fields for comprehensive form
  addresses?: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
    notes?: string;
    contactPersonName?: string;
    designation?: string;
    email?: string;
    phone?: string;
    tehsil?: string;
    registrationStatus: 'registered' | 'non_registered';
  }>;
  dgDetails?: Array<{
    dgSerialNumbers: string;
    alternatorMake: string;
    alternatorSerialNumber: string;
    dgMake: string;
    engineSerialNumber: string;
    dgModel: string;
    dgRatingKVA: number;
    salesDealerName: string;
    commissioningDate: Date;
    warrantyStatus: 'warranty' | 'non_warranty';
    cluster: string;
    warrantyStartDate?: Date;
    warrantyEndDate?: Date;
  }>;
  numberOfDG?: number;
  notes?: string;
}

const DGEnquirySchema = new Schema<IDGEnquiry>({
  zone: { type: String, trim: true },
  state: { type: String, trim: true },
  areaOffice: { type: String, trim: true },
  dealer: { type: String, trim: true },
  branch: { type: String, trim: true },
  location: { type: String, trim: true },
  assignedEmployeeCode: { type: String, trim: true },
  assignedEmployeeName: { type: String, trim: true },
  employeeStatus: { type: String, trim: true },
  enquiryNo: { type: String, trim: true, unique: true },
  enquiryDate: { type: Date },
  customerType: { type: String, trim: true },
  corporateName: { type: String, trim: true },
  customerName: { type: String, trim: true },
  alice: { type: String, trim: true },
  designation: { type: String, trim: true },
  phoneNumber: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  district: { type: String, trim: true },
  tehsil: { type: String, trim: true },
  kva: { type: String, trim: true },
  phase: { type: String, trim: true },
  quantity: { type: Number },
  remarks: { type: String, trim: true },
  enquiryStatus: { type: String, trim: true },
  enquiryType: { type: String, trim: true },
  enquiryStage: { type: String, trim: true },
  eoPoDate: { type: Date },
  plannedFollowUpDate: { type: Date, required: false },
  source: { type: String, trim: true },
  sourceFrom: { type: String, trim: true },
  numberOfFollowUps: { type: Number, default: 0 },
  referenceEmployeeName: { type: String, trim: true },
  referenceEmployeeMobileNumber: { type: String, trim: true },
  events: { type: String, trim: true },
  segment: { type: String, trim: true },
  subSegment: { type: String, trim: true },
  dgOwnership: { type: String, trim: true },
  createdBy: { type: String, trim: true },
  panNumber: { type: String, trim: true },
  lastFollowUpDate: { type: Date },
  enquiryClosureDate: { type: Date },
  financeRequired: { type: String, trim: true },
  financeCompany: { type: String, trim: true },
  referredBy: { type: String, trim: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: false },
  // New fields for comprehensive form
  addresses: [{
    id: { type: Number, required: true },
    address: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    pincode: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
    gstNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    contactPersonName: { type: String, trim: true },
    designation: { type: String, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    tehsil: { type: String, trim: true },
    registrationStatus: { type: String, enum: ['registered', 'non_registered'], required: true, default: 'non_registered' }
  }],
  dgDetails: [{
    dgSerialNumbers: { type: String, trim: true },
    alternatorMake: { type: String, trim: true },
    alternatorSerialNumber: { type: String, trim: true },
    dgMake: { type: String, trim: true },
    engineSerialNumber: { type: String, trim: true },
    dgModel: { type: String, trim: true },
    dgRatingKVA: { type: Number, default: 0 },
    salesDealerName: { type: String, trim: true },
    commissioningDate: { type: Date },
    warrantyStatus: { type: String, enum: ['warranty', 'non_warranty'], default: 'warranty' },
    cluster: { type: String, trim: true },
    warrantyStartDate: { type: Date },
    warrantyEndDate: { type: Date }
  }],
  numberOfDG: { type: Number, default: 1 },
  notes: { type: String, trim: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DGEnquirySchema.index({ enquiryNo: 1 });

// Pre-save middleware to populate top-level fields from primary address
DGEnquirySchema.pre('save', function(this: any, next) {
  if (this.addresses && this.addresses.length > 0) {
    const primaryAddress = this.addresses.find((addr: any) => addr.isPrimary) || this.addresses[0];
    
    if (primaryAddress) {
      // Store company name in corporateName (if not already set)
      if (!this.corporateName) {
        this.corporateName = this.customerName;
      }
      
      // Store contact person name in customerName
      if (primaryAddress.contactPersonName) {
        this.customerName = primaryAddress.contactPersonName;
      }
      
      // Store designation from primary address
      this.designation = primaryAddress.designation || '';
      
      // Store primary address details in top-level fields
      this.phoneNumber = primaryAddress.phone || '';
      this.email = primaryAddress.email || '';
      this.address = primaryAddress.address || '';
      this.pinCode = primaryAddress.pincode || '';
      this.district = primaryAddress.district || '';
      this.tehsil = primaryAddress.tehsil || '';
    }
  }
  next();
});

export const DGEnquiry = mongoose.model<IDGEnquiry>('DGEnquiry', DGEnquirySchema); 