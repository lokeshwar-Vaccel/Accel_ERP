import mongoose from 'mongoose';
import { PurchaseOrder } from '../models/PurchaseOrder';

async function updatePurchaseOrderTypes() {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    // Find all purchase orders that don't have a purchaseOrderType
    const purchaseOrdersWithoutType = await PurchaseOrder.find({ 
      purchaseOrderType: { $exists: false } 
    });

    console.log(`Found ${purchaseOrdersWithoutType.length} purchase orders without purchaseOrderType`);

    // Find all purchase orders that need department updates
    const purchaseOrdersWithoutValidDepartment = await PurchaseOrder.find({
      $or: [
        { department: { $exists: false } },
        { department: { $nin: ['Retail', 'Corporate', 'Industrial & Marine', 'Others'] } }
      ]
    });

    console.log(`Found ${purchaseOrdersWithoutValidDepartment.length} purchase orders that need department updates`);

    let totalUpdated = 0;

    // Update purchase order types
    if (purchaseOrdersWithoutType.length > 0) {
      const typeResult = await PurchaseOrder.updateMany(
        { purchaseOrderType: { $exists: false } },
        { $set: { purchaseOrderType: 'Commercial' } }
      );
      console.log(`Updated ${typeResult.modifiedCount} purchase orders with default type 'Commercial'`);
      totalUpdated += typeResult.modifiedCount;
    }

    // Update departments - map existing values to new ones
    if (purchaseOrdersWithoutValidDepartment.length > 0) {
      // First, update departments that can be mapped
      const mappingResult = await PurchaseOrder.updateMany(
        { department: 'Corporate (Telecom)' },
        { $set: { department: 'Corporate' } }
      );
      console.log(`Mapped ${mappingResult.modifiedCount} 'Corporate (Telecom)' to 'Corporate'`);

      const mappingResult2 = await PurchaseOrder.updateMany(
        { department: 'Industrial & Marine (IE)' },
        { $set: { department: 'Industrial & Marine' } }
      );
      console.log(`Mapped ${mappingResult2.modifiedCount} 'Industrial & Marine (IE)' to 'Industrial & Marine'`);

      // Then update any remaining invalid departments to 'Retail' as default
      const deptResult = await PurchaseOrder.updateMany(
        {
          $or: [
            { department: { $exists: false } },
            { department: { $nin: ['Retail', 'Corporate', 'Industrial & Marine', 'Others'] } }
          ]
        },
        { $set: { department: 'Retail' } }
      );
      console.log(`Updated ${deptResult.modifiedCount} purchase orders with default department 'Retail'`);
      totalUpdated += deptResult.modifiedCount;
    }

    if (totalUpdated === 0) {
      console.log('No purchase orders need updating');
      return;
    }

    // Verify the updates
    const updatedTypeCount = await PurchaseOrder.countDocuments({ purchaseOrderType: { $exists: true } });
    const updatedDeptCount = await PurchaseOrder.countDocuments({ 
      department: { $in: ['Retail', 'Corporate', 'Industrial & Marine', 'Others'] } 
    });
    const totalCount = await PurchaseOrder.countDocuments();
    
    console.log(`Total purchase orders: ${totalCount}`);
    console.log(`Purchase orders with type: ${updatedTypeCount}`);
    console.log(`Purchase orders with valid department: ${updatedDeptCount}`);

  } catch (error) {
    console.error('Error updating purchase order types and departments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
updatePurchaseOrderTypes().catch(console.error); 