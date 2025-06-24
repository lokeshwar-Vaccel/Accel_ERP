"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceTicket = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const partUsedSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    serialNumbers: [{
            type: String,
            trim: true
        }]
}, { _id: false });
const serviceTicketSchema = new mongoose_1.Schema({
    ticketNumber: {
        type: String,
        required: [true, 'Ticket number is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product'
    },
    serialNumber: {
        type: String,
        trim: true,
        maxlength: [100, 'Serial number cannot exceed 100 characters']
    },
    description: {
        type: String,
        required: [true, 'Service description is required'],
        maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    priority: {
        type: String,
        enum: Object.values(types_1.TicketPriority),
        default: types_1.TicketPriority.MEDIUM,
        required: [true, 'Priority is required']
    },
    status: {
        type: String,
        enum: Object.values(types_1.TicketStatus),
        default: types_1.TicketStatus.OPEN,
        required: [true, 'Status is required']
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    scheduledDate: {
        type: Date
    },
    completedDate: {
        type: Date
    },
    partsUsed: [partUsedSchema],
    serviceReport: {
        type: String,
        maxlength: [5000, 'Service report cannot exceed 5000 characters']
    },
    customerSignature: {
        type: String
    },
    slaDeadline: {
        type: Date
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Ticket creator is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
serviceTicketSchema.index({ ticketNumber: 1 });
serviceTicketSchema.index({ customer: 1 });
serviceTicketSchema.index({ status: 1 });
serviceTicketSchema.index({ assignedTo: 1 });
serviceTicketSchema.index({ priority: 1 });
serviceTicketSchema.index({ createdAt: -1 });
serviceTicketSchema.index({
    ticketNumber: 'text',
    description: 'text',
    serviceReport: 'text'
});
serviceTicketSchema.virtual('turnaroundTime').get(function () {
    if (this.completedDate && this.createdAt) {
        const diff = this.completedDate.getTime() - this.createdAt.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return null;
});
serviceTicketSchema.virtual('slaStatus').get(function () {
    if (!this.slaDeadline)
        return 'no_sla';
    const now = new Date();
    const deadline = new Date(this.slaDeadline);
    if (this.status === types_1.TicketStatus.CLOSED || this.status === types_1.TicketStatus.RESOLVED) {
        return this.completedDate && this.completedDate <= deadline ? 'met' : 'breached';
    }
    return now <= deadline ? 'on_track' : 'breached';
});
serviceTicketSchema.pre('save', async function (next) {
    if (this.isNew && !this.ticketNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const lastTicket = await this.constructor.findOne({
            ticketNumber: { $regex: `^TKT-${year}${month}` }
        }).sort({ ticketNumber: -1 });
        let sequence = 1;
        if (lastTicket) {
            const lastSequence = parseInt(lastTicket.ticketNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        this.ticketNumber = `TKT-${year}${month}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});
serviceTicketSchema.pre('save', function (next) {
    if (this.isNew && !this.slaDeadline) {
        const hoursToAdd = this.priority === types_1.TicketPriority.CRITICAL ? 4 :
            this.priority === types_1.TicketPriority.HIGH ? 24 :
                this.priority === types_1.TicketPriority.MEDIUM ? 72 : 120;
        this.slaDeadline = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    }
    next();
});
serviceTicketSchema.pre('save', function (next) {
    if (this.isModified('status') &&
        (this.status === types_1.TicketStatus.RESOLVED || this.status === types_1.TicketStatus.CLOSED) &&
        !this.completedDate) {
        this.completedDate = new Date();
    }
    next();
});
serviceTicketSchema.methods.addPartUsed = function (partData) {
    this.partsUsed.push(partData);
    return this.save();
};
serviceTicketSchema.statics.getTicketsBySLA = async function (slaStatus) {
    const now = new Date();
    const matchCondition = {};
    if (slaStatus === 'on_track') {
        matchCondition.slaDeadline = { $gte: now };
        matchCondition.status = { $nin: [types_1.TicketStatus.RESOLVED, types_1.TicketStatus.CLOSED] };
    }
    else if (slaStatus === 'breached') {
        matchCondition.$or = [
            {
                slaDeadline: { $lt: now },
                status: { $nin: [types_1.TicketStatus.RESOLVED, types_1.TicketStatus.CLOSED] }
            },
            {
                slaDeadline: { $lt: '$completedDate' },
                status: { $in: [types_1.TicketStatus.RESOLVED, types_1.TicketStatus.CLOSED] }
            }
        ];
    }
    else if (slaStatus === 'met') {
        matchCondition.slaDeadline = { $gte: '$completedDate' };
        matchCondition.status = { $in: [types_1.TicketStatus.RESOLVED, types_1.TicketStatus.CLOSED] };
    }
    return this.find(matchCondition);
};
exports.ServiceTicket = mongoose_1.default.model('ServiceTicket', serviceTicketSchema);
//# sourceMappingURL=ServiceTicket.js.map