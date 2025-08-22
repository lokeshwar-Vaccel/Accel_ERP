const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/sun-power-services-erp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function dropTicketNumberIndex() {
  try {
    console.log('Connected to MongoDB');
    
    // Wait for connection to be ready
    await mongoose.connection.asPromise();
    
    // Get the database
    const db = mongoose.connection.db;
    
    // Drop the ticketNumber index
    const result = await db.collection('servicetickets').dropIndex('ticketNumber_1');
    console.log('Successfully dropped ticketNumber index:', result);
    
    // List remaining indexes to verify
    const indexes = await db.collection('servicetickets').indexes();
    console.log('Remaining indexes:', indexes.map(idx => idx.name));
    
  } catch (error) {
    if (error.code === 26) {
      console.log('Index ticketNumber_1 does not exist, no action needed');
    } else {
      console.error('Error dropping index:', error);
    }
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
}

dropTicketNumberIndex(); 