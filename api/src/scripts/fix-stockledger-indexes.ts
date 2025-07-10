import 'dotenv/config';
import mongoose from 'mongoose';
import { StockLedger } from '../models/StockLedger';
import { connectDB } from '../database/connection';

const fixStockLedgerIndexes = async () => {
  try {
    // Connect to database
    await connectDB();

    // Get the collection
    const collection = StockLedger.collection;
    
    // List existing indexes
    const existingIndexes = await collection.getIndexes();
    
    // Drop the restrictive unique index if it exists
    const indexName = 'referenceId_1_location_1_transactionType_1';
    if (existingIndexes[indexName]) {
      await collection.dropIndex(indexName);
    } else {
      console.error(`ℹ️  Index ${indexName} not found, skipping drop`);
    }

    // Index for referenceId queries (not unique)
    await collection.createIndex({ referenceId: 1 });
    
    // Index for product and location queries
    await collection.createIndex({ product: 1, location: 1 });
    
    // Index for transaction type queries
    await collection.createIndex({ transactionType: 1 });
    
    // Index for date-based queries
    await collection.createIndex({ transactionDate: -1 });
    
    // Compound index for common query patterns
    await collection.createIndex({ product: 1, transactionDate: -1 });
    
    
    // List final indexes
    const finalIndexes = await collection.getIndexes();
    
  } catch (error) {
    console.error('❌ Error fixing Stock Ledger indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
};

// Run the script if called directly
if (require.main === module) {
  fixStockLedgerIndexes()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixStockLedgerIndexes }; 