import mongoose from 'mongoose';
import { PurchaseOrder } from '../models/PurchaseOrder';

async function updatePurchaseOrderStatuses() {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Find all purchase orders that need status updates
    const purchaseOrdersToUpdate = await PurchaseOrder.find({
      status: { $nin: ['Approved & Order Sent to SAP', 'Credit Not Available', 'Fully Invoiced', 'Order Under Process', 'Partially Invoiced', 'Rejected'] }
    });

    console.log(`Found ${purchaseOrdersToUpdate.length} purchase orders that need status updates`);

    if (purchaseOrdersToUpdate.length === 0) {
      console.log('No purchase orders need updating');
      return;
    }

    let totalUpdated = 0;

    // Update statuses based on mapping
    const statusMapping = {
      'draft': 'Order Under Process',
      'sent': 'Order Under Process',
      'confirmed': 'Approved & Order Sent to SAP',
      'partially_received': 'Partially Invoiced',
      'received': 'Fully Invoiced',
      'cancelled': 'Rejected'
    };

    // Update each status individually
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const result = await PurchaseOrder.updateMany(
        { status: oldStatus },
        { $set: { status: newStatus } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} purchase orders from '${oldStatus}' to '${newStatus}'`);
        totalUpdated += result.modifiedCount;
      }
    }

    // Handle any remaining invalid statuses by setting them to 'Order Under Process'
    const remainingInvalid = await PurchaseOrder.find({
      status: { $nin: ['Approved & Order Sent to SAP', 'Credit Not Available', 'Fully Invoiced', 'Order Under Process', 'Partially Invoiced', 'Rejected'] }
    });

    if (remainingInvalid.length > 0) {
      const result = await PurchaseOrder.updateMany(
        { status: { $nin: ['Approved & Order Sent to SAP', 'Credit Not Available', 'Fully Invoiced', 'Order Under Process', 'Partially Invoiced', 'Rejected'] } },
        { $set: { status: 'Order Under Process' } }
      );
      console.log(`Updated ${result.modifiedCount} purchase orders with invalid statuses to 'Order Under Process'`);
      totalUpdated += result.modifiedCount;
    }

    // Verify the updates
    const updatedCount = await PurchaseOrder.countDocuments({
      status: { $in: ['Approved & Order Sent to SAP', 'Credit Not Available', 'Fully Invoiced', 'Order Under Process', 'Partially Invoiced', 'Rejected'] }
    });
    const totalCount = await PurchaseOrder.countDocuments();

    console.log(`\nMigration Summary:`);
    console.log(`Total purchase orders: ${totalCount}`);
    console.log(`Purchase orders with valid statuses: ${updatedCount}`);
    console.log(`Total updated: ${totalUpdated}`);

    // Show breakdown of new statuses
    const statusBreakdown = await PurchaseOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log(`\nStatus Breakdown:`);
    statusBreakdown.forEach(item => {
      console.log(`  ${item._id}: ${item.count}`);
    });

  } catch (error) {
    console.error('Error updating purchase order statuses:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updatePurchaseOrderStatuses().catch(console.error); 