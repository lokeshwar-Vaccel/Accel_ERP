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
    performedBy: { type: Schema.Types.ObjectId, ref: 'User'},//, required: true 
    transactionDate: { type: Date, default: Date.now },
    resultingQuantity: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    referenceId: { type: String}, // e.g., "AD250627-A-123456"   //, required: true 
    referenceType: { type: String, enum: ['purchase_order', 'service_ticket', 'adjustment', 'transfer', 'sale', 'reservation', 'delivery_challan'] },
  },
  { timestamps: true }
);

// Indexes for better query performance
stockLedgerSchema.index({ referenceId: 1 });
stockLedgerSchema.index({ product: 1, location: 1 });
stockLedgerSchema.index({ transactionType: 1 });
stockLedgerSchema.index({ transactionDate: -1 });
stockLedgerSchema.index({ product: 1, transactionDate: -1 });

export const StockLedger = model<IStockLedger>('StockLedger', stockLedgerSchema);