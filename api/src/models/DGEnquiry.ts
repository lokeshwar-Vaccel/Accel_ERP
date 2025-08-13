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
  corporateName: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  address: string;
  pinCode: string;
  tehsil: string;
  district: string;
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
  referenceEmployeeName: string;
  referenceEmployeeMobileNumber: string;
  sourceFrom: string;
  events: string;
  numberOfFollowUps: number;
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
  phoneNumber: { type: String, trim: true },
  email: { type: String, trim: true },
  address: { type: String, trim: true },
  pinCode: { type: String, trim: true },
  tehsil: { type: String, trim: true },
  district: { type: String, trim: true },
  kva: { type: String, trim: true },
  phase: { type: String, trim: true },
  quantity: { type: Number },
  remarks: { type: String, trim: true },
  enquiryStatus: { type: String, trim: true },
  enquiryType: { type: String, trim: true },
  enquiryStage: { type: String, trim: true },
  eoPoDate: { type: Date },
  plannedFollowUpDate: { type: Date },
  source: { type: String, trim: true },
  referenceEmployeeName: { type: String, trim: true },
  referenceEmployeeMobileNumber: { type: String, trim: true },
  sourceFrom: { type: String, trim: true },
  events: { type: String, trim: true },
  numberOfFollowUps: { type: Number },
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
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: false }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DGEnquirySchema.index({ enquiryNo: 1 });

export const DGEnquiry = mongoose.model<IDGEnquiry>('DGEnquiry', DGEnquirySchema); 