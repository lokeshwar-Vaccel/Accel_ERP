import { TransactionCounter } from '../models/TransactionCounter';

export const generateReferenceId = async (type: string): Promise<string> => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // e.g., "250627"
  let prefix = 'TF'; // Default for transfer
  
  if (type === 'adjustment') prefix = 'AD';
  else if (type === 'purchase_receipt') prefix = 'PR';
  else if (type === 'reservation') prefix = 'RS';
  else if (type === 'quotation') prefix = 'QT';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  // Find the latest counter for the type and date
  const latestCounter = await TransactionCounter.findOne({ type, date })
    .sort({ letter: -1, sequence: -1 })
    .lean();
  
  let letter = 'A';
  let sequence = 1;

  if (latestCounter) {
    if (latestCounter.sequence < 999999) {
      letter = latestCounter.letter;
      sequence = latestCounter.sequence + 1;
    } else {
      const nextLetterIndex = letters.indexOf(latestCounter.letter) + 1;
      if (nextLetterIndex >= letters.length) {
        throw new Error('Letter sequence exhausted for the day');
      }
      letter = letters[nextLetterIndex];
      sequence = 1;
    }
  }

  const counter = await TransactionCounter.findOneAndUpdate(
    { type, date, letter },
    { $set: { sequence } },
    { upsert: true, new: true }
  );

  return `${prefix}${date}-${letter}-${counter.sequence.toString().padStart(6, '0')}`; // e.g., "AD250627-A-123456"
};

// Generate delivery challan number in format: DC2025090001
export const generateDeliveryChallanNumber = async (): Promise<string> => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const dateKey = `${year}${month}`;
  
  // Use findOneAndUpdate with $inc to atomically increment the sequence
  // This prevents race conditions when multiple challans are created simultaneously
  const result = await TransactionCounter.findOneAndUpdate(
    { type: 'delivery_challan', date: dateKey, letter: 'A' },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true }
  );

  return `DC${dateKey}${result.sequence.toString().padStart(4, '0')}`;
};

