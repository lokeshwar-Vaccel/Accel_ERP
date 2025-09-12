// THIS SCRIPT WILL OVERWRITE EXISTING DATA IN THE TARGET COLLECTIONS
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { Customer } from '../models/Customer';
import { AMC } from '../models/AMC';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { Invoice } from '../models/Invoice';
import { ServiceTicket } from '../models/ServiceTicket';
import { Notification } from '../models/Notification';
import { Payment } from '../models/Payment';
import { StockLedger } from '../models/StockLedger';
import { Room } from '../models/Stock';
import { Rack } from '../models/Stock';
import { StockLocation } from '../models/Stock';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-services-erp';
const FIXED_USER_ID = new mongoose.Types.ObjectId('000000000000000000000001');

function randomString(len = 8) {
  return Math.random().toString(36).substring(2, 2 + len);
}
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickRandom(arr: any[]) {
  return arr[randomInt(0, arr.length - 1)];
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // 1. StockLocation
  await StockLocation.deleteMany({});
  const locations = await StockLocation.insertMany(
    Array.from({ length: 20 }).map((_, i) => ({
      name: `Location ${i + 1}`,
      address: `${randomInt(1, 999)} Main St, City ${i + 1}`,
      type: ['warehouse', 'service_center', 'main_office'][i % 3],
      contactPerson: `Contact ${randomString(5)}`,
      phone: `+91${randomInt(1000000000, 9999999999)}`,
      isActive: true
    }))
  );

  // 2. Room
  await Room.deleteMany({});
  const rooms = await Room.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      name: `Room ${i + 1}`,
      location: pickRandom(locations)._id,
      description: `Room description ${randomString(10)}`,
      isActive: true
    }))
  );

  // 3. Rack
  await Rack.deleteMany({});
  const racks = await Rack.insertMany(
    Array.from({ length: 60 }).map((_, i) => ({
      name: `Rack ${i + 1}`,
      location: pickRandom(locations)._id,
      room: pickRandom(rooms)._id,
      description: `Rack description ${randomString(10)}`,
      isActive: true
    }))
  );

  // 4. Customer
  await Customer.deleteMany({});
  const customerTypes = ['retail', 'telecom'];
  const leadStatuses = ['new', 'qualified', 'contacted', 'converted', 'lost'];
  const customers = await Customer.insertMany(
    Array.from({ length: 100 }).map((_, i) => ({
      name: `Customer ${randomString(6)}`,
      email: `customer${i + 1}@example.com`,
      phone: `+91${randomInt(1000000000, 9999999999)}`,
      address: `Address ${randomString(10)}`,
      customerType: pickRandom(customerTypes),
      leadSource: `source${randomInt(1, 5)}`,
      status: pickRandom(leadStatuses),
      notes: `Notes ${randomString(10)}`,
      contactHistory: [],
      createdBy: FIXED_USER_ID
    }))
  );

  // 5. Product
  await Product.deleteMany({});
  const productTypes = ['spare_part', 'genset', 'accessory'];
  const products = await Product.insertMany(
    Array.from({ length: 200 }).map((_, i) => ({
      name: `Product ${randomString(6)}`,
      description: `Description ${randomString(10)}`,
      category: pickRandom(productTypes),
      brand: `Brand${randomInt(1, 10)}`,
      modelNumber: `Model${randomInt(100, 999)}`,
      minStockLevel: randomInt(1, 10),
      isActive: true,
      partNo: `PN${randomInt(10000, 99999)}`,
      quantity: randomInt(1, 100),
      location: pickRandom(locations)._id,
      room: pickRandom(rooms)._id,
      rack: pickRandom(racks)._id,
      hsnNumber: `${randomInt(10000000, 99999999)}`,
      dept: pickRandom(['RETAIL', 'TELECOM']),
      productType1: 'CONSUMABLE',
      productType2: `CPCB${randomInt(1, 4)}`,
      productType3: '',
      make: `Make${randomInt(1, 10)}`,
      gst: [5, 12, 18, 28][randomInt(0, 3)],
      gndp: randomInt(50, 500),
      price: randomInt(100, 1000),
      gndpTotal: randomInt(1000, 10000),
      stockUnit: pickRandom(['nos', 'kg', 'litre', 'meter', 'set']),
      createdBy: FIXED_USER_ID
    }))
  );

  // 6. Stock
  await Stock.deleteMany({});
  const stockCombinations = new Set();
  const stocks = [];
  
  // Create unique stock entries for each product-location combination
  for (const product of products) {
    const location = pickRandom(locations);
    const combination = `${product._id}-${location._id}`;
    
    if (!stockCombinations.has(combination)) {
      stockCombinations.add(combination);
      const reservedQuantity = randomInt(0, 10);
      const availableQuantity = Math.max(0, product.quantity - reservedQuantity - randomInt(0, 5));
      
      stocks.push({
        product: product._id,
        location: location._id,
        room: pickRandom(rooms)._id,
        rack: pickRandom(racks)._id,
        quantity: product.quantity,
        reservedQuantity,
        availableQuantity,
        lastUpdated: new Date(),
      });
    }
  }
  
  // Insert stocks in batches to avoid memory issues
  const stockResults = await Stock.insertMany(stocks);

  // 7. AMC
  await AMC.deleteMany({});
  const amcs = await AMC.insertMany(
    Array.from({ length: 20 }).map((_, i) => ({
      contractNumber: `AMC${1000 + i}`,
      customer: pickRandom(customers)._id,
      products: [pickRandom(products)._id],
      startDate: new Date(Date.now() - randomInt(0, 100) * 86400000),
      endDate: new Date(Date.now() + randomInt(30, 365) * 86400000),
      contractValue: randomInt(1000, 10000),
      scheduledVisits: randomInt(1, 6),
      completedVisits: randomInt(0, 5),
      status: 'active',
      nextVisitDate: new Date(Date.now() + randomInt(1, 90) * 86400000),
      visitSchedule: [],
      terms: 'Standard AMC terms',
      createdBy: FIXED_USER_ID
    }))
  );

  // 8. PurchaseOrder
  await PurchaseOrder.deleteMany({});
  const pos = await PurchaseOrder.insertMany(
    Array.from({ length: 20 }).map((_, i) => ({
      poNumber: `PO${1000 + i}`,
      supplier: `Supplier${randomInt(1, 20)}`,
      supplierEmail: `supplier${i + 1}@example.com`,
      items: [{ product: pickRandom(products)._id, quantity: randomInt(1, 20), unitPrice: randomInt(100, 1000), taxRate: [5, 12, 18, 28][randomInt(0, 3)], totalPrice: randomInt(100, 2000), receivedQuantity: randomInt(1, 20) }],
      totalAmount: randomInt(1000, 20000),
      status: pickRandom(['order_under_process', 'approved_order_sent_sap', 'partially_invoiced', 'fully_invoiced', 'rejected']),
      orderDate: new Date(Date.now() - randomInt(0, 100) * 86400000),
      expectedDeliveryDate: new Date(Date.now() + randomInt(1, 30) * 86400000),
      actualDeliveryDate: new Date(Date.now() + randomInt(1, 30) * 86400000),
      createdBy: FIXED_USER_ID
    }))
  );

  // 9. Invoice
  await Invoice.deleteMany({});
  const invoices = await Invoice.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      invoiceNumber: `INV${1000 + i}`,
      customer: pickRandom(customers)._id,
      user: FIXED_USER_ID,
      issueDate: new Date(Date.now() - randomInt(0, 100) * 86400000),
      dueDate: new Date(Date.now() + randomInt(1, 60) * 86400000),
      items: [{ product: pickRandom(products)._id, description: `Desc${randomString(5)}`, quantity: randomInt(1, 10), unitPrice: randomInt(100, 1000), totalPrice: randomInt(100, 10000), taxRate: [5, 12, 18, 28][randomInt(0, 3)], taxAmount: randomInt(10, 500) }],
      subtotal: randomInt(100, 10000),
      taxAmount: randomInt(10, 1000),
      discountAmount: randomInt(0, 500),
      totalAmount: randomInt(100, 20000),
      paidAmount: randomInt(0, 10000),
      remainingAmount: randomInt(0, 10000),
      status: pickRandom(['draft', 'sent', 'paid', 'overdue', 'cancelled']),
      paymentStatus: pickRandom(['pending', 'partial', 'paid', 'gst_pending']),
      paymentMethod: pickRandom(['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'razorpay', 'other']),
      paymentDate: new Date(),
      notes: `Notes ${randomString(10)}`,
      terms: 'Standard terms',
      invoiceType: pickRandom(['sale', 'service', 'purchase', 'amc', 'other']),
      referenceId: '',
      location: pickRandom(locations)._id,
      createdBy: FIXED_USER_ID,
      externalInvoiceNumber: '',
      supplierName: '',
      supplierEmail: '',
      poNumber: `PO${1000 + randomInt(0, 19)}`,
      externalInvoiceTotal: randomInt(100, 20000)
    }))
  );

  // 10. ServiceTicket
  await ServiceTicket.deleteMany({});
  const tickets = await ServiceTicket.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      ticketNumber: `TICKET${1000 + i}`,
      customer: pickRandom(customers)._id,
      product: pickRandom(products)._id,
      serialNumber: `SN${randomInt(1000, 9999)}`,
      description: `Service for ${randomString(8)}`,
      priority: pickRandom(['low', 'medium', 'high', 'critical']),
              status: pickRandom(['open', 'resolved', 'closed']),
      assignedTo: FIXED_USER_ID,
      scheduledDate: new Date(Date.now() + randomInt(1, 30) * 86400000),
      completedDate: null,
      partsUsed: [{ product: pickRandom(products)._id, quantity: randomInt(1, 5), serialNumbers: [`SN${randomInt(1000, 9999)}`] }],
      serviceReport: '',
      customerSignature: '',
      slaDeadline: new Date(Date.now() + randomInt(1, 30) * 86400000),
      createdBy: FIXED_USER_ID
    }))
  );

  // 11. Notification
  await Notification.deleteMany({});
  await Notification.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      userId: FIXED_USER_ID,
      customerId: pickRandom(customers)._id,
      type: pickRandom(['assignment', 'status_change', 'contact_history', 'follow_up', 'general']),
      title: `Notification ${randomString(6)}`,
      message: `Message ${randomString(12)}`,
      isRead: Math.random() > 0.5,
      priority: pickRandom(['low', 'medium', 'high']),
      metadata: {},
      createdBy: FIXED_USER_ID
    }))
  );

  // 12. Payment
  await Payment.deleteMany({});
  await Payment.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      invoiceId: pickRandom(invoices)._id,
      amount: randomInt(100, 10000),
      currency: 'INR',
      paymentMethod: pickRandom(['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'razorpay', 'other']),
      paymentStatus: pickRandom(['pending', 'processing', 'completed', 'failed', 'refunded']),
      transactionDate: new Date(Date.now() - randomInt(0, 100) * 86400000),
      notes: `Payment notes ${randomString(10)}`,
      metadata: {},
      createdBy: FIXED_USER_ID
    }))
  );

  // 13. StockLedger
  await StockLedger.deleteMany({});
  await StockLedger.insertMany(
    Array.from({ length: 40 }).map((_, i) => ({
      product: pickRandom(products)._id,
      location: pickRandom(locations)._id,
      transactionType: pickRandom(['inward', 'outward', 'adjustment', 'transfer', 'reservation', 'release']),
      quantity: randomInt(1, 100),
      reason: `Reason ${randomString(10)}`,
      notes: `Notes ${randomString(10)}`,
      performedBy: FIXED_USER_ID,
      transactionDate: new Date(Date.now() - randomInt(0, 100) * 86400000),
      resultingQuantity: randomInt(1, 100),
      referenceId: `REF${randomInt(1000, 9999)}`,
      referenceType: pickRandom(['purchase_order', 'service_ticket', 'adjustment', 'transfer', 'sale', 'reservation', 'delivery_challan'])
    }))
  );

  console.log('Inserted:', {
    locations: locations.length,
    rooms: rooms.length,
    racks: racks.length,
    customers: customers.length,
    products: products.length,
    stocks: stockResults.length,
    amcs: amcs.length,
    pos: pos.length,
    invoices: invoices.length,
    tickets: tickets.length,
    notifications: 40,
    payments: 40,
    stockLedgers: 40
  });
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}); 