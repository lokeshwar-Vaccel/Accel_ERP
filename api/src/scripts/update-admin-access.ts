import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserRole } from '../types';
import { connectDB } from '../database/connection';

const updateSuperAdminAccess = async () => {
  try {
    console.log('🔧 Updating SUPER_ADMIN users with invoice management access...');

    // Connect to database
    await connectDB();

    // Find all SUPER_ADMIN users
    const superAdmins = await User.find({ role: UserRole.SUPER_ADMIN });
    
    if (superAdmins.length === 0) {
      console.log('⚠️  No SUPER_ADMIN users found');
      return;
    }

    console.log(`📋 Found ${superAdmins.length} SUPER_ADMIN user(s)`);

    // Update each super admin
    for (const admin of superAdmins) {
      console.log(`👤 Updating user: ${admin.firstName} ${admin.lastName} (${admin.email})`);
      
      // Check if invoice_management already exists
      const hasInvoiceAccess = admin.moduleAccess.some(
        (module: any) => module.module === 'invoice_management'
      );

      if (hasInvoiceAccess) {
        console.log('   ✅ Already has invoice management access');
        continue;
      }

      // Add invoice management access
      admin.moduleAccess.push({
        module: 'invoice_management',
        access: true,
        permission: 'admin'
      });

      await admin.save();
      console.log('   ✅ Added invoice management access');
    }

    // Verify the update
    console.log('\n🔍 Verification - Current SUPER_ADMIN module access:');
    const updatedAdmins = await User.find({ role: UserRole.SUPER_ADMIN });
    
    updatedAdmins.forEach((admin, index) => {
      console.log(`\n${index + 1}. ${admin.firstName} ${admin.lastName} (${admin.email}):`);
      admin.moduleAccess.forEach((module: any) => {
        console.log(`   - ${module.module}: ${module.access ? '✅' : '❌'} (${module.permission})`);
      });
    });

    console.log('\n🎉 Successfully updated all SUPER_ADMIN users!');
    console.log('🚀 Invoice Management should now be visible in the sidebar for superadmins');

  } catch (error) {
    console.error('❌ Error updating super admin access:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('📶 Database connection closed');
  }
};

// Run the script
if (require.main === module) {
  updateSuperAdminAccess()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { updateSuperAdminAccess }; 