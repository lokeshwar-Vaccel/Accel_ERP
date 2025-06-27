import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../database/connection';
import { Stock } from '../models/Stock';

const fixStockAvailableQuantity = async () => {
  try {
    console.log('🔧 Starting stock availableQuantity fix...');
    
    // Connect to database
    await connectDB();
    
    // First, show current problematic records
    console.log('📊 Analyzing current stock data...');
    
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
    
    console.log(`📋 Found ${problematicRecords.length} problematic records (showing first 5):`);
    problematicRecords.forEach((record, index) => {
      const calculatedAvailable = record.quantity - (record.reservedQuantity || 0);
      console.log(`   ${index + 1}. Qty: ${record.quantity}, Reserved: ${record.reservedQuantity}, Backend Available: ${record.availableQuantity}, Should Be: ${calculatedAvailable}`);
    });
    
    // Fix all records
    console.log('\n🔧 Fixing availableQuantity for all stock records...');
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
    
    console.log(`✅ Fixed ${result.modifiedCount} stock records`);
    
    // Verify the fix
    console.log('\n📊 Verifying fix with sample records:');
    const verifyRecords = await Stock.find({}, {
      quantity: 1, 
      reservedQuantity: 1, 
      availableQuantity: 1
    }).limit(5);
    
    verifyRecords.forEach((record, index) => {
      const calculatedAvailable = record.quantity - (record.reservedQuantity || 0);
      const isCorrect = record.availableQuantity === calculatedAvailable;
      console.log(`   ${index + 1}. Qty: ${record.quantity}, Reserved: ${record.reservedQuantity}, Available: ${record.availableQuantity} ${isCorrect ? '✅' : '❌'}`);
    });
    
    // Final validation - check if any records are still incorrect
    const remainingProblematic = await Stock.countDocuments({
      $expr: {
        $ne: ["$availableQuantity", { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] }]
      }
    });
    
    if (remainingProblematic === 0) {
      console.log('\n🎉 All stock records now have correct availableQuantity values!');
    } else {
      console.log(`\n⚠️  Warning: ${remainingProblematic} records still have incorrect values`);
    }
    
    console.log('\n✅ Stock availableQuantity fix completed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing stock availableQuantity:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
};

// Run if called directly
if (require.main === module) {
  fixStockAvailableQuantity()
    .then(() => {
      console.log('✅ Fix completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fix failed:', error);
      process.exit(1);
    });
}

export default fixStockAvailableQuantity; 