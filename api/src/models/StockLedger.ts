import { Schema, model } from 'mongoose';
import { IStockLedger, StockTransactionType } from '../types';

const stockLedgerSchema = new Schema<IStockLedger>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    location: { type: Schema.Types.ObjectId, ref: 'StockLocation', required: true },
    transactionType: { type: String, enum: Object.values(StockTransactionType), required: true },
    quantity: { type: Number, required: true },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    transactionDate: { type: Date, default: Date.now },
    resultingQuantity: { type: Number, required: true },
    referenceId: { type: String, required: true }, // e.g., "AD250627-A-123456"
    referenceType: { type: String, enum: ['purchase_order', 'service_ticket', 'adjustment', 'transfer', 'sale'] },
  },
  { timestamps: true }
);

stockLedgerSchema.index({ referenceId: 1 }, { unique: true });

export const StockLedger = model<IStockLedger>('StockLedger', stockLedgerSchema);