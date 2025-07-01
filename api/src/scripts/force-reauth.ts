import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDB } from '../database/connection';

const checkAuthAndDebug = async () => {
  try {
    console.log('🔍 Debugging authentication issues...');

    await connectDB();

    // Find admin users
    const adminUsers = await User.find({ 
      role: { $in: ['admin', 'super_admin'] },
      status: 'active'
    });

    console.log(`\n📋 Found ${adminUsers.length} active admin user(s):`);
    
    adminUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Module Access:`);
      
      user.moduleAccess.forEach((module: any) => {
        console.log(`     - ${module.module}: ${module.access ? '✅' : '❌'} (${module.permission})`);
      });

      // Check if they have the required permissions
      const hasInventory = user.moduleAccess.some((m: any) => 
        m.module === 'inventory_management' && m.access
      );
      const hasPO = user.moduleAccess.some((m: any) => 
        m.module === 'purchase_orders' && m.access
      );

      console.log(`   Import Ready: ${hasInventory && hasPO ? '✅ YES' : '❌ NO'}`);
      
      if (!hasInventory || !hasPO) {
        console.log(`   Missing: ${!hasInventory ? 'inventory_management ' : ''}${!hasPO ? 'purchase_orders' : ''}`);
      }
    });

    // Generate a fresh token for the first admin user
    if (adminUsers.length > 0) {
      const firstAdmin = adminUsers[0];
      const token = firstAdmin.generateJWT();
      
      console.log(`\n🔑 Fresh token for ${firstAdmin.email}:`);
      console.log(`Bearer ${token}`);
      console.log('\n📝 To test manually, use this token in your API client headers.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
};

checkAuthAndDebug(); 