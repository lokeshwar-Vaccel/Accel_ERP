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
exports.AMC = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const visitScheduleSchema = new mongoose_1.Schema({
    scheduledDate: {
        type: Date,
        required: [true, 'Scheduled date is required']
    },
    completedDate: {
        type: Date
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
        required: [true, 'Visit status is required']
    },
    notes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, { timestamps: true });
const amcSchema = new mongoose_1.Schema({
    contractNumber: {
        type: String,
        required: [true, 'Contract number is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required']
    },
    products: [{
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'Product',
            required: [true, 'At least one product is required']
        }],
    startDate: {
        type: Date,
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        required: [true, 'End date is required']
    },
    contractValue: {
        type: Number,
        required: [true, 'Contract value is required'],
        min: [0, 'Contract value cannot be negative']
    },
    scheduledVisits: {
        type: Number,
        required: [true, 'Number of scheduled visits is required'],
        min: [1, 'At least 1 visit must be scheduled']
    },
    completedVisits: {
        type: Number,
        default: 0,
        min: [0, 'Completed visits cannot be negative']
    },
    status: {
        type: String,
        enum: Object.values(types_1.AMCStatus),
        default: types_1.AMCStatus.ACTIVE,
        required: [true, 'AMC status is required']
    },
    nextVisitDate: {
        type: Date
    },
    visitSchedule: [visitScheduleSchema],
    terms: {
        type: String,
        maxlength: [5000, 'Terms cannot exceed 5000 characters']
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'AMC creator is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
amcSchema.index({ contractNumber: 1 });
amcSchema.index({ customer: 1 });
amcSchema.index({ status: 1 });
amcSchema.index({ startDate: 1, endDate: 1 });
amcSchema.index({ nextVisitDate: 1 });
amcSchema.virtual('remainingVisits').get(function () {
    return Math.max(0, this.scheduledVisits - this.completedVisits);
});
amcSchema.virtual('contractDuration').get(function () {
    if (this.startDate && this.endDate) {
        const diff = this.endDate.getTime() - this.startDate.getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }
    return 0;
});
amcSchema.virtual('daysRemaining').get(function () {
    if (this.endDate) {
        const now = new Date();
        const diff = this.endDate.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }
    return 0;
});
amcSchema.virtual('completionPercentage').get(function () {
    if (this.scheduledVisits === 0)
        return 0;
    return Math.round((this.completedVisits / this.scheduledVisits) * 100);
});
amcSchema.pre('save', async function (next) {
    if (this.isNew && !this.contractNumber) {
        const year = new Date().getFullYear();
        const lastContract = await this.constructor.findOne({
            contractNumber: { $regex: `^AMC-${year}` }
        }).sort({ contractNumber: -1 });
        let sequence = 1;
        if (lastContract) {
            const lastSequence = parseInt(lastContract.contractNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        this.contractNumber = `AMC-${year}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});
amcSchema.pre('save', function (next) {
    if (this.startDate && this.endDate && this.endDate <= this.startDate) {
        throw new Error('End date must be after start date');
    }
    next();
});
amcSchema.pre('save', async function (next) {
    if (this.isNew && this.scheduledVisits > 0) {
        const contractDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
        const intervalDays = Math.floor(contractDays / this.scheduledVisits);
        this.visitSchedule = [];
        for (let i = 0; i < this.scheduledVisits; i++) {
            const visitDate = new Date(this.startDate.getTime() + (i * intervalDays * 24 * 60 * 60 * 1000));
            this.visitSchedule.push({
                scheduledDate: visitDate,
                status: 'pending'
            });
        }
        this.nextVisitDate = this.visitSchedule[0].scheduledDate;
    }
    next();
});
amcSchema.pre('save', function (next) {
    const now = new Date();
    if (this.endDate < now && this.status === types_1.AMCStatus.ACTIVE) {
        this.status = types_1.AMCStatus.EXPIRED;
    }
    const pendingVisit = this.visitSchedule.find(visit => visit.status === 'pending');
    this.nextVisitDate = pendingVisit ? pendingVisit.scheduledDate : null;
    next();
});
amcSchema.methods.completeVisit = function (visitId, completionData) {
    const visit = this.visitSchedule.id(visitId);
    if (!visit) {
        throw new Error('Visit not found');
    }
    if (visit.status === 'completed') {
        throw new Error('Visit is already completed');
    }
    visit.status = 'completed';
    visit.completedDate = completionData.completedDate;
    visit.assignedTo = completionData.assignedTo;
    visit.notes = completionData.notes;
    this.completedVisits += 1;
    return this.save();
};
amcSchema.methods.rescheduleVisit = function (visitId, newDate) {
    const visit = this.visitSchedule.id(visitId);
    if (!visit) {
        throw new Error('Visit not found');
    }
    if (visit.status === 'completed') {
        throw new Error('Cannot reschedule completed visit');
    }
    visit.scheduledDate = newDate;
    return this.save();
};
amcSchema.statics.getExpiringAMCs = async function (days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    return this.find({
        endDate: { $lte: futureDate, $gte: new Date() },
        status: types_1.AMCStatus.ACTIVE
    }).populate('customer').populate('products');
};
amcSchema.statics.getAMCsWithPendingVisits = async function () {
    return this.find({
        status: types_1.AMCStatus.ACTIVE,
        'visitSchedule.status': 'pending'
    }).populate('customer').populate('products');
};
exports.AMC = mongoose_1.default.model('AMC', amcSchema);
//# sourceMappingURL=AMC.js.map