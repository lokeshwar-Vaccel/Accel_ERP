import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

const grantPermissionsToUser = async (user: any) => {
  console.log(`👤 Processing user: ${user.firstName} ${user.lastName} (${user.email})`);
  
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
    console.log('   ✅ Added inventory_management access');
    updated = true;
  } else {
    console.log('   ℹ️  Already has inventory_management access');
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
    console.log('   ✅ Added purchase_orders access');
    updated = true;
  } else {
    console.log('   ℹ️  Already has purchase_orders access');
  }

  if (updated) {
    await user.save();
    console.log('   💾 Saved user permissions');
  }
};

const grantInventoryAccess = async () => {
  try {
    console.log('🔧 Granting inventory_management and purchase_orders access...');

    // Connect to database
    await connectDB();

    // First try to find admin users
    let users = await User.find({ role: { $in: ['admin', 'super_admin'] } });
    
    if (users.length === 0) {
      console.log('❌ No admin users found. Looking for any user...');
      users = await User.find({});
      
      if (users.length === 0) {
        console.log('❌ No users found at all!');
        return;
      }
      
      console.log('📋 Found users:');
      users.forEach((u, i) => {
        console.log(`${i + 1}. ${u.firstName} ${u.lastName} (${u.email}) - Role: ${u.role}`);
      });
    }

    console.log(`\n🔄 Processing ${users.length} user(s)...`);
    
    // Grant permissions to all found users
    for (const user of users) {
      await grantPermissionsToUser(user);
    }

    console.log('\n🎉 Permissions updated successfully!');
    console.log('ℹ️  Please refresh your browser and re-login to use the import feature.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

grantInventoryAccess(); 