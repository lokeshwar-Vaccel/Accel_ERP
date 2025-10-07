import mongoose from 'mongoose';
import { PurchaseOrder } from '../models/PurchaseOrder';

async function updateAllPurchaseOrderFields() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    console.log('Starting comprehensive update of Purchase Order fields...\n');

    // 1. Update Status field
    console.log('1. Updating Status field...');
    const statusMapping = {
      'Approved & Order Sent to SAP': 'approved_order_sent_sap',
      'Credit Not Available': 'credit_not_available',
      'Fully Invoiced': 'fully_invoiced',
      'Order Under Process': 'order_under_process',
      'Partially Invoiced': 'partially_invoiced',
      'Rejected': 'rejected'
    };

    let statusUpdated = 0;
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await PurchaseOrder.updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  - Updated ${result.modifiedCount} POs from '${oldStatus}' to '${newStatus}'`);
        statusUpdated += result.modifiedCount;
      }
    }

    // Handle any remaining invalid statuses
    const remainingInvalidStatuses = await PurchaseOrder.find({
      status: { $nin: Object.values(statusMapping) }
    });

    if (remainingInvalidStatuses.length > 0) {
      const result = await PurchaseOrder.updateMany(
        { status: { $nin: Object.values(statusMapping) } },
        { $set: { status: 'order_under_process' } }
      );
      console.log(`  - Updated ${result.modifiedCount} POs with invalid statuses to 'order_under_process'`);
      statusUpdated += result.modifiedCount;
    }

    console.log(`  Status field update complete. Total updated: ${statusUpdated}\n`);

    // 2. Update Department field
    console.log('2. Updating Department field...');
    const departmentMapping = {
      'Retail': 'retail',
      'Corporate': 'corporate',
      'Industrial & Marine': 'industrial_marine',
      'Others': 'others'
    };

    let departmentUpdated = 0;
    for (const [oldDepartment, newDepartment] of Object.entries(departmentMapping)) {
      const result = await PurchaseOrder.updateMany(
        { department: oldDepartment },
        { $set: { department: newDepartment } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  - Updated ${result.modifiedCount} POs from '${oldDepartment}' to '${newDepartment}'`);
        departmentUpdated += result.modifiedCount;
      }
    }

    // Handle any remaining invalid departments
    const remainingInvalidDepartments = await PurchaseOrder.find({
      department: { $nin: Object.values(departmentMapping) }
    });

    if (remainingInvalidDepartments.length > 0) {
      const result = await PurchaseOrder.updateMany(
        { department: { $nin: Object.values(departmentMapping) } },
        { $set: { department: 'retail' } }
      );
      console.log(`  - Updated ${result.modifiedCount} POs with invalid departments to 'retail'`);
      departmentUpdated += result.modifiedCount;
    }

    console.log(`  Department field update complete. Total updated: ${departmentUpdated}\n`);

    // 3. Update Purchase Order Type field
    console.log('3. Updating Purchase Order Type field...');
    const purchaseOrderTypeMapping = {
      'Commercial': 'commercial',
      'Breakdown Order': 'breakdown_order'
    };

    let purchaseOrderTypeUpdated = 0;
    for (const [oldType, newType] of Object.entries(purchaseOrderTypeMapping)) {
      const result = await PurchaseOrder.updateMany(
        { purchaseOrderType: oldType },
        { $set: { purchaseOrderType: newType } }
      );
      if (result.modifiedCount > 0) {
        console.log(`  - Updated ${result.modifiedCount} POs from '${oldType}' to '${newType}'`);
        purchaseOrderTypeUpdated += result.modifiedCount;
      }
    }

    // Handle any remaining invalid purchase order types
    const remainingInvalidTypes = await PurchaseOrder.find({
      purchaseOrderType: { $nin: Object.values(purchaseOrderTypeMapping) }
    });

    if (remainingInvalidTypes.length > 0) {
      const result = await PurchaseOrder.updateMany(
        { purchaseOrderType: { $nin: Object.values(purchaseOrderTypeMapping) } },
        { $set: { purchaseOrderType: 'commercial' } }
      );
      console.log(`  - Updated ${result.modifiedCount} POs with invalid types to 'commercial'`);
      purchaseOrderTypeUpdated += result.modifiedCount;
    }

    console.log(`  Purchase Order Type field update complete. Total updated: ${purchaseOrderTypeUpdated}\n`);

    // 4. Set default values for missing fields
    console.log('4. Setting default values for missing fields...');
    
    // Set default status for POs without status
    const statusResult = await PurchaseOrder.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'order_under_process' } }
    );
    if (statusResult.modifiedCount > 0) {
      console.log(`  - Set default status 'order_under_process' for ${statusResult.modifiedCount} POs`);
    }

    // Set default department for POs without department
    const deptResult = await PurchaseOrder.updateMany(
      { department: { $exists: false } },
      { $set: { department: 'retail' } }
    );
    if (deptResult.modifiedCount > 0) {
      console.log(`  - Set default department 'retail' for ${deptResult.modifiedCount} POs`);
    }

    // Set default purchase order type for POs without purchaseOrderType
    const typeResult = await PurchaseOrder.updateMany(
      { purchaseOrderType: { $exists: false } },
      { $set: { purchaseOrderType: 'commercial' } }
    );
    if (typeResult.modifiedCount > 0) {
      console.log(`  - Set default purchase order type 'commercial' for ${typeResult.modifiedCount} POs`);
    }

    // 5. Verification
    console.log('5. Verifying updates...');
    const totalPOs = await PurchaseOrder.countDocuments();
    
    const validStatusCount = await PurchaseOrder.countDocuments({
      status: { $in: Object.values(statusMapping) }
    });
    
    const validDepartmentCount = await PurchaseOrder.countDocuments({
      department: { $in: Object.values(departmentMapping) }
    });
    
    const validTypeCount = await PurchaseOrder.countDocuments({
      purchaseOrderType: { $in: Object.values(purchaseOrderTypeMapping) }
    });

    console.log(`  Total Purchase Orders: ${totalPOs}`);
    console.log(`  POs with valid status: ${validStatusCount}`);
    console.log(`  POs with valid department: ${validDepartmentCount}`);
    console.log(`  POs with valid purchase order type: ${validTypeCount}`);

    // 6. Show breakdown of new values
    console.log('\n6. Field value breakdown:');
    
    const statusBreakdown = await PurchaseOrder.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const departmentBreakdown = await PurchaseOrder.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const typeBreakdown = await PurchaseOrder.aggregate([
      { $group: { _id: '$purchaseOrderType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n  Status breakdown:');
    statusBreakdown.forEach(item => {
      console.log(`    ${item._id}: ${item.count}`);
    });

    console.log('\n  Department breakdown:');
    departmentBreakdown.forEach(item => {
      console.log(`    ${item._id}: ${item.count}`);
    });

    console.log('\n  Purchase Order Type breakdown:');
    typeBreakdown.forEach(item => {
      console.log(`    ${item._id}: ${item.count}`);
    });

    console.log('\n✅ Migration completed successfully!');
    console.log(`\nSummary:`);
    console.log(`- Status field: ${statusUpdated} updated`);
    console.log(`- Department field: ${departmentUpdated} updated`);
    console.log(`- Purchase Order Type field: ${purchaseOrderTypeUpdated} updated`);

  } catch (error) {
    console.error('Error updating purchase order fields:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
updateAllPurchaseOrderFields().catch(console.error); 