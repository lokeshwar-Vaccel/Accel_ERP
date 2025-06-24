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
exports.Stock = exports.StockLocation = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const stockLocationSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Location name is required'],
        trim: true,
        maxlength: [100, 'Location name cannot exceed 100 characters']
    },
    address: {
        type: String,
        required: [true, 'Location address is required'],
        maxlength: [500, 'Address cannot exceed 500 characters']
    },
    type: {
        type: String,
        enum: ['main_office', 'warehouse', 'service_center'],
        required: [true, 'Location type is required']
    },
    contactPerson: {
        type: String,
        maxlength: [100, 'Contact person name cannot exceed 100 characters']
    },
    phone: {
        type: String,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});
const stockSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    location: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'StockLocation',
        required: [true, 'Location is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0
    },
    reservedQuantity: {
        type: Number,
        min: [0, 'Reserved quantity cannot be negative'],
        default: 0
    },
    availableQuantity: {
        type: Number,
        min: [0, 'Available quantity cannot be negative'],
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});
stockSchema.index({ product: 1, location: 1 }, { unique: true });
stockSchema.index({ product: 1 });
stockSchema.index({ location: 1 });
stockSchema.pre('save', function (next) {
    this.availableQuantity = this.quantity - this.reservedQuantity;
    this.lastUpdated = new Date();
    if (this.reservedQuantity > this.quantity) {
        throw new Error('Reserved quantity cannot exceed total quantity');
    }
    next();
});
stockSchema.statics.getTotalStock = async function (productId) {
    const stocks = await this.find({ product: productId });
    return stocks.reduce((total, stock) => ({
        totalQuantity: total.totalQuantity + stock.quantity,
        totalReserved: total.totalReserved + stock.reservedQuantity,
        totalAvailable: total.totalAvailable + stock.availableQuantity
    }), { totalQuantity: 0, totalReserved: 0, totalAvailable: 0 });
};
stockSchema.statics.getLowStockItems = async function (locationId) {
    const pipeline = [
        {
            $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'productInfo'
            }
        },
        {
            $unwind: '$productInfo'
        },
        {
            $match: {
                $expr: {
                    $lte: ['$availableQuantity', '$productInfo.minStockLevel']
                }
            }
        }
    ];
    if (locationId) {
        pipeline.unshift({
            $match: { location: new mongoose_1.default.Types.ObjectId(locationId) }
        });
    }
    return this.aggregate(pipeline);
};
stockSchema.methods.reserveStock = function (quantity) {
    if (quantity > this.availableQuantity) {
        throw new Error('Insufficient available stock');
    }
    this.reservedQuantity += quantity;
    return this.save();
};
stockSchema.methods.releaseReservedStock = function (quantity) {
    if (quantity > this.reservedQuantity) {
        throw new Error('Cannot release more than reserved quantity');
    }
    this.reservedQuantity -= quantity;
    return this.save();
};
stockSchema.methods.consumeStock = function (quantity) {
    if (quantity > this.reservedQuantity) {
        throw new Error('Cannot consume more than reserved quantity');
    }
    this.quantity -= quantity;
    this.reservedQuantity -= quantity;
    return this.save();
};
exports.StockLocation = mongoose_1.default.model('StockLocation', stockLocationSchema);
exports.Stock = mongoose_1.default.model('Stock', stockSchema);
//# sourceMappingURL=Stock.js.map