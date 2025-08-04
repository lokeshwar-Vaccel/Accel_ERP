import mongoose, { Schema, Document } from 'mongoose';

export interface IDGMovement extends Document {
  movementNumber: string;
  oemOrder: any;
  customer: any;
  dgPurchaseOrder: any;
  dgItems: {
    model: string;
    kva: string;
    serialNumber: string;
    status: 'pending' | 'in_transit' | 'delivered' | 'installed' | 'commissioned';
  }[];
  sourceLocation: {
    type: 'oem_facility' | 'warehouse' | 'transit' | 'customer_site';
    address: string;
    contactPerson: string;
    phone: string;
  };
  destinationLocation: {
    address: string;
    contactPerson: string;
    phone: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  transportDetails: {
    transportMode: 'road' | 'rail' | 'air' | 'sea';
    vehicleNumber?: string;
    driverName?: string;
    driverPhone?: string;
    transporterName?: string;
    transporterPhone?: string;
    lrNumber?: string;
  };
  movementType: 'delivery' | 'installation' | 'commissioning' | 'maintenance' | 'return';
  scheduledDate: Date;
  actualStartDate?: Date;
  actualCompletionDate?: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  installationDetails?: {
    installationTeam: string[];
    installationStartDate?: Date;
    installationCompletionDate?: Date;
    installationNotes?: string;
    customerSignature?: string;
    installationPhotos?: string[];
  };
  commissioningDetails?: {
    commissioningEngineer: string;
    commissioningDate?: Date;
    testResults?: string;
    performanceReport?: string;
    warrantyStartDate?: Date;
    customerAcceptance?: boolean;
    commissioningCertificate?: string;
  };
  notes: string;
  createdBy: any;
  updatedBy?: any;
}

const DGMovementSchema = new Schema<IDGMovement>({
  movementNumber: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  oemOrder: { 
    type: Schema.Types.ObjectId, 
    ref: 'OEMOrder',
    required: true 
  },
  customer: { 
    type: Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  dgPurchaseOrder: { 
    type: Schema.Types.ObjectId, 
    ref: 'DGPurchaseOrder',
    required: true 
  },
  dgItems: [{
    model: { type: String, required: true },
    kva: { type: String, required: true },
    serialNumber: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['pending', 'in_transit', 'delivered', 'installed', 'commissioned'],
      default: 'pending'
    }
  }],
  sourceLocation: {
    type: { 
      type: String, 
      enum: ['oem_facility', 'warehouse', 'transit', 'customer_site'],
      required: true 
    },
    address: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true }
  },
  destinationLocation: {
    address: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    }
  },
  transportDetails: {
    transportMode: { 
      type: String, 
      enum: ['road', 'rail', 'air', 'sea'],
      default: 'road'
    },
    vehicleNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    transporterName: { type: String },
    transporterPhone: { type: String },
    lrNumber: { type: String }
  },
  movementType: { 
    type: String, 
    enum: ['delivery', 'installation', 'commissioning', 'maintenance', 'return'],
    required: true 
  },
  scheduledDate: { 
    type: Date, 
    required: true 
  },
  actualStartDate: { type: Date },
  actualCompletionDate: { type: Date },
  status: { 
    type: String, 
    enum: ['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled'],
    default: 'scheduled'
  },
  installationDetails: {
    installationTeam: [{ type: String }],
    installationStartDate: { type: Date },
    installationCompletionDate: { type: Date },
    installationNotes: { type: String },
    customerSignature: { type: String },
    installationPhotos: [{ type: String }]
  },
  commissioningDetails: {
    commissioningEngineer: { type: String },
    commissioningDate: { type: Date },
    testResults: { type: String },
    performanceReport: { type: String },
    warrantyStartDate: { type: Date },
    customerAcceptance: { type: Boolean },
    commissioningCertificate: { type: String }
  },
  notes: { type: String },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DGMovementSchema.index({ movementNumber: 1 });
DGMovementSchema.index({ oemOrder: 1 });
DGMovementSchema.index({ customer: 1 });
DGMovementSchema.index({ status: 1 });
DGMovementSchema.index({ movementType: 1 });
DGMovementSchema.index({ scheduledDate: 1 });

export const DGMovement = mongoose.model<IDGMovement>('DGMovement', DGMovementSchema); 