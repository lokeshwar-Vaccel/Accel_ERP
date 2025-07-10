import mongoose from 'mongoose';
import { User } from '../models/User';
import { UserRole } from '../types';
import { connectDB } from '../database/connection';

const updateSuperAdminAccess = async () => {
  try {
    // Connect to database
    await connectDB();

    // Find all SUPER_ADMIN users
    const superAdmins = await User.find({ role: UserRole.SUPER_ADMIN });
    
    if (superAdmins.length === 0) {
      return;
    }

    // Update each super admin
    for (const admin of superAdmins) {
      // Check if billing already exists
      const hasInvoiceAccess = admin.moduleAccess.some(
        (module: any) => module.module === 'billing'
      );

      if (hasInvoiceAccess) {
        continue;
      }

      // Add invoice management access
      admin.moduleAccess.push({
        module: 'billing',
        access: true,
        permission: 'admin'
      });

      await admin.save();
    }

    // Verify the update
    const updatedAdmins = await User.find({ role: UserRole.SUPER_ADMIN });
    

  } catch (error) {
    console.error('❌ Error updating super admin access:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
  }
};

// Run the script
if (require.main === module) {
  updateSuperAdminAccess()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { updateSuperAdminAccess }; 