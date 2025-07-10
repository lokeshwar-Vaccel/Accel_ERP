import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sunpower';
const FIXED_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

// Map for racks/rooms if you want to resolve by name, otherwise use random/fixed ObjectIds
const DUMMY_LOCATION_ID = new mongoose.Types.ObjectId('100000000000000000000001');
const DUMMY_ROOM_ID = new mongoose.Types.ObjectId('100000000000000000000002');
const DUMMY_RACK_ID = new mongoose.Types.ObjectId('100000000000000000000003');

const excelProducts = [
  {
    partNo: '0021751290J-LOM', name: 'OIL FILTER 5kva', description: 'OIL FILTER 5kva', quantity: 33, rack: 'E2', room: 'ROOM 3', hsnNumber: '84212300', dept: 'RETAIL', productType1: 'CONSUMABLE', productType2: 'CPCB1', make: 'MAHINDRA', gst: 18, gndp: 100, price: 50, gndpTotal: 1650
  },
  {
    partNo: '007303800B-LOM', name: 'FUEL FILTER 5kva', description: 'FUEL FILTER 5kva', quantity: 53, rack: 'E3', room: 'ROOM 3', hsnNumber: '84212300', dept: 'RETAIL', productType1: 'CONSUMABLE', productType2: 'CPCB2', make: 'MAHINDRA', gst: 18, gndp: 110, price: 110, gndpTotal: 3180
  },
  {
    partNo: '0021002340-LOM', name: 'O RING 5KVA ORIGINAL ORDER', description: 'O RING 5KVA ORIGINAL ORDER', quantity: 24, rack: 'E2', room: 'ROOM 3', hsnNumber: '84212300', dept: 'RETAIL', productType1: 'CONSUMABLE', productType2: 'CPCB4', make: 'KOEL', gst: 18, gndp: 50, price: 60, gndpTotal: 960
  },
  {
    partNo: '056851390-LOM', name: 'FEED PUMP WITH FILTER 5 KVA', description: 'FEED PUMP WITH FILTER 5 KVA', quantity: 12, rack: 'E3', room: 'ROOM 3', hsnNumber: '85443000', dept: 'RETAIL', productType1: 'CRITICAL', productType2: 'CPCB4', make: 'KOEL', gst: 28, gndp: 100, price: 130, gndpTotal: 1560
  },
  // ... Add all other products from the screenshot here ...
];

async function main() {
  await mongoose.connect(MONGODB_URI);

  let insertedProducts = 0;
  let insertedStocks = 0;

  for (const p of excelProducts) {
    const productDoc = await Product.create({
      name: p.name,
      description: p.description,
      category: 'spare_part',
      brand: p.make,
      modelNumber: '',
      minStockLevel: 5,
      isActive: true,
      partNo: p.partNo,
      quantity: p.quantity,
      location: DUMMY_LOCATION_ID,
      room: DUMMY_ROOM_ID,
      rack: DUMMY_RACK_ID,
      hsnNumber: p.hsnNumber,
      dept: p.dept,
      productType1: p.productType1,
      productType2: p.productType2,
      productType3: '',
      make: p.make,
      gst: p.gst,
      gndp: p.gndp,
      price: p.price,
      gndpTotal: p.gndpTotal,
      stockUnit: 'pcs',
      createdBy: FIXED_USER_ID
    });
    insertedProducts++;
    await Stock.create({
      product: productDoc._id,
      location: DUMMY_LOCATION_ID,
      room: DUMMY_ROOM_ID,
      rack: DUMMY_RACK_ID,
      quantity: p.quantity,
      reservedQuantity: 0,
      availableQuantity: p.quantity,
      lastUpdated: new Date(),
    });
    insertedStocks++;
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 