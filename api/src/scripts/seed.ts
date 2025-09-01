import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../database/connection';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { StockLocation, Stock } from '../models/Stock';
import { ServiceTicket } from '../models/ServiceTicket';
import { AMC } from '../models/AMC';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { 
  UserRole, 
  CustomerType, 
  CustomerMainType,
  LeadStatus, 
  ProductCategory, 
  TicketStatus, 
  TicketPriority, 
  AMCStatus,
  StockTransactionType 
} from '../types';

// Sample data arrays
const sampleUsers = [
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@sunpowerservices.com',
    password: 'admin123',
    role: UserRole.SUPER_ADMIN,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'admin' },
      { module: 'lead_management', access: true, permission: 'admin' },
      { module: 'user_management', access: true, permission: 'admin' },
      { module: 'quotation_management', access: true, permission: 'admin' },
      { module: 'product_management', access: true, permission: 'admin' },
      { module: 'inventory_management', access: true, permission: 'admin' },
      { module: 'billing', access: true, permission: 'admin' },
      { module: 'service_management', access: true, permission: 'admin' },
      { module: 'amc_management', access: true, permission: 'admin' },
      { module: 'purchase_orders', access: true, permission: 'admin' },
      { module: 'billing', access: true, permission: 'admin' },
      { module: 'dg_sales', access: true, permission: 'admin' },
      { module: 'reports_analytics', access: true, permission: 'admin' },
      { module: 'file_management', access: true, permission: 'admin' },
      { module: 'communications', access: true, permission: 'admin' },
      { module: 'admin_settings', access: true, permission: 'admin' }
    ]
  },
  {
    firstName: 'John',
    lastName: 'Manager',
    email: 'john.manager@sunpowerservices.com',
    password: 'manager123',
    role: UserRole.MANAGER,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'write' },
      { module: 'lead_management', access: true, permission: 'write' },
      { module: 'user_management', access: true, permission: 'read' },
      { module: 'quotation_management', access: true, permission: 'read' },
      { module: 'product_management', access: true, permission: 'write' },
      { module: 'inventory_management', access: true, permission: 'write' },
      { module: 'service_management', access: true, permission: 'write' },
      { module: 'amc_management', access: true, permission: 'write' },
      { module: 'purchase_orders', access: true, permission: 'write' },
      { module: 'billing', access: true, permission: 'write' },
      { module: 'dg_sales', access: true, permission: 'write' },
      { module: 'reports_analytics', access: true, permission: 'read' },
      { module: 'file_management', access: true, permission: 'write' },
      { module: 'communications', access: true, permission: 'write' }
    ]
  },
  {
    firstName: 'Sarah',
    lastName: 'Technician',
    email: 'sarah.tech@sunpowerservices.com',
    password: 'tech123',
    role: UserRole.VIEWER,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'read' },
      { module: 'service_management', access: true, permission: 'write' },
      { module: 'inventory_management', access: true, permission: 'read' },
      { module: 'product_management', access: true, permission: 'read' },
      { module: 'communications', access: true, permission: 'read' }
    ]
  },
  {
    firstName: 'Mike',
    lastName: 'Sales',
    email: 'mike.sales@sunpowerservices.com',
    password: 'sales123',
    role: UserRole.VIEWER,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'read' },
      { module: 'lead_management', access: true, permission: 'write' },
      { module: 'amc_management', access: true, permission: 'write' },
      { module: 'reports_analytics', access: true, permission: 'read' },
      { module: 'communications', access: true, permission: 'read' }
    ]
  },
  {
    firstName: 'Alex',
    lastName: 'Field',
    email: 'alex.field@sunpowerservices.com',
    password: 'field123',
    role: UserRole.FIELD_ENGINEER,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'read' },
      { module: 'service_management', access: true, permission: 'write' },
      { module: 'amc_management', access: true, permission: 'write' },
      { module: 'inventory_management', access: true, permission: 'write' },
      { module: 'product_management', access: true, permission: 'write' }
    ]
  },
  {
    firstName: 'Lisa',
    lastName: 'HR',
    email: 'lisa.hr@sunpowerservices.com',
    password: 'hr123',
    role: UserRole.HR,
    status: 'active',
    moduleAccess: [
      { module: 'dashboard', access: true, permission: 'read' },
      { module: 'user_management', access: true, permission: 'write' },
      { module: 'quotation_management', access: true, permission: 'write' },
      { module: 'inventory_management', access: true, permission: 'read' },
      { module: 'purchase_orders', access: true, permission: 'read' },
      { module: 'reports_analytics', access: true, permission: 'read' },
      { module: 'communications', access: true, permission: 'read' }
    ]
  }
];
// const sampleUsers = [
//   {
//     firstName: 'Admin',
//     lastName: 'User',
//     email: 'admin@sunpowerservices.com',
//     password: 'admin123',
//     role: UserRole.SUPER_ADMIN,
//     status: 'active',
//     moduleAccess: ['user_management', 'lead_management', 'inventory_management', 'service_management', 'amc_management', 'reports_analytics', 'admin_settings']
//   },
//   {
//     firstName: 'John',
//     lastName: 'Manager',
//     email: 'john.manager@sunpowerservices.com',
//     password: 'manager123',
//     role: UserRole.MANAGER,
//     status: 'active',
//     moduleAccess: ['lead_management', 'inventory_management', 'service_management', 'amc_management', 'reports_analytics']
//   },
//   {
//     firstName: 'Sarah',
//     lastName: 'Technician',
//     email: 'sarah.tech@sunpowerservices.com',
//     password: 'tech123',
//     role: UserRole.VIEWER,
//     status: 'active',
//     moduleAccess: ['service_management', 'inventory_management']
//   },
//   {
//     firstName: 'Mike',
//     lastName: 'Sales',
//     email: 'mike.sales@sunpowerservices.com',
//     password: 'sales123',
//     role: UserRole.VIEWER,
//     status: 'active',
//     moduleAccess: ['lead_management', 'amc_management', 'reports_analytics']
//   },
//   {
//     firstName: 'Lisa',
//     lastName: 'HR',
//     email: 'lisa.hr@sunpowerservices.com',
//     password: 'hr123',
//     role: UserRole.HR,
//     status: 'active',
//     moduleAccess: ['user_management', 'inventory_management', 'reports_analytics']
//   }
// ];

const sampleStockLocations = [
  {
    name: 'Main Office',
    address: '123 Business District, Mumbai, Maharashtra 400001',
    type: 'main_office',
    contactPerson: 'Rajesh Kumar',
    phone: '+919876543210',
    isActive: true,
    capacity: 10000
  },
  {
    name: 'Warehouse A',
    address: '456 Industrial Area, Pune, Maharashtra 411001',
    type: 'warehouse',
    contactPerson: 'Amit Singh',
    phone: '+919876543211',
    isActive: true,
    capacity: 50000
  },
  {
    name: 'Service Center Delhi',
    address: '789 Service Road, New Delhi 110001',
    type: 'service_center',
    contactPerson: 'Priya Sharma',
    phone: '+919876543212',
    isActive: true,
    capacity: 5000
  },
  {
    name: 'Warehouse B',
    address: '321 Storage Complex, Bangalore, Karnataka 560001',
    type: 'warehouse',
    contactPerson: 'Suresh Reddy',
    phone: '+919876543213',
    isActive: true,
    capacity: 30000
  }
];

const sampleProducts = [
  {
    name: 'Diesel Generator 100KVA',
    description: 'Heavy duty diesel generator suitable for commercial and industrial use',
    category: ProductCategory.GENSET,
    brand: 'Mahindra',
    modelNumber: 'MDG-100',
    partNo: 'MDG-100-001',
    quantity: 0,
    specifications: {
      power: '100KVA',
      fuel: 'Diesel',
      engineBrand: 'Mahindra',
      fuelTankCapacity: '200L',
      dimensions: '2500x1200x1500mm',
      weight: '1200kg'
    },
    price: 450000,
    minStockLevel: 5,
    tags: ['commercial', 'heavy-duty', 'diesel'],
    warranty: { duration: 24, unit: 'months', terms: 'Comprehensive warranty including parts and labor' }
  },
  {
    name: 'Diesel Generator 250KVA',
    description: 'Industrial grade diesel generator for large scale operations',
    category: ProductCategory.GENSET,
    brand: 'Cummins',
    modelNumber: 'CDG-250',
    partNo: 'CDG-250-001',
    quantity: 0,
    specifications: {
      power: '250KVA',
      fuel: 'Diesel',
      engineBrand: 'Cummins',
      fuelTankCapacity: '500L',
      dimensions: '3500x1500x2000mm',
      weight: '2500kg'
    },
    price: 1200000,
    minStockLevel: 3,
    tags: ['industrial', 'high-power', 'diesel'],
    warranty: { duration: 36, unit: 'months', terms: 'Extended warranty with on-site service' }
  },
  {
    name: 'Engine Oil Filter',
    description: 'High quality oil filter for diesel generators',
    category: ProductCategory.SPARE_PART,
    brand: 'Mann Filter',
    modelNumber: 'W950/26',
    partNo: 'W950-26-001',
    quantity: 0,
    specifications: {
      compatibility: 'Multiple generator models',
      material: 'Cellulose',
      micronRating: '10 micron'
    },
    price: 850,
    minStockLevel: 50,
    tags: ['filter', 'maintenance', 'oil']
  },
  {
    name: 'Air Filter',
    description: 'Air filter for generator engine air intake',
    category: ProductCategory.SPARE_PART,
    brand: 'Donaldson',
    modelNumber: 'P181064',
    partNo: 'P181064-001',
    quantity: 0,
    specifications: {
      compatibility: 'Cummins engines',
      material: 'Paper element',
      efficiency: '99.5%'
    },
    price: 1200,
    minStockLevel: 30,
    tags: ['filter', 'air-intake', 'maintenance']
  },
  {
    name: 'Battery Charger 24V',
    description: 'Automatic battery charger for generator batteries',
    category: ProductCategory.ACCESSORY,
    brand: 'Exide',
    modelNumber: 'BC-24-10A',
    partNo: 'BC-24-10A-001',
    quantity: 0,
    specifications: {
      voltage: '24V',
      current: '10A',
      type: 'Automatic',
      protection: 'Overcharge protection'
    },
    price: 8500,
    minStockLevel: 15,
    tags: ['charger', 'battery', 'electrical']
  },
  {
    name: 'Control Panel',
    description: 'Digital control panel for generator monitoring',
    category: ProductCategory.ACCESSORY,
    brand: 'Deep Sea',
    modelNumber: 'DSE7320',
    partNo: 'DSE7320-001',
    quantity: 0,
    specifications: {
      display: 'LCD',
      functions: 'Auto start/stop, monitoring, alarms',
      communication: 'RS485, Ethernet'
    },
    price: 25000,
    minStockLevel: 10,
    tags: ['control', 'monitoring', 'automation']
  },
  {
    name: 'Fuel Pump',
    description: 'Electric fuel pump for diesel transfer',
    category: ProductCategory.SPARE_PART,
    brand: 'Bosch',
    modelNumber: 'FP-12V-40L',
    partNo: 'FP-12V-40L-001',
    quantity: 0,
    specifications: {
      voltage: '12V',
      flowRate: '40L/min',
      pressure: '3 bar'
    },
    price: 4500,
    minStockLevel: 20,
    tags: ['pump', 'fuel', 'electric']
  }
];

const sampleCustomers = [
  {
    name: 'Tech Solutions Pvt Ltd',
    email: 'info@techsolutions.com',
    phone: '+919876543220',
    type: CustomerMainType.CUSTOMER,
    addresses: [
      {
        id: 1,
        address: '15th Floor, IT Tower, Gurgaon, Haryana 122001',
        state: 'Haryana',
        district: 'Gurgaon',
        pincode: '122001',
        isPrimary: true
      }
    ],
    customerType: CustomerType.TELECOM,
    leadSource: 'Website',
    status: LeadStatus.CONVERTED,
    notes: 'Regular customer with multiple locations'
  },
  {
    name: 'Mumbai Manufacturing Co',
    email: 'purchase@mumbaimanufacturing.com',
    phone: '+919876543221',
    type: CustomerMainType.CUSTOMER,
    addresses: [
      {
        id: 1,
        address: 'Plot 45, Industrial Estate, Mumbai, Maharashtra 400001',
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400001',
        isPrimary: true
      }
    ],
    customerType: CustomerType.RETAIL,
    leadSource: 'Referral',
    status: LeadStatus.CONVERTED,
    notes: 'Large manufacturing unit requiring backup power'
  },
  {
    name: 'Delhi Data Center',
    email: 'ops@delhidatacenter.com',
    phone: '+919876543222',
    type: CustomerMainType.CUSTOMER,
    addresses: [
      {
        id: 1,
        address: 'Sector 62, Noida, Uttar Pradesh 201301',
        state: 'Uttar Pradesh',
        district: 'Noida',
        pincode: '201301',
        isPrimary: true
      }
    ],
    customerType: CustomerType.TELECOM,
    leadSource: 'Cold Call',
    status: LeadStatus.CONVERTED,
    notes: 'Critical infrastructure requiring 24/7 power backup'
  },
  {
    name: 'Retail Chain Stores',
    email: 'facilities@retailchain.com',
    phone: '+919876543223',
    type: CustomerMainType.CUSTOMER,
    addresses: [
      {
        id: 1,
        address: 'Corporate Office, Bangalore, Karnataka 560001',
        state: 'Karnataka',
        district: 'Bangalore',
        pincode: '560001',
        isPrimary: true
      }
    ],
    customerType: CustomerType.RETAIL,
    leadSource: 'Exhibition',
    status: LeadStatus.QUALIFIED,
    notes: 'Expanding chain looking for standardized power solutions'
  },
  {
    name: 'Hospital Complex',
    email: 'admin@hospitalcomplex.com',
    phone: '+919876543224',
    type: CustomerMainType.CUSTOMER,
    addresses: [
      {
        id: 1,
        address: 'Medical District, Chennai, Tamil Nadu 600001',
        state: 'Tamil Nadu',
        district: 'Chennai',
        pincode: '600001',
        isPrimary: true
      }
    ],
    customerType: CustomerType.RETAIL,
    leadSource: 'Website',
    status: LeadStatus.CONVERTED,
    notes: 'Critical facility requiring uninterrupted power supply'
  }
];

// Function to fix existing stock availableQuantity data
const fixExistingStockData = async () => {
  
  try {
    const result = await Stock.updateMany(
      {},
      [
        {
          $set: {
            availableQuantity: { 
              $max: [0, { $subtract: ["$quantity", { $ifNull: ["$reservedQuantity", 0] }] }] 
            },
            lastUpdated: new Date()
          }
        }
      ]
    );
    
    
    // Show some sample fixed records
    const sampleFixedRecords = await Stock.find({}, {
      quantity: 1, 
      reservedQuantity: 1, 
      availableQuantity: 1
    }).limit(3);
    
  } catch (error) {
    console.error('❌ Error fixing stock data:', error);
    throw error;
  }
};

const createSampleData = async () => {
  try {

    // Connect to database
    await connectDB();

    // Fix existing stock data before clearing (in case user wants to preserve some data)
    await fixExistingStockData();

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Customer.deleteMany({}),
      Product.deleteMany({}),
      StockLocation.deleteMany({}),
      Stock.deleteMany({}),
      ServiceTicket.deleteMany({}),
      AMC.deleteMany({}),
      PurchaseOrder.deleteMany({})
    ]);

    // Create Users
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 12)
      }))
    );
    const createdUsers = await User.insertMany(hashedUsers);

    // Create Stock Locations
    const createdLocations = await StockLocation.insertMany(sampleStockLocations);

    // Create Products
    const productsWithCreator = sampleProducts.map(product => ({
      ...product,
      createdBy: createdUsers[0]._id // Admin user
    }));
    const createdProducts = await Product.insertMany(productsWithCreator);

    // Create Stock entries
    const stockEntries = [];
    for (const product of createdProducts) {
      for (const location of createdLocations) {
        const quantity = Math.floor(Math.random() * 50) + 10; // Random quantity between 10-60
        const reservedQuantity = Math.floor(quantity * 0.1); // 10% reserved
        const availableQuantity = Math.max(0, quantity - reservedQuantity); // Calculate available quantity
        
        stockEntries.push({
          product: product._id,
          location: location._id,
          quantity,
          reservedQuantity,
          availableQuantity, // ✅ Now properly calculated
          lastUpdated: new Date(),
          transactions: [
            {
              type: StockTransactionType.INWARD,
              quantity,
              date: new Date(),
              reference: 'INITIAL_STOCK',
              notes: 'Initial stock during seeding'
            }
          ]
        });
      }
    }
    const createdStock = await Stock.insertMany(stockEntries);

    // Create Customers
    const customersWithUsers = sampleCustomers.map((customer, index) => ({
      ...customer,
      assignedTo: createdUsers[Math.floor(Math.random() * createdUsers.length)]._id,
      createdBy: createdUsers[0]._id, // Admin user
      contactHistory: [
        {
          type: 'email',
          date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
          notes: 'Initial contact and requirements discussion',
          createdBy: createdUsers[0]._id
        }
      ]
    }));
    const createdCustomers = await Customer.insertMany(customersWithUsers);

    // Create Service Tickets
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    
    const serviceTickets = [
      {
        ticketNumber: `TKT-${year}${month}-0001`,
        customer: createdCustomers[0]._id,
        product: createdProducts[0]._id,
        description: 'Generator not starting - suspected fuel system issue',
        priority: TicketPriority.HIGH,
        status: TicketStatus.RESOLVED,
        assignedTo: createdUsers[2]._id, // Sarah Technician
        scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        serviceType: 'repair',
        urgencyLevel: 'high',
        serialNumber: 'MDG100-001',
        customerNotes: 'Generator stopped working this morning, urgent repair needed',
        createdBy: createdUsers[1]._id // Manager
      },
      {
        ticketNumber: `TKT-${year}${month}-0002`,
        customer: createdCustomers[1]._id,
        product: createdProducts[1]._id,
        description: 'Routine maintenance and oil change',
        priority: TicketPriority.MEDIUM,
        status: TicketStatus.RESOLVED,
        assignedTo: createdUsers[2]._id,
        scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        completedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        serviceType: 'maintenance',
        urgencyLevel: 'medium',
        serialNumber: 'CDG250-001',
        serviceReport: 'Completed routine maintenance. Changed engine oil, oil filter, and air filter. Generator tested and running smoothly.',
        workDuration: 4,
        partsUsed: [
          {
            product: createdProducts[2]._id, // Oil filter
            quantity: 1,
            unitPrice: 850
          },
          {
            product: createdProducts[3]._id, // Air filter
            quantity: 1,
            unitPrice: 1200
          }
        ],
        createdBy: createdUsers[1]._id // Manager
      },
      {
        ticketNumber: `TKT-${year}${month}-0003`,
        customer: createdCustomers[2]._id,
        product: createdProducts[0]._id,
        description: 'Installation of new generator at data center',
        priority: TicketPriority.HIGH,
        status: TicketStatus.RESOLVED,
        assignedTo: createdUsers[2]._id,
        scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
        serviceType: 'installation',
        urgencyLevel: 'high',
        customerNotes: 'New data center setup, requires careful installation and testing',
        createdBy: createdUsers[1]._id // Manager
      }
    ];
    const createdTickets = await ServiceTicket.insertMany(serviceTickets);

    // Create AMC Contracts
    const amcContracts = [
      {
        contractNumber: `AMC-${year}${month}-0001`,
        customer: createdCustomers[0]._id,
        products: [createdProducts[0]._id, createdProducts[1]._id],
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        contractValue: 150000,
        scheduledVisits: 12,
        status: AMCStatus.ACTIVE,
        contractType: 'comprehensive',
        paymentTerms: 'annual',
        visits: [
          {
            scheduledDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 1 month from now
            visitType: 'routine',
            assignedTo: createdUsers[2]._id
          }
        ],
        createdBy: createdUsers[3]._id // Sales user
      },
      {
        contractNumber: `AMC-${year}${month}-0002`,
        customer: createdCustomers[2]._id,
        products: [createdProducts[1]._id],
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
        endDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000), // 6 months from now
        contractValue: 200000,
        scheduledVisits: 6,
        completedVisits: 3,
        status: AMCStatus.ACTIVE,
        contractType: 'breakdown',
        paymentTerms: 'semi_annual',
        visits: [
          {
            scheduledDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
            visitType: 'routine',
            assignedTo: createdUsers[2]._id,
            completedDate: new Date(Date.now() - 148 * 24 * 60 * 60 * 1000),
            serviceReport: 'Routine inspection completed. All systems functioning normally.'
          },
          {
            scheduledDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 2 months from now
            visitType: 'routine',
            assignedTo: createdUsers[2]._id
          }
        ],
        createdBy: createdUsers[3]._id // Sales user
      }
    ];
    const createdAMCs = await AMC.insertMany(amcContracts);

    // Create Purchase Orders
    const purchaseOrders = [
      {
        poNumber: `PO-${year}${month}-0001`,
        supplier: 'Mahindra Powerol',
        items: [
          {
            product: createdProducts[0]._id,
            quantity: 5,
            unitPrice: 450000,
            totalPrice: 2250000
          }
        ],
        totalAmount: 2250000,
        status: 'confirmed',
        orderDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        expectedDeliveryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        deliveryLocation: createdLocations[1]._id, // Warehouse A
        paymentTerms: 'net_30',
        supplierContact: {
          name: 'Rajesh Gupta',
          email: 'rajesh@mahindrapowerol.com',
          phone: '+919876543230'
        },
        createdBy: createdUsers[1]._id // Manager
      },
      {
        poNumber: `PO-${year}${month}-0002`,
        supplier: 'Spare Parts India',
        items: [
          {
            product: createdProducts[2]._id, // Oil filters
            quantity: 100,
            unitPrice: 850,
            totalPrice: 85000
          },
          {
            product: createdProducts[3]._id, // Air filters
            quantity: 50,
            unitPrice: 1200,
            totalPrice: 60000
          }
        ],
        totalAmount: 145000,
        status: 'received',
        orderDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        expectedDeliveryDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        actualDeliveryDate: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000), // 18 days ago
        deliveryLocation: createdLocations[0]._id, // Main Office
        paymentTerms: 'cod',
        supplierContact: {
          name: 'Sunil Sharma',
          email: 'sunil@sparepartsindia.com',
          phone: '+919876543231'
        },
        createdBy: createdUsers[1]._id // Manager
      }
    ];
    const createdPOs = await PurchaseOrder.insertMany(purchaseOrders);
    // console.log(`✅ Created ${createdPOs.length} purchase orders`);

    // console.log('\n🎉 Database seeding completed successfully!');
    // console.log('\n📊 Summary:');
    // console.log(`👥 Users: ${createdUsers.length}`);
    // console.log(`🏢 Stock Locations: ${createdLocations.length}`);
    // console.log(`📦 Products: ${createdProducts.length}`);
    // console.log(`📊 Stock Entries: ${createdStock.length}`);
    // console.log(`👔 Customers: ${createdCustomers.length}`);
    // console.log(`🎫 Service Tickets: ${createdTickets.length}`);
    // console.log(`📋 AMC Contracts: ${createdAMCs.length}`);
    // console.log(`🛒 Purchase Orders: ${createdPOs.length}`);

    // console.log('\n🔑 Default Login Credentials:');
    // console.log('Admin: admin@sunpowerservices.com / admin123');
    // console.log('Manager: john.manager@sunpowerservices.com / manager123');
    // console.log('Technician: sarah.tech@sunpowerservices.com / tech123');
    // console.log('Sales: mike.sales@sunpowerservices.com / sales123');
    // console.log('HR: lisa.hr@sunpowerservices.com / hr123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Standalone function to fix existing stock data without clearing database
const fixStockDataOnly = async () => {
  try {
    await connectDB();
    await fixExistingStockData();
  } catch (error) {
    console.error('❌ Stock data fix failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
};

// Run if called directly
if (require.main === module) {
  // Check if user wants to run only the fix
  if (process.argv.includes('--fix-stock-only')) {
    fixStockDataOnly()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Stock fix failed:', error);
        process.exit(1);
      });
  } else {
    // Run full seeding
    createSampleData()
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
      });
  }
}

export default createSampleData;
export { fixStockDataOnly }; 