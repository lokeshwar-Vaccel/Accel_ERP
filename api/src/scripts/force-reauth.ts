import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

const checkAuthAndDebug = async () => {
  try {
    await connectDB();

    // Find admin users
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'super_admin'] },
      status: 'active'
    });

    adminUsers.forEach((user, index) => {
      

      // Check if they have the required permissions
      const hasInventory = user.moduleAccess.some((m: any) => 
        m.module === 'inventory_management' && m.access
      );
      const hasPO = user.moduleAccess.some((m: any) => 
        m.module === 'purchase_orders' && m.access
      );

    });

    // Generate a fresh token for the first admin user
    if (adminUsers.length > 0) {
      const firstAdmin = adminUsers[0];
      const token = firstAdmin.generateJWT();
      
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkAuthAndDebug(); 