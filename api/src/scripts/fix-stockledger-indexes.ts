import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../database/connection';

const fixStockLedgerIndexes = async () => {
  try {
    console.log('🔧 Starting StockLedger index fix...');
    
    // Connect to database
    await connectDB();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    const collection = db.collection('stockledgers');
    
    console.log('📊 Checking current indexes...');
    const currentIndexes = await collection.indexes();
    console.log('Current indexes:', currentIndexes.map(idx => ({ name: idx.name, key: idx.key })));
    
    // Drop the problematic unique index on referenceId
    try {
      console.log('🗑️ Dropping old unique index on referenceId...');
      await collection.dropIndex('referenceId_1');
      console.log('✅ Old index dropped successfully');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('ℹ️ Index referenceId_1 does not exist (already dropped)');
      } else {
        console.warn('⚠️ Could not drop old index:', error.message);
      }
    }
    
    // Create new compound unique index
    console.log('🔨 Creating new compound unique index...');
    try {
      await collection.createIndex(
        { 
          referenceId: 1, 
          location: 1, 
          transactionType: 1 
        }, 
        { 
          unique: true,
          name: 'referenceId_location_transactionType_unique'
        }
      );
      console.log('✅ New compound unique index created successfully');
    } catch (error: any) {
      if (error.code === 85) {
        console.log('ℹ️ Compound index already exists');
      } else {
        console.error('❌ Error creating new index:', error.message);
        throw error;
      }
    }
    
    // Verify new indexes
    console.log('\n📊 Verifying updated indexes...');
    const updatedIndexes = await collection.indexes();
    console.log('Updated indexes:');
    updatedIndexes.forEach(idx => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''}`);
    });
    
    console.log('\n✅ StockLedger index fix completed successfully');
    console.log('📋 Now stock transfers can create paired entries with the same referenceId');
    
  } catch (error) {
    console.error('❌ Error fixing StockLedger indexes:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run if called directly
if (require.main === module) {
  fixStockLedgerIndexes()
    .then(() => {
      console.log('✅ Index fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Index fix failed:', error);
      process.exit(1);
    });
}

export default fixStockLedgerIndexes; 