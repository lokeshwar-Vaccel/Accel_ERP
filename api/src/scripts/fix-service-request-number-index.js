const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sun-power-services-erp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixServiceRequestNumberIndex() {
  try {
    console.log('Connected to MongoDB');
    
    // Wait for connection to be ready
    await mongoose.connection.asPromise();
    
    // Get the database
    const db = mongoose.connection.db;
    
    // List all indexes on servicetickets collection
    console.log('\n=== Current Indexes on servicetickets collection ===');
    const indexes = await db.collection('servicetickets').indexes();
    indexes.forEach(idx => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    // Check if serviceRequestNumber_1 index exists
    const serviceRequestNumberIndex = indexes.find(idx => idx.name === 'serviceRequestNumber_1');
    
    if (serviceRequestNumberIndex) {
      console.log('\n⚠️  Found problematic index: serviceRequestNumber_1');
      console.log('This index is causing duplicate key errors for null values');
      
      // Drop the problematic index
      console.log('\n🗑️  Dropping serviceRequestNumber_1 index...');
      await db.collection('servicetickets').dropIndex('serviceRequestNumber_1');
      console.log('✅ Successfully dropped serviceRequestNumber_1 index');
    } else {
      console.log('\n✅ No problematic serviceRequestNumber_1 index found');
    }
    
    // Check if ServiceRequestNumber index exists (the correct one)
    const ServiceRequestNumberIndex = indexes.find(idx => idx.name === 'ServiceRequestNumber_1');
    
    if (!ServiceRequestNumberIndex) {
      console.log('\n📝 Creating correct ServiceRequestNumber index...');
      await db.collection('servicetickets').createIndex({ ServiceRequestNumber: 1 });
      console.log('✅ Successfully created ServiceRequestNumber index');
    } else {
      console.log('\n✅ Correct ServiceRequestNumber index already exists');
    }
    
    // List remaining indexes to verify
    console.log('\n=== Updated Indexes on servicetickets collection ===');
    const updatedIndexes = await db.collection('servicetickets').indexes();
    updatedIndexes.forEach(idx => {
      console.log(`- ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n🎉 Index cleanup completed successfully!');
    
  } catch (error) {
    if (error.code === 26) {
      console.log('Index does not exist, no action needed');
    } else {
      console.error('❌ Error fixing indexes:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

fixServiceRequestNumberIndex(); 