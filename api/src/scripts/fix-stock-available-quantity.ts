import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../database/connection';
import { Stock } from '../models/Stock';

const fixStockAvailableQuantity = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // First, show current problematic records
    
    const problematicRecords = await Stock.find({
      $expr: {
        $ne: ["$availableQuantity", { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] }]
      }
    }, {
      product: 1,
      location: 1,
      quantity: 1, 
      reservedQuantity: 1, 
      availableQuantity: 1
    }).limit(5);
    
    // Fix all records
    const result = await Stock.updateMany(
      {},
      [
        {
          $set: {
            availableQuantity: { 
              $max: [0, { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] }] 
            },
            lastUpdated: new Date()
          }
        }
      ]
    );
    
  } catch (error) {
    console.error('❌ Error fixing stock availableQuantity:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  fixStockAvailableQuantity()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

export default fixStockAvailableQuantity; 