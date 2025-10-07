// models/Company.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface ICompany extends Document {
  companyName: string;
  companyAddress: string;
  contactPhone: string;
  contactEmail: string;
  companyPan: string;
  companyBankDetails: {
    accNo: string;
    bankName: string;
    ifscCode: string;
    branch: string;
  };
}

const CompanySchema: Schema = new Schema(
  {
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, required: true },
    companyPan: { type: String, required: true },
    companyBankDetails: {
      accNo: { type: String, required: true },
      bankName: { type: String, required: true },
      ifscCode: { type: String, required: true },
      branch: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICompany>('generalSettings', CompanySchema);
