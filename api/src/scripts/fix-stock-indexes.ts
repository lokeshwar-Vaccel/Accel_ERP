import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fixStockIndexes = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-services-erp';
    await mongoose.connect(mongoURI);

    console.log('Connected to MongoDB');

    // Get the database instance
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }
    const collection = db.collection('stocks');

    console.log('Fixing stock indexes...');

    // Drop the problematic legacy index if it exists
    try {
      await collection.dropIndex('product_1_location_1');
      console.log('✅ Dropped legacy index: product_1_location_1');
    } catch (error: any) {
      if (error.code === 27) {
        console.log('ℹ️  Legacy index product_1_location_1 does not exist');
      } else {
        console.log('⚠️  Error dropping legacy index:', error.message);
      }
    }

    // Drop any other problematic indexes that might exist
    const indexesToDrop = [
      'product_1_location_1_room_1',
      'product_1_location_1_rack_1',
      'product_1_location_1_room_1_rack_1',
      'product_1_location_1_roomId_1_rackId_1',
      'roomId_1',
      'rackId_1'
    ];

    for (const indexName of indexesToDrop) {
      try {
        await collection.dropIndex(indexName);
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (error: any) {
        if (error.code === 27) {
          console.log(`ℹ️  Index ${indexName} does not exist`);
        } else {
          console.log(`⚠️  Error dropping index ${indexName}:`, error.message);
        }
      }
    }

    // Create the correct compound unique index
    try {
      await collection.createIndex(
        { product: 1, location: 1, room: 1, rack: 1 },
        { unique: true, name: 'product_location_room_rack_unique' }
      );
      console.log('✅ Created compound unique index: product_location_room_rack_unique');
    } catch (error: any) {
      console.log('⚠️  Error creating compound index:', error.message);
    }

    // Create other helpful indexes
    try {
      await collection.createIndex({ product: 1 }, { name: 'product_index' });
      console.log('✅ Created index: product_index');
    } catch (error: any) {
      console.log('⚠️  Error creating product index:', error.message);
    }

    try {
      await collection.createIndex({ location: 1 }, { name: 'location_index' });
      console.log('✅ Created index: location_index');
    } catch (error: any) {
      console.log('⚠️  Error creating location index:', error.message);
    }

    // List all indexes to verify
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach((index: any) => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Stock indexes fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing stock indexes:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  fixStockIndexes();
}

export default fixStockIndexes; 