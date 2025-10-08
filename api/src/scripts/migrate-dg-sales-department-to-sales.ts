import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

async function migrateDGSalesDepartmentToSales() {
  try {
    console.log('🔄 Starting migration: dg_sales department to sales...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find all users with dg_sales department
    const usersWithDGSalesDepartment = await User.find({
      department: 'dg_sales'
    });

    console.log(`📊 Found ${usersWithDGSalesDepartment.length} users with dg_sales department`);

    if (usersWithDGSalesDepartment.length === 0) {
      console.log('✅ No users found with dg_sales department. Migration not needed.');
      return;
    }

    // Update each user's department
    const result = await User.updateMany(
      { department: 'dg_sales' },
      { $set: { department: 'sales' } }
    );

    console.log(`🎉 Migration completed successfully!`);
    console.log(`📈 Updated ${result.modifiedCount} users`);

    // Verify the migration
    const remainingDGSalesUsers = await User.find({
      department: 'dg_sales'
    });

    if (remainingDGSalesUsers.length === 0) {
      console.log('✅ Verification passed: No users have dg_sales department anymore');
    } else {
      console.log(`⚠️  Warning: ${remainingDGSalesUsers.length} users still have dg_sales department`);
    }

    // Check how many users now have sales department
    const usersWithSalesDepartment = await User.find({
      department: 'sales'
    });
    console.log(`📊 ${usersWithSalesDepartment.length} users now have sales department`);

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
  migrateDGSalesDepartmentToSales()
    .then(() => {
      console.log('✅ Department migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Department migration script failed:', error);
      process.exit(1);
    });
}

export { migrateDGSalesDepartmentToSales };
