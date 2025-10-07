import mongoose, { Schema, Document, Model } from 'mongoose';

// 1. Define a TypeScript interface representing the document structure
export interface ITransactionCounter extends Document {
  type: string;    // e.g., "adjustment", "transfer"
  date: string;    // e.g., "250627"
  letter: string;  // e.g., "A" to "Z"
  sequence: number;
}

// 2. Create the schema with correct typing
const transactionCounterSchema: Schema<ITransactionCounter> = new Schema({
  type: { type: String, required: true },
  date: { type: String, required: true },
  letter: { type: String, required: true },
  sequence: { type: Number, default: 0 },
});

// 3. Add a compound unique index
transactionCounterSchema.index({ type: 1, date: 1, letter: 1 }, { unique: true });

// 4. Export the model with proper generic types
export const TransactionCounter: Model<ITransactionCounter> = mongoose.model<ITransactionCounter>('TransactionCounter', transactionCounterSchema);
