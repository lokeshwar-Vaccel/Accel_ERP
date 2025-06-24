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
exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const types_1 = require("../types");
const productSchema = new mongoose_1.Schema({
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    description: {
        type: String,
        maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    category: {
        type: String,
        enum: Object.values(types_1.ProductCategory),
        required: [true, 'Product category is required']
    },
    brand: {
        type: String,
        maxlength: [100, 'Brand cannot exceed 100 characters']
    },
    model: {
        type: String,
        maxlength: [100, 'Model cannot exceed 100 characters']
    },
    specifications: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {}
    },
    price: {
        type: Number,
        required: [true, 'Product price is required'],
        min: [0, 'Price cannot be negative']
    },
    minStockLevel: {
        type: Number,
        required: [true, 'Minimum stock level is required'],
        min: [0, 'Minimum stock level cannot be negative'],
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Product creator is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
productSchema.index({ name: 'text', brand: 'text', model: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.virtual('productCode').get(function () {
    const categoryCode = this.category.toUpperCase().substring(0, 3);
    const idCode = this._id.toString().slice(-6).toUpperCase();
    return `${categoryCode}-${idCode}`;
});
productSchema.virtual('stockLevels', {
    ref: 'Stock',
    localField: '_id',
    foreignField: 'product'
});
productSchema.methods.isLowStock = async function () {
    const Stock = mongoose_1.default.model('Stock');
    const stocks = await Stock.find({ product: this._id });
    const totalStock = stocks.reduce((total, stock) => total + stock.availableQuantity, 0);
    return totalStock <= this.minStockLevel;
};
productSchema.pre('save', function (next) {
    if (this.price < 0) {
        throw new Error('Price cannot be negative');
    }
    if (this.minStockLevel < 0) {
        throw new Error('Minimum stock level cannot be negative');
    }
    next();
});
exports.Product = mongoose_1.default.model('Product', productSchema);
//# sourceMappingURL=Product.js.map