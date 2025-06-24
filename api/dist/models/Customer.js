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
exports.Customer = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const contactHistorySchema = new mongoose_1.Schema({
    type: {
        type: String,
        enum: ['call', 'meeting', 'email', 'whatsapp'],
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
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Contact creator is required']
    }
}, { timestamps: true });
const customerSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
        maxlength: [100, 'Customer name cannot exceed 100 characters']
    },
    email: {
        type: String,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    address: {
        type: String,
        required: [true, 'Address is required'],
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    customerType: {
        type: String,
        enum: Object.values(types_1.CustomerType),
        required: [true, 'Customer type is required']
    },
    leadSource: {
        type: String,
        maxlength: [100, 'Lead source cannot exceed 100 characters']
    },
    assignedTo: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: Object.values(types_1.LeadStatus),
        default: types_1.LeadStatus.NEW,
        required: [true, 'Customer status is required']
    },
    notes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    contactHistory: [contactHistorySchema],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Customer creator is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
customerSchema.index({ name: 'text', email: 'text', phone: 'text' });
customerSchema.index({ status: 1 });
customerSchema.index({ customerType: 1 });
customerSchema.index({ assignedTo: 1 });
customerSchema.virtual('latestContact').get(function () {
    if (this.contactHistory && this.contactHistory.length > 0) {
        return this.contactHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }
    return null;
});
customerSchema.methods.addContact = function (contactData) {
    this.contactHistory.push(contactData);
    return this.save();
};
customerSchema.pre('save', function (next) {
    if (this.contactHistory && this.contactHistory.length > 0) {
        const latestContact = this.contactHistory[this.contactHistory.length - 1];
        if (latestContact.followUpDate && new Date(latestContact.followUpDate) > new Date()) {
        }
    }
    next();
});
exports.Customer = mongoose_1.default.model('Customer', customerSchema);
//# sourceMappingURL=Customer.js.map