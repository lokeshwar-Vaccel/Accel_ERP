import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryChallanItem {
  slNo: number;
  product?: mongoose.Types.ObjectId; // Reference to Product model
  description: string;
  partNo: string;
  hsnSac: string;
  quantity: number;
  stockAllocation?: {
    allocations: Array<{
      location: string;
      room: string;
      rack: string;
      allocatedQuantity: number;
      availableQuantity: number;
    }>;
    canFulfill: boolean;
  };
}

export interface IDeliveryChallan extends Document {
  challanNumber: string;
  dated: Date;
  modeOfPayment: string;
  department: string;
  referenceNo: string;
  otherReferenceNo: string;
  buyersOrderNo: string;
  buyersOrderDate?: Date;
  dispatchDocNo: string;
  destination: string;
  dispatchedThrough: string;
  termsOfDelivery: string;
  consignee: string;
  customer: mongoose.Types.ObjectId;
  location: mongoose.Types.ObjectId; // Reference to StockLocation model
  spares: IDeliveryChallanItem[];
  services: IDeliveryChallanItem[];
  status: 'draft' | 'sent' | 'delivered' | 'cancelled';
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deliveryChallanItemSchema = new Schema<IDeliveryChallanItem>({
  slNo: {
    type: Number,
    required: true,
    min: 1
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  partNo: {
    type: String,
    trim: true
  },
  hsnSac: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  stockAllocation: {
    type: {
      allocations: [{
        location: {
          type: String,
          required: true
        },
        room: {
          type: String,
          required: true
        },
        rack: {
          type: String,
          required: true
        },
        allocatedQuantity: {
          type: Number,
          required: true,
          min: 0
        },
        availableQuantity: {
          type: Number,
          required: true,
          min: 0
        }
      }],
      canFulfill: {
        type: Boolean,
        required: true
      }
    },
    required: false
  }
}, { _id: false });

const deliveryChallanSchema = new Schema<IDeliveryChallan>({
  challanNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  dated: {
    type: Date,
    required: true,
    default: Date.now
  },
  modeOfPayment: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  referenceNo: {
    type: String,
    trim: true
  },
  otherReferenceNo: {
    type: String,
    trim: true
  },
  buyersOrderNo: {
    type: String,
    trim: true
  },
  buyersOrderDate: {
    type: Date
  },
  dispatchDocNo: {
    type: String,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  dispatchedThrough: {
    type: String,
    trim: true
  },
  termsOfDelivery: {
    type: String,
    trim: true
  },
  consignee: {
    type: String,
    trim: true
  },
  customer: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  location: {
    type: Schema.Types.ObjectId,
    ref: 'StockLocation',
    required: true
  },
  spares: {
    type: [deliveryChallanItemSchema],
    default: []
  },
  services: {
    type: [deliveryChallanItemSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'delivered', 'cancelled'],
    default: 'draft'
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
deliveryChallanSchema.index({ customer: 1 });
deliveryChallanSchema.index({ status: 1 });
deliveryChallanSchema.index({ dated: 1 });
deliveryChallanSchema.index({ createdBy: 1 });

export const DeliveryChallan = mongoose.model<IDeliveryChallan>('DeliveryChallan', deliveryChallanSchema); 