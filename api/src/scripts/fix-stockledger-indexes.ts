import 'dotenv/config';
import mongoose from 'mongoose';
import { StockLedger } from '../models/StockLedger';
import { connectDB } from '../database/connection';

const fixStockLedgerIndexes = async () => {
  try {
    console.log('🔧 Starting Stock Ledger index fix...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Get the collection
    const collection = StockLedger.collection;
    
    // List existing indexes
    const existingIndexes = await collection.getIndexes();
    console.log('📋 Existing indexes:', Object.keys(existingIndexes));
    
    // Drop the restrictive unique index if it exists
    const indexName = 'referenceId_1_location_1_transactionType_1';
    if (existingIndexes[indexName]) {
      console.log(`🗑️  Dropping restrictive index: ${indexName}`);
      await collection.dropIndex(indexName);
      console.log('✅ Index dropped successfully');
    } else {
      console.log(`ℹ️  Index ${indexName} not found, skipping drop`);
    }

    // Create new, more flexible indexes for better query performance
    console.log('🔨 Creating new indexes...');
    
    // Index for referenceId queries (not unique)
    await collection.createIndex({ referenceId: 1 });
    console.log('✅ Created referenceId index');
    
    // Index for product and location queries
    await collection.createIndex({ product: 1, location: 1 });
    console.log('✅ Created product_location index');
    
    // Index for transaction type queries
    await collection.createIndex({ transactionType: 1 });
    console.log('✅ Created transactionType index');
    
    // Index for date-based queries
    await collection.createIndex({ transactionDate: -1 });
    console.log('✅ Created transactionDate index');
    
    // Compound index for common query patterns
    await collection.createIndex({ product: 1, transactionDate: -1 });
    console.log('✅ Created product_date index');
    
    console.log('🎉 Stock Ledger indexes fixed successfully!');
    
    // List final indexes
    const finalIndexes = await collection.getIndexes();
    console.log('📋 Final indexes:', Object.keys(finalIndexes));
    
  } catch (error) {
    console.error('❌ Error fixing Stock Ledger indexes:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
};

// Run the script if called directly
if (require.main === module) {
  fixStockLedgerIndexes()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { fixStockLedgerIndexes }; 