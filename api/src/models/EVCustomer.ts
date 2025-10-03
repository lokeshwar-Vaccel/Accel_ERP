import mongoose, { Schema, Document } from 'mongoose';  

export interface IEVCustomer extends Document {
    customer: {
        bookingReference?: string;
        customerName?: string;
        contactNumber?: number;
        location?: string;
        address?: string;
        vehicleModel?: string;
        automobileDealerName?: string;
    };
    serviceRequest: {
        serviceRequestNumber?: string;
        serviceType?: string;
        requestedDate?: Date;
        completedDate?: Date;
        serviceEngineerName1?: string;
        serviceEngineerName2?: string;
        serviceEngineerName3?: string;
        additionalMcb?: boolean;
        cableLength?: number;
        actualCableLength?: number;
        chargerSerialNumber?: string;
        chargerID?: string;
        chargerRating?: string;
        VINNumber?: string;
        DBSerialNumber?: string;
        scope?: 'in scope' | 'out scope';
        serviceRequestStatus?: 'open' | 'pending' | 'resolved' | 'closed';
    };
}

const evCustomerSchema = new Schema<IEVCustomer>({
    customer: {
        bookingReference: {
            type: String,
            required: false,
        },
        customerName: {
            type: String,
            required: false,
        },
        contactNumber: {
            type: Number,
            required: false,
        },
        location: {
            type: String,
            required: false,
        },
        address: {
            type: String,
            required: false,
        },
       vehicleModel: {
            type: String,
            required: false,
        },
        automobileDealerName: {
            type: String,
            required: false,
        },
    },
    serviceRequest: {
        serviceRequestNumber: {
            type: String,
            required: false,
        },
        serviceType: {
            type: String,
            required: false,
        },
        requestedDate: {
            type: Date,
            required: false,
        },
        completedDate: {
            type: Date,
            required: false,
        },
        serviceEngineerName1: {
            type: String,
            required: false,
        },
        serviceEngineerName2: {
            type: String,
            required: false,
        },
        serviceEngineerName3: {
            type: String,
            required: false,
        },
        additionalMcb:{
            type: Boolean,
            required: false,
            default: false,
        },
        cableLength: {
            type: Number,
            required: false,
        },
        actualCableLength: {
            type: Number,
            required: false,
        },
        chargerSerialNumber: {
            type: String,
            required: false,
        },
        chargerID: {
            type: String,
            required: false,
        },
        chargerRating: {
            type: String,
            required: false,
        },
        VINNumber: {
            type: String,
            required: false,
        },
        DBSerialNumber: {
            type: String,
            required: false,
        },
        scope: {
            type: String,
            enum: ['in scope', 'out scope'],
            required: false,
        },
        serviceRequestStatus: {
            type: String,
            enum: ['open', 'pending', 'resolved', 'closed'],
            required: false,
            default: 'open',
        },
        
    }
});

// Pre-save middleware to handle empty strings for enum fields and automatic scope updates
evCustomerSchema.pre('save', function(next) {
    if (this.serviceRequest) {
        // Set default values for empty strings or undefined values
        if (!this.serviceRequest.scope || (this.serviceRequest.scope as any) === '') {
            this.serviceRequest.scope = 'in scope';
        }
        if (!this.serviceRequest.serviceRequestStatus || (this.serviceRequest.serviceRequestStatus as any) === '') {
            this.serviceRequest.serviceRequestStatus = 'open';
        }
        
        // Automatic scope update based on cable length
        if (this.serviceRequest.cableLength && this.serviceRequest.cableLength > 15) {
            this.serviceRequest.scope = 'out scope';
        }
    }
    next();
});

export default mongoose.model<IEVCustomer>('EVCustomer', evCustomerSchema);
