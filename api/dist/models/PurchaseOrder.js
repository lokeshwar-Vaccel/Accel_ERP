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
exports.PurchaseOrder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const poItemSchema = new mongoose_1.Schema({
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
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price cannot be negative']
    }
}, { _id: false });
const purchaseOrderSchema = new mongoose_1.Schema({
    poNumber: {
        type: String,
        required: [true, 'PO number is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    supplier: {
        type: String,
        required: [true, 'Supplier is required'],
        trim: true,
        maxlength: [200, 'Supplier name cannot exceed 200 characters']
    },
    items: {
        type: [poItemSchema],
        required: [true, 'At least one item is required'],
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: 'Purchase order must have at least one item'
        }
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Total amount cannot be negative']
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'confirmed', 'received', 'cancelled'],
        default: 'draft',
        required: [true, 'Status is required']
    },
    orderDate: {
        type: Date,
        required: [true, 'Order date is required'],
        default: Date.now
    },
    expectedDeliveryDate: {
        type: Date
    },
    actualDeliveryDate: {
        type: Date
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'PO creator is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.virtual('deliveryStatus').get(function () {
    if (this.status === 'received')
        return 'delivered';
    if (this.status === 'cancelled')
        return 'cancelled';
    if (!this.expectedDeliveryDate)
        return 'no_delivery_date';
    const now = new Date();
    const expected = new Date(this.expectedDeliveryDate);
    if (now > expected)
        return 'overdue';
    if (now <= expected)
        return 'on_time';
    return 'pending';
});
purchaseOrderSchema.virtual('daysUntilDelivery').get(function () {
    if (!this.expectedDeliveryDate || this.status === 'received' || this.status === 'cancelled') {
        return null;
    }
    const now = new Date();
    const expected = new Date(this.expectedDeliveryDate);
    const diff = expected.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});
purchaseOrderSchema.pre('save', async function (next) {
    if (this.isNew && !this.poNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        const lastPO = await this.constructor.findOne({
            poNumber: { $regex: `^PO-${year}${month}` }
        }).sort({ poNumber: -1 });
        let sequence = 1;
        if (lastPO) {
            const lastSequence = parseInt(lastPO.poNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        this.poNumber = `PO-${year}${month}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});
purchaseOrderSchema.pre('save', function (next) {
    if (this.items && this.items.length > 0) {
        this.totalAmount = this.items.reduce((total, item) => total + item.totalPrice, 0);
        this.items.forEach(item => {
            item.totalPrice = item.quantity * item.unitPrice;
        });
    }
    next();
});
purchaseOrderSchema.pre('save', function (next) {
    if (this.expectedDeliveryDate && this.isNew) {
        const now = new Date();
        if (this.expectedDeliveryDate < now) {
            throw new Error('Expected delivery date cannot be in the past');
        }
    }
    next();
});
purchaseOrderSchema.pre('save', function (next) {
    if (this.isModified('status') && this.status === 'received' && !this.actualDeliveryDate) {
        this.actualDeliveryDate = new Date();
    }
    next();
});
purchaseOrderSchema.methods.addItem = function (itemData) {
    const totalPrice = itemData.quantity * itemData.unitPrice;
    this.items.push({
        ...itemData,
        totalPrice
    });
    return this.save();
};
purchaseOrderSchema.methods.removeItem = function (productId) {
    this.items = this.items.filter(item => item.product.toString() !== productId);
    return this.save();
};
purchaseOrderSchema.methods.updateItemQuantity = function (productId, newQuantity) {
    const item = this.items.find(item => item.product.toString() === productId);
    if (!item) {
        throw new Error('Item not found in purchase order');
    }
    item.quantity = newQuantity;
    item.totalPrice = item.quantity * item.unitPrice;
    return this.save();
};
purchaseOrderSchema.methods.confirm = function () {
    if (this.status !== 'sent') {
        throw new Error('Only sent purchase orders can be confirmed');
    }
    this.status = 'confirmed';
    return this.save();
};
purchaseOrderSchema.methods.receive = function () {
    if (this.status !== 'confirmed') {
        throw new Error('Only confirmed purchase orders can be received');
    }
    this.status = 'received';
    this.actualDeliveryDate = new Date();
    return this.save();
};
purchaseOrderSchema.statics.getOverduePOs = async function () {
    const now = new Date();
    return this.find({
        expectedDeliveryDate: { $lt: now },
        status: { $in: ['sent', 'confirmed'] }
    }).populate('items.product').populate('createdBy');
};
purchaseOrderSchema.statics.getPOsByStatus = async function (status) {
    return this.find({ status }).populate('items.product').populate('createdBy');
};
exports.PurchaseOrder = mongoose_1.default.model('PurchaseOrder', purchaseOrderSchema);
//# sourceMappingURL=PurchaseOrder.js.map