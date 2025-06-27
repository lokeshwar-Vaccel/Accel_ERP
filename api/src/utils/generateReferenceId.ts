import { TransactionCounter } from '../models/TransactionCounter';

export const generateReferenceId = async (type: string): Promise<string> => {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // e.g., "250627"
  const prefix = type === 'adjustment' ? 'AD' : 'TF';
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