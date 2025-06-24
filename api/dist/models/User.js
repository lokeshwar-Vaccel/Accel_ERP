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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const types_1 = require("../types");
const userSchema = new mongoose_1.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot be more than 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    role: {
        type: String,
        enum: Object.values(types_1.UserRole),
        default: types_1.UserRole.VIEWER,
        required: [true, 'User role is required']
    },
    status: {
        type: String,
        enum: Object.values(types_1.UserStatus),
        default: types_1.UserStatus.ACTIVE
    },
    phone: {
        type: String,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    address: {
        type: String,
        maxlength: [200, 'Address cannot be more than 200 characters']
    },
    moduleAccess: [{
            type: String,
            enum: [
                'user_management',
                'customer_management',
                'inventory_management',
                'service_management',
                'amc_management',
                'reports_analytics',
                'admin_settings',
                'finance'
            ]
        }],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastLoginAt: {
        type: Date
    },
    profileImage: {
        type: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    this.password = await bcryptjs_1.default.hash(this.password, 12);
    next();
});
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcryptjs_1.default.compare(candidatePassword, this.password);
};
userSchema.methods.generateJWT = function () {
    return jsonwebtoken_1.default.sign({
        id: this._id,
        email: this.email,
        role: this.role
    }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};
userSchema.pre('save', function (next) {
    if (!this.isNew && !this.isModified('role'))
        return next();
    switch (this.role) {
        case types_1.UserRole.SUPER_ADMIN:
        case types_1.UserRole.ADMIN:
            this.moduleAccess = [
                'user_management',
                'customer_management',
                'inventory_management',
                'service_management',
                'amc_management',
                'reports_analytics',
                'admin_settings',
                'finance'
            ];
            break;
        case types_1.UserRole.HR:
            this.moduleAccess = [
                'user_management',
                'inventory_management',
                'finance'
            ];
            break;
        case types_1.UserRole.MANAGER:
            this.moduleAccess = [
                'user_management',
                'customer_management',
                'inventory_management',
                'service_management',
                'amc_management',
                'reports_analytics',
                'finance'
            ];
            break;
        case types_1.UserRole.VIEWER:
            this.moduleAccess = [];
            break;
    }
    next();
});
userSchema.pre('deleteOne', { document: true, query: false }, function (next) {
    if (this.role === types_1.UserRole.SUPER_ADMIN) {
        throw new Error('Super admin cannot be deleted');
    }
    next();
});
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map