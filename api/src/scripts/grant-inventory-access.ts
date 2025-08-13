import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

const grantPermissionsToUser = async (user: any) => {
  
  let updated = false;
  
  // Add inventory_management access
  const hasInventoryAccess = user.moduleAccess.some(
    (m: any) => m.module === 'inventory_management'
  );

  if (!hasInventoryAccess) {
    user.moduleAccess.push({
      module: 'inventory_management',
      access: true,
      permission: 'write'
    });
    updated = true;
  } else {
    console.error('   ℹ️  Already has inventory_management access');
  }

  // Add purchase_orders access (this is where the import route is)
  const hasPOAccess = user.moduleAccess.some(
    (m: any) => m.module === 'purchase_orders'
  );

  if (!hasPOAccess) {
    user.moduleAccess.push({
      module: 'purchase_orders', 
      access: true,
      permission: 'write'
    });
    updated = true;
  } else {
    console.error('   ℹ️  Already has purchase_orders access');
  }

  if (updated) {
    await user.save();
  }
};

const grantInventoryAccess = async () => {
  try {

    // Connect to database
    await connectDB();

    // First try to find admin users
    let users = await User.find({ role: { $in: ['admin', 'super_admin'] } });
    
    if (users.length === 0) {
      users = await User.find({});
      
      if (users.length === 0) {
        return;
      }
      
      users.forEach((u, i) => {
      });
    }

    
    // Grant permissions to all found users
    for (const user of users) {
      await grantPermissionsToUser(user);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

grantInventoryAccess(); 