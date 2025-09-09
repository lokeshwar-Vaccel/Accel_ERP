import mongoose, { Schema, Document, Types } from "mongoose";

interface IAddress {
  _id: Types.ObjectId;  
  address: string;      
  district: string;
  state: string;
  pincode: string;
}

interface IBankDetail {
  _id: Types.ObjectId;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branch?: string;
  isDefault?: boolean;
}

export interface IOEM extends Document {
  oemCode: string;
  companyName: string;
  alias?: string;
  gstDetails?: string;
  panNumber?: string;
  contactPersonName?: string;
  designation?: string;
  mobileNo?: string;
  email?: string;
  addresses: IAddress[];
  bankDetails: IBankDetail[];
  status: "active" | "inactive";
  notes?: string;
  createdBy: Types.ObjectId;
}

const AddressSchema: Schema = new Schema(
  {
    address: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const BankDetailSchema: Schema = new Schema(
  {
    bankName: { type: String, required: true, trim: true },
    accountNumber: { 
      type: String, 
      required: true, 
      trim: true,
      validate: {
        validator: function(v: string) {
          return /^\d{9,18}$/.test(v);
        },
        message: "Invalid account number format (should be 9-18 digits)"
      }
    },
    ifscCode: { 
      type: String, 
      required: true, 
      uppercase: true,
      validate: {
        validator: function(v: string) {
          return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v);
        },
        message: "Invalid IFSC code format (should be 11 characters: 4 letters + 0 + 6 alphanumeric)"
      }
    },
    branch: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OEMSchema: Schema = new Schema(
  {
    oemCode: { type: String, required: true, unique: true, trim: true },
    companyName: { type: String, required: true, trim: true },  // ✅ updated
    alias: { type: String, trim: true },
    gstDetails: { 
      type: String, 
      trim: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty values
          return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
        },
        message: "Invalid GST number format"
      }
    },
    panNumber: { 
      type: String, 
      trim: true,
      uppercase: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty values
          return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v);
        },
        message: "Invalid PAN number format"
      }
    },
    contactPersonName: { type: String, trim: true },
    designation: { type: String, trim: true },
    mobileNo: { 
      type: String, 
      trim: true, 
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Allow empty values
          return /^[6-9]\d{9}$/.test(v);
        },
        message: "Invalid mobile number format (should be 10 digits starting with 6-9)"
      }
    },
    email: { 
      type: String, 
      trim: true, 
      lowercase: true,
      validate: {
        validator: function(v: string) {
          if (!v) return true; // Allow empty values
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: "Invalid email address format"
      }
    },
    addresses: { type: [AddressSchema], required: true },
    bankDetails: { type: [BankDetailSchema], default: [] },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOEM>("OEM", OEMSchema); 