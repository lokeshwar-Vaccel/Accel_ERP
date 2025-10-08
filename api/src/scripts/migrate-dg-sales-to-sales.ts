import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

async function migrateDGSalesToSales() {
  try {
    console.log('🔄 Starting migration: dg_sales to sales...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find all users with dg_sales module access
    const usersWithDGSales = await User.find({
      'moduleAccess.module': 'dg_sales'
    });

    console.log(`📊 Found ${usersWithDGSales.length} users with dg_sales module access`);

    if (usersWithDGSales.length === 0) {
      console.log('✅ No users found with dg_sales module access. Migration not needed.');
      return;
    }

    // Update each user's module access using MongoDB update operators
    let updatedCount = 0;
    for (const user of usersWithDGSales) {
      // Use MongoDB's positional operator to update the specific moduleAccess entry
      const result = await User.updateOne(
        { 
          _id: user._id,
          'moduleAccess.module': 'dg_sales'
        },
        { 
          $set: { 'moduleAccess.$.module': 'sales' }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`✅ Updated user: ${user.email} (${user.firstName} ${user.lastName})`);
      } else {
        console.log(`⚠️  Failed to update user: ${user.email}`);
      }
    }

    console.log(`🎉 Migration completed successfully!`);
    console.log(`📈 Updated ${updatedCount} users`);

    // Verify the migration
    const remainingDGSalesUsers = await User.find({
      'moduleAccess.module': 'dg_sales'
    });

    if (remainingDGSalesUsers.length === 0) {
      console.log('✅ Verification passed: No users have dg_sales module access anymore');
    } else {
      console.log(`⚠️  Warning: ${remainingDGSalesUsers.length} users still have dg_sales module access`);
    }

    // Check how many users now have sales module access
    const usersWithSales = await User.find({
      'moduleAccess.module': 'sales'
    });
    console.log(`📊 ${usersWithSales.length} users now have sales module access`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateDGSalesToSales()
    .then(() => {
      console.log('✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateDGSalesToSales };
