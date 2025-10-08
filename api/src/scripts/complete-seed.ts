import mongoose from 'mongoose';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Stock } from '../models/Stock';
import { connectDB } from '../database/connection';
import { ProductCategory } from '../types';

// Create a comprehensive seed script for software/hardware company
async function createCompleteSeedData() {
  try {
    console.log('🔄 Starting comprehensive seed data creation...');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      throw new Error('No admin user found. Please create an admin user first.');
    }
    console.log(`✅ Found admin user: ${adminUser.email}`);

    // 1. Create Suppliers
    console.log('\n📦 Creating suppliers...');
    const suppliers = [
      {
        name: 'TechCorp Solutions Pvt Ltd',
        email: 'procurement@techcorp.com',
        phone: '+91-9876543001',
        panNumber: 'TECHC1234A',
        address: '501 Tech Park, Electronic City, Bangalore, Karnataka 560100',
        siteAddress: '501 Tech Park, Electronic City, Bangalore, Karnataka 560100',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Primary supplier for computer hardware and networking equipment',
        alice: 'TechCorp',
        gstNumber: '29TECHC1234A1Z5',
        createdBy: adminUser._id,
        addresses: [{
          id: 1,
          address: '501 Tech Park, Electronic City, Bangalore, Karnataka 560100',
          district: 'Bangalore Urban',
          pincode: '560100',
          state: 'Karnataka',
          city: 'Bangalore',
          street: 'Electronic City',
          gstNumber: '29TECHC1234A1Z5',
          contactPersonName: 'Rajesh Kumar',
          designation: 'Procurement Manager',
          email: 'procurement@techcorp.com',
          phone: '+91-9876543001',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Software Solutions Inc',
        email: 'sales@softwaresolutions.com',
        phone: '+91-9876543002',
        panNumber: 'SOFTS1234B',
        address: '123 IT Hub, Hitec City, Hyderabad, Telangana 500081',
        siteAddress: '123 IT Hub, Hitec City, Hyderabad, Telangana 500081',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Software licensing and development tools supplier',
        alice: 'SoftSol',
        gstNumber: '36SOFTS1234B1Z6',
        createdBy: adminUser._id,
        addresses: [{
          id: 2,
          address: '123 IT Hub, Hitec City, Hyderabad, Telangana 500081',
          district: 'Hyderabad',
          pincode: '500081',
          state: 'Telangana',
          city: 'Hyderabad',
          street: 'Hitec City',
          gstNumber: '36SOFTS1234B1Z6',
          contactPersonName: 'Priya Sharma',
          designation: 'Sales Director',
          email: 'sales@softwaresolutions.com',
          phone: '+91-9876543002',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Hardware Masters Ltd',
        email: 'orders@hardwaremasters.com',
        phone: '+91-9876543003',
        panNumber: 'HARDM1234C',
        address: '456 Industrial Area, Gurgaon, Haryana 122015',
        siteAddress: '456 Industrial Area, Gurgaon, Haryana 122015',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Computer components and peripherals supplier',
        alice: 'HardMasters',
        gstNumber: '06HARDM1234C1Z7',
        createdBy: adminUser._id,
        addresses: [{
          id: 3,
          address: '456 Industrial Area, Gurgaon, Haryana 122015',
          district: 'Gurgaon',
          pincode: '122015',
          state: 'Haryana',
          city: 'Gurgaon',
          street: 'Industrial Area',
          gstNumber: '06HARDM1234C1Z7',
          contactPersonName: 'Amit Verma',
          designation: 'Operations Manager',
          email: 'orders@hardwaremasters.com',
          phone: '+91-9876543003',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Cloud Services Provider',
        email: 'support@cloudservices.com',
        phone: '+91-9876543004',
        panNumber: 'CLOUD1234D',
        address: '789 Cyber City, Sector 17, Chandigarh, Punjab 160017',
        siteAddress: '789 Cyber City, Sector 17, Chandigarh, Punjab 160017',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Cloud infrastructure and hosting services',
        alice: 'CloudServ',
        gstNumber: '04CLOUD1234D1Z8',
        createdBy: adminUser._id,
        addresses: [{
          id: 4,
          address: '789 Cyber City, Sector 17, Chandigarh, Punjab 160017',
          district: 'Chandigarh',
          pincode: '160017',
          state: 'Punjab',
          city: 'Chandigarh',
          street: 'Sector 17',
          gstNumber: '04CLOUD1234D1Z8',
          contactPersonName: 'Sunita Reddy',
          designation: 'Technical Director',
          email: 'support@cloudservices.com',
          phone: '+91-9876543004',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Network Equipment Co',
        email: 'sales@networkequip.com',
        phone: '+91-9876543005',
        panNumber: 'NETEQ1234E',
        address: '321 Tech Zone, Pune, Maharashtra 411057',
        siteAddress: '321 Tech Zone, Pune, Maharashtra 411057',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Networking equipment and security solutions',
        alice: 'NetEquip',
        gstNumber: '27NETEQ1234E1Z9',
        createdBy: adminUser._id,
        addresses: [{
          id: 5,
          address: '321 Tech Zone, Pune, Maharashtra 411057',
          district: 'Pune',
          pincode: '411057',
          state: 'Maharashtra',
          city: 'Pune',
          street: 'Tech Zone',
          gstNumber: '27NETEQ1234E1Z9',
          contactPersonName: 'Vikram Joshi',
          designation: 'Sales Manager',
          email: 'sales@networkequip.com',
          phone: '+91-9876543005',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Software Licenses Ltd',
        email: 'licenses@softlicenses.com',
        phone: '+91-9876543006',
        panNumber: 'SOFLI1234F',
        address: '654 Software Park, Chennai, Tamil Nadu 600113',
        siteAddress: '654 Software Park, Chennai, Tamil Nadu 600113',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Enterprise software licenses and subscriptions',
        alice: 'SoftLic',
        gstNumber: '33SOFLI1234F1Z0',
        createdBy: adminUser._id,
        addresses: [{
          id: 6,
          address: '654 Software Park, Chennai, Tamil Nadu 600113',
          district: 'Chennai',
          pincode: '600113',
          state: 'Tamil Nadu',
          city: 'Chennai',
          street: 'Software Park',
          gstNumber: '33SOFLI1234F1Z0',
          contactPersonName: 'Meera Gupta',
          designation: 'License Manager',
          email: 'licenses@softlicenses.com',
          phone: '+91-9876543006',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Data Storage Solutions',
        email: 'info@datastorage.com',
        phone: '+91-9876543007',
        panNumber: 'DATAS1234G',
        address: '987 Storage Hub, Mumbai, Maharashtra 400070',
        siteAddress: '987 Storage Hub, Mumbai, Maharashtra 400070',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Data storage devices and backup solutions',
        alice: 'DataStore',
        gstNumber: '27DATAST123G1Z1',
        createdBy: adminUser._id,
        addresses: [{
          id: 7,
          address: '987 Storage Hub, Mumbai, Maharashtra 400070',
          district: 'Mumbai',
          pincode: '400070',
          state: 'Maharashtra',
          city: 'Mumbai',
          street: 'Storage Hub',
          gstNumber: '27DATAST123G1Z1',
          contactPersonName: 'Arjun Malhotra',
          designation: 'Product Manager',
          email: 'info@datastorage.com',
          phone: '+91-9876543007',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Security Systems Inc',
        email: 'security@secsystems.com',
        phone: '+91-9876543008',
        panNumber: 'SECSY1234H',
        address: '147 Security Plaza, New Delhi, Delhi 110001',
        siteAddress: '147 Security Plaza, New Delhi, Delhi 110001',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Cybersecurity software and hardware solutions',
        alice: 'SecSys',
        gstNumber: '07SECSY1234H1Z2',
        createdBy: adminUser._id,
        addresses: [{
          id: 8,
          address: '147 Security Plaza, New Delhi, Delhi 110001',
          district: 'Central Delhi',
          pincode: '110001',
          state: 'Delhi',
          city: 'New Delhi',
          street: 'Security Plaza',
          gstNumber: '07SECSY1234H1Z2',
          contactPersonName: 'Kavita Agarwal',
          designation: 'Security Specialist',
          email: 'security@secsystems.com',
          phone: '+91-9876543008',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Mobile Solutions Co',
        email: 'mobile@mobilesolutions.com',
        phone: '+91-9876543009',
        panNumber: 'MOBIL1234I',
        address: '258 Mobile Tech Park, Kolkata, West Bengal 700091',
        siteAddress: '258 Mobile Tech Park, Kolkata, West Bengal 700091',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Mobile devices and accessories supplier',
        alice: 'MobileSol',
        gstNumber: '19MOBIL1234I1Z3',
        createdBy: adminUser._id,
        addresses: [{
          id: 9,
          address: '258 Mobile Tech Park, Kolkata, West Bengal 700091',
          district: 'Kolkata',
          pincode: '700091',
          state: 'West Bengal',
          city: 'Kolkata',
          street: 'Mobile Tech Park',
          gstNumber: '19MOBIL1234I1Z3',
          contactPersonName: 'Rohit Verma',
          designation: 'Mobile Division Head',
          email: 'mobile@mobilesolutions.com',
          phone: '+91-9876543009',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'AI & ML Technologies',
        email: 'ai@aimltech.com',
        phone: '+91-9876543010',
        panNumber: 'AIMLT1234J',
        address: '369 AI Innovation Center, Bangalore, Karnataka 560001',
        siteAddress: '369 AI Innovation Center, Bangalore, Karnataka 560001',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'AI/ML software and hardware solutions',
        alice: 'AIMLTech',
        gstNumber: '29AIMLT1234J1Z4',
        createdBy: adminUser._id,
        addresses: [{
          id: 10,
          address: '369 AI Innovation Center, Bangalore, Karnataka 560001',
          district: 'Bangalore Urban',
          pincode: '560001',
          state: 'Karnataka',
          city: 'Bangalore',
          street: 'AI Innovation Center',
          gstNumber: '29AIMLT1234J1Z4',
          contactPersonName: 'Deepika Nair',
          designation: 'AI Research Lead',
          email: 'ai@aimltech.com',
          phone: '+91-9876543010',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Gaming Hardware Ltd',
        email: 'gaming@gaminghardware.com',
        phone: '+91-9876543011',
        panNumber: 'GAMEH1234K',
        address: '741 Gaming District, Mumbai, Maharashtra 400001',
        siteAddress: '741 Gaming District, Mumbai, Maharashtra 400001',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Gaming hardware and accessories supplier',
        alice: 'GameHard',
        gstNumber: '27GAMEH1234K1Z5',
        createdBy: adminUser._id,
        addresses: [{
          id: 11,
          address: '741 Gaming District, Mumbai, Maharashtra 400001',
          district: 'Mumbai',
          pincode: '400001',
          state: 'Maharashtra',
          city: 'Mumbai',
          street: 'Gaming District',
          gstNumber: '27GAMEH1234K1Z5',
          contactPersonName: 'Suresh Iyer',
          designation: 'Gaming Specialist',
          email: 'gaming@gaminghardware.com',
          phone: '+91-9876543011',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Enterprise Solutions Corp',
        email: 'enterprise@entsolutions.com',
        phone: '+91-9876543012',
        panNumber: 'ENTSO1234L',
        address: '852 Enterprise Park, Chennai, Tamil Nadu 600001',
        siteAddress: '852 Enterprise Park, Chennai, Tamil Nadu 600001',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Enterprise software and hardware solutions',
        alice: 'EntSol',
        gstNumber: '33ENTSO1234L1Z6',
        createdBy: adminUser._id,
        addresses: [{
          id: 12,
          address: '852 Enterprise Park, Chennai, Tamil Nadu 600001',
          district: 'Chennai',
          pincode: '600001',
          state: 'Tamil Nadu',
          city: 'Chennai',
          street: 'Enterprise Park',
          gstNumber: '33ENTSO1234L1Z6',
          contactPersonName: 'Anita Desai',
          designation: 'Enterprise Manager',
          email: 'enterprise@entsolutions.com',
          phone: '+91-9876543012',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'IoT Devices India',
        email: 'iot@iotdevices.com',
        phone: '+91-9876543013',
        panNumber: 'IOTDE1234M',
        address: '963 IoT Hub, Hyderabad, Telangana 500032',
        siteAddress: '963 IoT Hub, Hyderabad, Telangana 500032',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'IoT devices and smart technology solutions',
        alice: 'IoTDev',
        gstNumber: '36IOTDE1234M1Z7',
        createdBy: adminUser._id,
        addresses: [{
          id: 13,
          address: '963 IoT Hub, Hyderabad, Telangana 500032',
          district: 'Hyderabad',
          pincode: '500032',
          state: 'Telangana',
          city: 'Hyderabad',
          street: 'IoT Hub',
          gstNumber: '36IOTDE1234M1Z7',
          contactPersonName: 'Rajiv Khanna',
          designation: 'IoT Specialist',
          email: 'iot@iotdevices.com',
          phone: '+91-9876543013',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Blockchain Solutions Pvt Ltd',
        email: 'blockchain@blockchainsol.com',
        phone: '+91-9876543014',
        panNumber: 'BLOCK1234N',
        address: '147 Blockchain Center, Pune, Maharashtra 411001',
        siteAddress: '147 Blockchain Center, Pune, Maharashtra 411001',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Blockchain technology and cryptocurrency solutions',
        alice: 'BlockSol',
        gstNumber: '27BLOCK1234N1Z8',
        createdBy: adminUser._id,
        addresses: [{
          id: 14,
          address: '147 Blockchain Center, Pune, Maharashtra 411001',
          district: 'Pune',
          pincode: '411001',
          state: 'Maharashtra',
          city: 'Pune',
          street: 'Blockchain Center',
          gstNumber: '27BLOCK1234N1Z8',
          contactPersonName: 'Pooja Mehta',
          designation: 'Blockchain Developer',
          email: 'blockchain@blockchainsol.com',
          phone: '+91-9876543014',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      },
      {
        name: 'Quantum Computing Labs',
        email: 'quantum@quantumlabs.com',
        phone: '+91-9876543015',
        panNumber: 'QUANT1234O',
        address: '258 Quantum Park, Bangalore, Karnataka 560002',
        siteAddress: '258 Quantum Park, Bangalore, Karnataka 560002',
        customerType: 'retail',
        type: 'supplier',
        leadSource: 'vendor_registration',
        status: 'converted',
        assignedTo: null,
        notes: 'Quantum computing hardware and software solutions',
        alice: 'QuantumLab',
        gstNumber: '29QUANT1234O1Z9',
        createdBy: adminUser._id,
        addresses: [{
          id: 15,
          address: '258 Quantum Park, Bangalore, Karnataka 560002',
          district: 'Bangalore Urban',
          pincode: '560002',
          state: 'Karnataka',
          city: 'Bangalore',
          street: 'Quantum Park',
          gstNumber: '29QUANT1234O1Z9',
          contactPersonName: 'Manoj Tiwari',
          designation: 'Quantum Researcher',
          email: 'quantum@quantumlabs.com',
          phone: '+91-9876543015',
          registrationStatus: 'registered',
          isPrimary: true
        }]
      }
    ];

    // Clear existing suppliers
    await Customer.deleteMany({ type: 'supplier' });
    
    const createdSuppliers = [];
    for (const supplierData of suppliers) {
      const supplier = new Customer(supplierData);
      await supplier.save();
      createdSuppliers.push(supplier);
      console.log(`✅ Created supplier: ${supplierData.name}`);
    }

    // 2. Create Products
    console.log('\n🛍️ Creating products...');
    const products = [
      {
        name: 'Dell OptiPlex 7090 Desktop',
        description: 'High-performance business desktop with Intel Core i7 processor, 16GB RAM, 512GB SSD',
        category: ProductCategory.DESKTOP_COMPUTERS,
        brand: 'Dell',
        modelNumber: 'OptiPlex 7090',
        partNo: 'DELL-OPT-7090',
        hsnNumber: '8471.30.00',
        productType1: 'Desktop Computer',
        productType2: 'Business Grade',
        productType3: 'Intel Based',
        make: 'Dell Technologies',
        price: 85000,
        gst: 18,
        gndp: 100300,
        gndpTotal: 100300,
        uom: 'nos',
        cpcbNo: 'CPCB-DELL-7090-2024',
        quantity: 25,
        minStockLevel: 5,
        maxStockLevel: 50,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'HP EliteBook 840 G8 Laptop',
        description: 'Premium business laptop with AMD Ryzen 7 processor, 16GB RAM, 1TB SSD',
        category: ProductCategory.LAPTOPS,
        brand: 'HP',
        modelNumber: 'EliteBook 840 G8',
        partNo: 'HP-EB-840G8',
        hsnNumber: '8471.30.00',
        productType1: 'Laptop Computer',
        productType2: 'Professional Grade',
        productType3: 'AMD Based',
        make: 'HP Inc.',
        price: 95000,
        gst: 18,
        gndp: 112100,
        gndpTotal: 112100,
        uom: 'nos',
        cpcbNo: 'CPCB-HP-840G8-2024',
        quantity: 15,
        minStockLevel: 3,
        maxStockLevel: 30,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Microsoft Office 365 Business Premium',
        description: 'Complete productivity suite with cloud services and advanced security',
        category: ProductCategory.SOFTWARE,
        brand: 'Microsoft',
        modelNumber: 'Office 365 Business Premium',
        partNo: 'MS-O365-BUS-PREM',
        hsnNumber: '9983.14.00',
        productType1: 'Software License',
        productType2: 'Productivity Suite',
        productType3: 'Cloud Based',
        make: 'Microsoft Corporation',
        price: 1200,
        gst: 18,
        gndp: 1416,
        gndpTotal: 1416,
        uom: 'nos',
        cpcbNo: 'CPCB-MS-O365-2024',
        quantity: 200,
        minStockLevel: 50,
        maxStockLevel: 500,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Cisco Catalyst 2960 Switch',
        description: '24-port Gigabit Ethernet switch for small to medium networks',
        category: ProductCategory.NETWORKING,
        brand: 'Cisco',
        modelNumber: 'WS-C2960-24TC-L',
        partNo: 'CISCO-2960-24TC',
        hsnNumber: '8517.62.00',
        productType1: 'Network Switch',
        productType2: 'Managed Switch',
        productType3: 'Enterprise Grade',
        make: 'Cisco Systems',
        price: 45000,
        gst: 18,
        gndp: 53100,
        gndpTotal: 53100,
        uom: 'nos',
        cpcbNo: 'CPCB-CISCO-2960-2024',
        quantity: 8,
        minStockLevel: 2,
        maxStockLevel: 20,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Samsung 980 PRO 1TB SSD',
        description: 'High-performance NVMe SSD with PCIe 4.0 interface',
        category: ProductCategory.STORAGE,
        brand: 'Samsung',
        modelNumber: '980 PRO',
        partNo: 'SAMSUNG-980PRO-1TB',
        hsnNumber: '8471.70.00',
        productType1: 'Solid State Drive',
        productType2: 'NVMe SSD',
        productType3: 'High Performance',
        make: 'Samsung Electronics',
        price: 15000,
        gst: 18,
        gndp: 17700,
        gndpTotal: 17700,
        uom: 'nos',
        cpcbNo: 'CPCB-SAMSUNG-980PRO-2024',
        quantity: 45,
        minStockLevel: 10,
        maxStockLevel: 100,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Adobe Creative Cloud All Apps',
        description: 'Complete creative suite with all Adobe applications',
        category: ProductCategory.SOFTWARE,
        brand: 'Adobe',
        modelNumber: 'Creative Cloud All Apps',
        partNo: 'ADOBE-CC-ALL-APPS',
        hsnNumber: '9983.14.00',
        productType1: 'Software License',
        productType2: 'Creative Suite',
        productType3: 'Cloud Based',
        make: 'Adobe Inc.',
        price: 2500,
        gst: 18,
        gndp: 2950,
        gndpTotal: 2950,
        uom: 'nos',
        cpcbNo: 'CPCB-ADOBE-CC-2024',
        quantity: 80,
        minStockLevel: 20,
        maxStockLevel: 200,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Dell Ultrasharp U2720Q Monitor',
        description: '27-inch 4K UHD monitor with USB-C connectivity',
        category: ProductCategory.MONITORS,
        brand: 'Dell',
        modelNumber: 'U2720Q',
        partNo: 'DELL-U2720Q',
        hsnNumber: '8528.72.00',
        productType1: 'Computer Monitor',
        productType2: '4K Display',
        productType3: 'Professional Grade',
        make: 'Dell Technologies',
        price: 55000,
        gst: 18,
        gndp: 64900,
        gndpTotal: 64900,
        uom: 'nos',
        cpcbNo: 'CPCB-DELL-U2720Q-2024',
        quantity: 12,
        minStockLevel: 3,
        maxStockLevel: 25,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Logitech MX Master 3 Mouse',
        description: 'Wireless mouse with precision tracking and ergonomic design',
        category: ProductCategory.PERIPHERALS,
        brand: 'Logitech',
        modelNumber: 'MX Master 3',
        partNo: 'LOGITECH-MX-MASTER-3',
        hsnNumber: '8471.60.00',
        productType1: 'Computer Mouse',
        productType2: 'Wireless Mouse',
        productType3: 'Ergonomic Design',
        make: 'Logitech International',
        price: 8500,
        gst: 18,
        gndp: 10030,
        gndpTotal: 10030,
        uom: 'nos',
        cpcbNo: 'CPCB-LOGITECH-MX3-2024',
        quantity: 75,
        minStockLevel: 20,
        maxStockLevel: 150,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Apple MacBook Pro 14-inch M2',
        description: 'Professional laptop with Apple M2 chip and Liquid Retina XDR display',
        category: ProductCategory.LAPTOPS,
        brand: 'Apple',
        modelNumber: 'MacBook Pro 14" M2',
        partNo: 'APPLE-MBP-14-M2',
        hsnNumber: '8471.30.00',
        productType1: 'Laptop Computer',
        productType2: 'Professional Grade',
        productType3: 'Apple Silicon',
        make: 'Apple Inc.',
        price: 180000,
        gst: 18,
        gndp: 212400,
        gndpTotal: 212400,
        uom: 'nos',
        cpcbNo: 'CPCB-APPLE-MBP14M2-2024',
        quantity: 6,
        minStockLevel: 2,
        maxStockLevel: 15,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Fortinet FortiGate 60F Firewall',
        description: 'Next-generation firewall with integrated security services',
        category: ProductCategory.SECURITY,
        brand: 'Fortinet',
        modelNumber: 'FortiGate 60F',
        partNo: 'FORTINET-FG-60F',
        hsnNumber: '8517.62.00',
        productType1: 'Network Security',
        productType2: 'Firewall',
        productType3: 'Next Generation',
        make: 'Fortinet Inc.',
        price: 75000,
        gst: 18,
        gndp: 88500,
        gndpTotal: 88500,
        uom: 'nos',
        cpcbNo: 'CPCB-FORTINET-60F-2024',
        quantity: 3,
        minStockLevel: 1,
        maxStockLevel: 10,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Intel Core i9-12900K Processor',
        description: 'High-performance desktop processor with hybrid architecture',
        category: ProductCategory.COMPONENTS,
        brand: 'Intel',
        modelNumber: 'Core i9-12900K',
        partNo: 'INTEL-I9-12900K',
        hsnNumber: '8471.30.00',
        productType1: 'Computer Processor',
        productType2: 'High Performance',
        productType3: 'Desktop CPU',
        make: 'Intel Corporation',
        price: 45000,
        gst: 18,
        gndp: 53100,
        gndpTotal: 53100,
        uom: 'nos',
        cpcbNo: 'CPCB-INTEL-I9-12900K-2024',
        quantity: 18,
        minStockLevel: 5,
        maxStockLevel: 40,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Corsair Vengeance LPX 32GB RAM Kit',
        description: 'High-performance DDR4 memory kit for gaming and professional use',
        category: ProductCategory.COMPONENTS,
        brand: 'Corsair',
        modelNumber: 'Vengeance LPX 32GB',
        partNo: 'CORSAIR-VLPX-32GB',
        hsnNumber: '8473.30.00',
        productType1: 'Computer Memory',
        productType2: 'DDR4 RAM',
        productType3: 'High Performance',
        make: 'Corsair Gaming Inc.',
        price: 12000,
        gst: 18,
        gndp: 14160,
        gndpTotal: 14160,
        uom: 'nos',
        cpcbNo: 'CPCB-CORSAIR-VLPX32-2024',
        quantity: 35,
        minStockLevel: 10,
        maxStockLevel: 80,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'NVIDIA GeForce RTX 4080 Graphics Card',
        description: 'High-end graphics card with ray tracing and AI capabilities',
        category: ProductCategory.COMPONENTS,
        brand: 'NVIDIA',
        modelNumber: 'GeForce RTX 4080',
        partNo: 'NVIDIA-RTX-4080',
        hsnNumber: '8471.30.00',
        productType1: 'Graphics Card',
        productType2: 'High End GPU',
        productType3: 'Gaming Grade',
        make: 'NVIDIA Corporation',
        price: 120000,
        gst: 18,
        gndp: 141600,
        gndpTotal: 141600,
        uom: 'nos',
        cpcbNo: 'CPCB-NVIDIA-RTX4080-2024',
        quantity: 5,
        minStockLevel: 2,
        maxStockLevel: 15,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'AWS EC2 Instance Credits',
        description: 'Cloud computing credits for Amazon Web Services EC2 instances',
        category: ProductCategory.CLOUD_SERVICES,
        brand: 'Amazon Web Services',
        modelNumber: 'EC2 Credits',
        partNo: 'AWS-EC2-CREDITS',
        hsnNumber: '9983.14.00',
        productType1: 'Cloud Service',
        productType2: 'Compute Credits',
        productType3: 'Infrastructure as a Service',
        make: 'Amazon Web Services Inc.',
        price: 100,
        gst: 18,
        gndp: 118,
        gndpTotal: 118,
        uom: 'nos',
        cpcbNo: 'CPCB-AWS-EC2-2024',
        quantity: 400,
        minStockLevel: 100,
        maxStockLevel: 1000,
        isActive: true,
        createdBy: adminUser._id
      },
      {
        name: 'Microsoft Azure Credits',
        description: 'Cloud platform credits for Microsoft Azure services',
        category: ProductCategory.CLOUD_SERVICES,
        brand: 'Microsoft',
        modelNumber: 'Azure Credits',
        partNo: 'MS-AZURE-CREDITS',
        hsnNumber: '9983.14.00',
        productType1: 'Cloud Service',
        productType2: 'Compute Credits',
        productType3: 'Infrastructure as a Service',
        make: 'Microsoft Corporation',
        price: 100,
        gst: 18,
        gndp: 118,
        gndpTotal: 118,
        uom: 'nos',
        cpcbNo: 'CPCB-MS-AZURE-2024',
        quantity: 350,
        minStockLevel: 100,
        maxStockLevel: 1000,
        isActive: true,
        createdBy: adminUser._id
      }
    ];

    // Clear existing products
    await Product.deleteMany({});
    
    const createdProducts = [];
    for (const productData of products) {
      const product = new Product(productData);
      await product.save();
      createdProducts.push(product);
      console.log(`✅ Created product: ${productData.name}`);
    }

    // 3. Create Stock Locations (simplified approach)
    console.log('\n🏢 Creating stock locations...');
    
    // Create multiple stock locations
    const stockLocationsData = [
      {
        name: 'Main Warehouse',
        address: '123 Industrial Area, Bangalore, Karnataka 560001',
        type: 'warehouse',
        contactPerson: 'Rajesh Kumar',
        phone: '+91-9876543000',
        gstNumber: '29MAIN1234W1Z0',
        isActive: true,
        isPrimary: true
      },
      {
        name: 'Secondary Warehouse',
        address: '456 Tech Park, Mumbai, Maharashtra 400001',
        type: 'warehouse',
        contactPerson: 'Priya Sharma',
        phone: '+91-9876543001',
        gstNumber: '27SECO1234W1Z1',
        isActive: true,
        isPrimary: false
      },
      {
        name: 'Service Center',
        address: '789 Service Hub, Delhi, Delhi 110001',
        type: 'service_center',
        contactPerson: 'Amit Verma',
        phone: '+91-9876543002',
        gstNumber: '07SERV1234W1Z2',
        isActive: true,
        isPrimary: false
      },
      {
        name: 'Regional Office',
        address: '321 Business District, Chennai, Tamil Nadu 600001',
        type: 'main_office',
        contactPerson: 'Sunita Reddy',
        phone: '+91-9876543003',
        gstNumber: '33REGO1234W1Z3',
        isActive: true,
        isPrimary: false
      },
      {
        name: 'Distribution Center',
        address: '654 Logistics Park, Pune, Maharashtra 411001',
        type: 'warehouse',
        contactPerson: 'Vikram Joshi',
        phone: '+91-9876543004',
        gstNumber: '27DIST1234W1Z4',
        isActive: true,
        isPrimary: false
      }
    ];

    // Insert stock locations directly into the database
    const stockLocationResults = [];
    for (const locationData of stockLocationsData) {
      const result = await mongoose.connection.db!.collection('stocklocations').insertOne({
        ...locationData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      stockLocationResults.push(result);
      console.log(`✅ Created stock location: ${locationData.name}`);
    }

    // 3.1 Create Rooms for each location
    console.log('\n🚪 Creating rooms for each location...');
    
    const roomsData = [
      // Main Warehouse Rooms
      {
        name: 'Hardware Storage Room A',
        location: stockLocationResults[0].insertedId, // Main Warehouse
        description: 'Primary hardware storage area',
        capacity: 1000,
        isActive: true
      },
      {
        name: 'Software Storage Room B',
        location: stockLocationResults[0].insertedId, // Main Warehouse
        description: 'Software licenses and digital products storage',
        capacity: 500,
        isActive: true
      },
      {
        name: 'Service Parts Room C',
        location: stockLocationResults[0].insertedId, // Main Warehouse
        description: 'Service and repair parts storage',
        capacity: 300,
        isActive: true
      },
      
      // Secondary Warehouse Rooms
      {
        name: 'Backup Storage Room',
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        description: 'Backup inventory storage',
        capacity: 800,
        isActive: true
      },
      {
        name: 'Bulk Storage Room',
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        description: 'Bulk inventory storage',
        capacity: 1200,
        isActive: true
      },
      
      // Service Center Rooms
      {
        name: 'Service Workshop',
        location: stockLocationResults[2].insertedId, // Service Center
        description: 'Active service and repair workshop',
        capacity: 200,
        isActive: true
      },
      {
        name: 'Parts Storage',
        location: stockLocationResults[2].insertedId, // Service Center
        description: 'Service parts and components',
        capacity: 150,
        isActive: true
      },
      
      // Regional Office Rooms
      {
        name: 'Software Vault',
        location: stockLocationResults[3].insertedId, // Regional Office
        description: 'Secure software license storage',
        capacity: 100,
        isActive: true
      },
      {
        name: 'Cloud Services Room',
        location: stockLocationResults[3].insertedId, // Regional Office
        description: 'Cloud service management center',
        capacity: 50,
        isActive: true
      },
      
      // Distribution Center Rooms
      {
        name: 'Shipping Dock',
        location: stockLocationResults[4].insertedId, // Distribution Center
        description: 'Loading and shipping area',
        capacity: 500,
        isActive: true
      },
      {
        name: 'Receiving Bay',
        location: stockLocationResults[4].insertedId, // Distribution Center
        description: 'Incoming goods receiving area',
        capacity: 300,
        isActive: true
      }
    ];

    // Insert rooms directly into the database
    const roomResults = [];
    for (const roomData of roomsData) {
      const result = await mongoose.connection.db!.collection('rooms').insertOne({
        ...roomData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      roomResults.push(result);
      console.log(`✅ Created room: ${roomData.name} in ${stockLocationsData.find(loc => loc.name === 'Main Warehouse')?.name || 'Location'}`);
    }

    // 3.2 Create Racks for each room
    console.log('\n📚 Creating racks for each room...');
    
    const racksData = [
      // Main Warehouse - Hardware Storage Room A
      {
        name: 'A-01',
        room: roomResults[0].insertedId, // Hardware Storage Room A
        description: 'Desktop computers and workstations',
        capacity: 50,
        isActive: true
      },
      {
        name: 'A-02',
        room: roomResults[0].insertedId, // Hardware Storage Room A
        description: 'Laptops and mobile devices',
        capacity: 40,
        isActive: true
      },
      {
        name: 'A-03',
        room: roomResults[0].insertedId, // Hardware Storage Room A
        description: 'Monitors and displays',
        capacity: 60,
        isActive: true
      },
      {
        name: 'A-04',
        room: roomResults[0].insertedId, // Hardware Storage Room A
        description: 'Networking equipment',
        capacity: 30,
        isActive: true
      },
      {
        name: 'A-05',
        room: roomResults[0].insertedId, // Hardware Storage Room A
        description: 'Storage devices and SSDs',
        capacity: 80,
        isActive: true
      },
      
      // Main Warehouse - Software Storage Room B
      {
        name: 'B-01',
        room: roomResults[1].insertedId, // Software Storage Room B
        description: 'Microsoft software licenses',
        capacity: 200,
        isActive: true
      },
      {
        name: 'B-02',
        room: roomResults[1].insertedId, // Software Storage Room B
        description: 'Adobe software licenses',
        capacity: 100,
        isActive: true
      },
      {
        name: 'B-03',
        room: roomResults[1].insertedId, // Software Storage Room B
        description: 'Cloud service credits',
        capacity: 500,
        isActive: true
      },
      
      // Main Warehouse - Service Parts Room C
      {
        name: 'C-01',
        room: roomResults[2].insertedId, // Service Parts Room C
        description: 'Computer components',
        capacity: 100,
        isActive: true
      },
      {
        name: 'C-02',
        room: roomResults[2].insertedId, // Service Parts Room C
        description: 'Peripherals and accessories',
        capacity: 150,
        isActive: true
      },
      
      // Secondary Warehouse - Backup Storage Room
      {
        name: 'BU-01',
        room: roomResults[3].insertedId, // Backup Storage Room
        description: 'Backup hardware inventory',
        capacity: 100,
        isActive: true
      },
      {
        name: 'BU-02',
        room: roomResults[3].insertedId, // Backup Storage Room
        description: 'Backup peripherals',
        capacity: 80,
        isActive: true
      },
      
      // Secondary Warehouse - Bulk Storage Room
      {
        name: 'BL-01',
        room: roomResults[4].insertedId, // Bulk Storage Room
        description: 'Bulk storage devices',
        capacity: 200,
        isActive: true
      },
      
      // Service Center - Service Workshop
      {
        name: 'SW-01',
        room: roomResults[5].insertedId, // Service Workshop
        description: 'Active repair components',
        capacity: 50,
        isActive: true
      },
      {
        name: 'SW-02',
        room: roomResults[5].insertedId, // Service Workshop
        description: 'Testing equipment',
        capacity: 30,
        isActive: true
      },
      
      // Service Center - Parts Storage
      {
        name: 'PS-01',
        room: roomResults[6].insertedId, // Parts Storage
        description: 'Service parts inventory',
        capacity: 80,
        isActive: true
      },
      
      // Regional Office - Software Vault
      {
        name: 'SV-01',
        room: roomResults[7].insertedId, // Software Vault
        description: 'Secure software storage',
        capacity: 50,
        isActive: true
      },
      
      // Regional Office - Cloud Services Room
      {
        name: 'CS-01',
        room: roomResults[8].insertedId, // Cloud Services Room
        description: 'Cloud service management',
        capacity: 25,
        isActive: true
      },
      
      // Distribution Center - Shipping Dock
      {
        name: 'SD-01',
        room: roomResults[9].insertedId, // Shipping Dock
        description: 'Ready for shipment',
        capacity: 100,
        isActive: true
      },
      
      // Distribution Center - Receiving Bay
      {
        name: 'RB-01',
        room: roomResults[10].insertedId, // Receiving Bay
        description: 'Incoming inventory',
        capacity: 80,
        isActive: true
      }
    ];

    // Insert racks directly into the database
    const rackResults = [];
    for (const rackData of racksData) {
      const result = await mongoose.connection.db!.collection('racks').insertOne({
        ...rackData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      rackResults.push(result);
      console.log(`✅ Created rack: ${rackData.name}`);
    }

    // 4. Create Stock Entries
    console.log('\n📦 Creating stock entries...');
    
    const stockEntries = [
      // Main Warehouse - Hardware Storage Room A - Rack A-01 (Desktop computers)
      {
        product: createdProducts[0]._id, // Dell OptiPlex Desktop
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[0].insertedId, // A-01
        quantity: 15,
        reservedQuantity: 0,
        availableQuantity: 15,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Hardware Storage Room A - Rack A-02 (Laptops)
      {
        product: createdProducts[1]._id, // HP EliteBook Laptop
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[1].insertedId, // A-02
        quantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[8]._id, // Apple MacBook
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[1].insertedId, // A-02
        quantity: 4,
        reservedQuantity: 0,
        availableQuantity: 4,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Hardware Storage Room A - Rack A-03 (Monitors)
      {
        product: createdProducts[6]._id, // Dell Monitor
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[2].insertedId, // A-03
        quantity: 8,
        reservedQuantity: 0,
        availableQuantity: 8,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Hardware Storage Room A - Rack A-04 (Networking)
      {
        product: createdProducts[3]._id, // Cisco Switch
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[3].insertedId, // A-04
        quantity: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[9]._id, // Fortinet Firewall
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[3].insertedId, // A-04
        quantity: 2,
        reservedQuantity: 0,
        availableQuantity: 2,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Hardware Storage Room A - Rack A-05 (Storage devices)
      {
        product: createdProducts[4]._id, // Samsung SSD
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[0].insertedId, // Hardware Storage Room A
        rack: rackResults[4].insertedId, // A-05
        quantity: 25,
        reservedQuantity: 0,
        availableQuantity: 25,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Software Storage Room B - Rack B-01 (Microsoft software)
      {
        product: createdProducts[2]._id, // Microsoft Office 365
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[1].insertedId, // Software Storage Room B
        rack: rackResults[5].insertedId, // B-01
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Software Storage Room B - Rack B-02 (Adobe software)
      {
        product: createdProducts[5]._id, // Adobe Creative Cloud
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[1].insertedId, // Software Storage Room B
        rack: rackResults[6].insertedId, // B-02
        quantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Software Storage Room B - Rack B-03 (Cloud credits)
      {
        product: createdProducts[13]._id, // AWS EC2 Credits
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[1].insertedId, // Software Storage Room B
        rack: rackResults[7].insertedId, // B-03
        quantity: 200,
        reservedQuantity: 0,
        availableQuantity: 200,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[14]._id, // Azure Credits
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[1].insertedId, // Software Storage Room B
        rack: rackResults[7].insertedId, // B-03
        quantity: 175,
        reservedQuantity: 0,
        availableQuantity: 175,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Service Parts Room C - Rack C-01 (Computer components)
      {
        product: createdProducts[10]._id, // Intel Processor
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[2].insertedId, // Service Parts Room C
        rack: rackResults[8].insertedId, // C-01
        quantity: 12,
        reservedQuantity: 0,
        availableQuantity: 12,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[11]._id, // Corsair RAM
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[2].insertedId, // Service Parts Room C
        rack: rackResults[8].insertedId, // C-01
        quantity: 20,
        reservedQuantity: 0,
        availableQuantity: 20,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[12]._id, // NVIDIA Graphics Card
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[2].insertedId, // Service Parts Room C
        rack: rackResults[8].insertedId, // C-01
        quantity: 3,
        reservedQuantity: 0,
        availableQuantity: 3,
        lastUpdated: new Date()
      },
      
      // Main Warehouse - Service Parts Room C - Rack C-02 (Peripherals)
      {
        product: createdProducts[7]._id, // Logitech Mouse
        location: stockLocationResults[0].insertedId, // Main Warehouse
        room: roomResults[2].insertedId, // Service Parts Room C
        rack: rackResults[9].insertedId, // C-02
        quantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
        lastUpdated: new Date()
      },
      
      // Secondary Warehouse - Backup Storage Room - Rack BU-01
      {
        product: createdProducts[0]._id, // Dell OptiPlex Desktop
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        room: roomResults[3].insertedId, // Backup Storage Room
        rack: rackResults[10].insertedId, // BU-01
        quantity: 10,
        reservedQuantity: 0,
        availableQuantity: 10,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[1]._id, // HP EliteBook Laptop
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        room: roomResults[3].insertedId, // Backup Storage Room
        rack: rackResults[10].insertedId, // BU-01
        quantity: 5,
        reservedQuantity: 0,
        availableQuantity: 5,
        lastUpdated: new Date()
      },
      
      // Secondary Warehouse - Backup Storage Room - Rack BU-02
      {
        product: createdProducts[6]._id, // Dell Monitor
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        room: roomResults[3].insertedId, // Backup Storage Room
        rack: rackResults[11].insertedId, // BU-02
        quantity: 4,
        reservedQuantity: 0,
        availableQuantity: 4,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[7]._id, // Logitech Mouse
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        room: roomResults[3].insertedId, // Backup Storage Room
        rack: rackResults[11].insertedId, // BU-02
        quantity: 25,
        reservedQuantity: 0,
        availableQuantity: 25,
        lastUpdated: new Date()
      },
      
      // Secondary Warehouse - Bulk Storage Room - Rack BL-01
      {
        product: createdProducts[4]._id, // Samsung SSD
        location: stockLocationResults[1].insertedId, // Secondary Warehouse
        room: roomResults[4].insertedId, // Bulk Storage Room
        rack: rackResults[12].insertedId, // BL-01
        quantity: 20,
        reservedQuantity: 0,
        availableQuantity: 20,
        lastUpdated: new Date()
      },
      
      // Service Center - Service Workshop - Rack SW-01
      {
        product: createdProducts[3]._id, // Cisco Switch
        location: stockLocationResults[2].insertedId, // Service Center
        room: roomResults[5].insertedId, // Service Workshop
        rack: rackResults[13].insertedId, // SW-01
        quantity: 3,
        reservedQuantity: 0,
        availableQuantity: 3,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[9]._id, // Fortinet Firewall
        location: stockLocationResults[2].insertedId, // Service Center
        room: roomResults[5].insertedId, // Service Workshop
        rack: rackResults[13].insertedId, // SW-01
        quantity: 1,
        reservedQuantity: 0,
        availableQuantity: 1,
        lastUpdated: new Date()
      },
      
      // Service Center - Service Workshop - Rack SW-02
      {
        product: createdProducts[10]._id, // Intel Processor
        location: stockLocationResults[2].insertedId, // Service Center
        room: roomResults[5].insertedId, // Service Workshop
        rack: rackResults[14].insertedId, // SW-02
        quantity: 6,
        reservedQuantity: 0,
        availableQuantity: 6,
        lastUpdated: new Date()
      },
      
      // Service Center - Parts Storage - Rack PS-01
      {
        product: createdProducts[11]._id, // Corsair RAM
        location: stockLocationResults[2].insertedId, // Service Center
        room: roomResults[6].insertedId, // Parts Storage
        rack: rackResults[15].insertedId, // PS-01
        quantity: 15,
        reservedQuantity: 0,
        availableQuantity: 15,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[12]._id, // NVIDIA Graphics Card
        location: stockLocationResults[2].insertedId, // Service Center
        room: roomResults[6].insertedId, // Parts Storage
        rack: rackResults[15].insertedId, // PS-01
        quantity: 2,
        reservedQuantity: 0,
        availableQuantity: 2,
        lastUpdated: new Date()
      },
      
      // Regional Office - Software Vault - Rack SV-01
      {
        product: createdProducts[2]._id, // Microsoft Office 365
        location: stockLocationResults[3].insertedId, // Regional Office
        room: roomResults[7].insertedId, // Software Vault
        rack: rackResults[16].insertedId, // SV-01
        quantity: 100,
        reservedQuantity: 0,
        availableQuantity: 100,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[5]._id, // Adobe Creative Cloud
        location: stockLocationResults[3].insertedId, // Regional Office
        room: roomResults[7].insertedId, // Software Vault
        rack: rackResults[16].insertedId, // SV-01
        quantity: 30,
        reservedQuantity: 0,
        availableQuantity: 30,
        lastUpdated: new Date()
      },
      
      // Regional Office - Cloud Services Room - Rack CS-01
      {
        product: createdProducts[13]._id, // AWS EC2 Credits
        location: stockLocationResults[3].insertedId, // Regional Office
        room: roomResults[8].insertedId, // Cloud Services Room
        rack: rackResults[17].insertedId, // CS-01
        quantity: 200,
        reservedQuantity: 0,
        availableQuantity: 200,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[14]._id, // Azure Credits
        location: stockLocationResults[3].insertedId, // Regional Office
        room: roomResults[8].insertedId, // Cloud Services Room
        rack: rackResults[17].insertedId, // CS-01
        quantity: 175,
        reservedQuantity: 0,
        availableQuantity: 175,
        lastUpdated: new Date()
      },
      
      // Distribution Center - Shipping Dock - Rack SD-01
      {
        product: createdProducts[8]._id, // Apple MacBook
        location: stockLocationResults[4].insertedId, // Distribution Center
        room: roomResults[9].insertedId, // Shipping Dock
        rack: rackResults[18].insertedId, // SD-01
        quantity: 2,
        reservedQuantity: 0,
        availableQuantity: 2,
        lastUpdated: new Date()
      },
      {
        product: createdProducts[7]._id, // Logitech Mouse
        location: stockLocationResults[4].insertedId, // Distribution Center
        room: roomResults[9].insertedId, // Shipping Dock
        rack: rackResults[18].insertedId, // SD-01
        quantity: 50,
        reservedQuantity: 0,
        availableQuantity: 50,
        lastUpdated: new Date()
      },
      
      // Distribution Center - Receiving Bay - Rack RB-01
      {
        product: createdProducts[4]._id, // Samsung SSD
        location: stockLocationResults[4].insertedId, // Distribution Center
        room: roomResults[10].insertedId, // Receiving Bay
        rack: rackResults[19].insertedId, // RB-01
        quantity: 30,
        reservedQuantity: 0,
        availableQuantity: 30,
        lastUpdated: new Date()
      }
    ];

    // Clear existing stock entries
    await Stock.deleteMany({});
    
    for (const stockData of stockEntries) {
      const stock = new Stock(stockData);
      await stock.save();
      console.log(`✅ Created stock entry for product: ${stockData.product}`);
    }

    // 5. Summary
    console.log('\n🎉 Seed data creation completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Suppliers: ${createdSuppliers.length}`);
    console.log(`  - Products: ${createdProducts.length}`);
    console.log(`  - Stock Locations: ${stockLocationResults.length}`);
    console.log(`  - Rooms: ${roomResults.length}`);
    console.log(`  - Racks: ${rackResults.length}`);
    console.log(`  - Stock Entries: ${stockEntries.length}`);

    // Show sample data
    console.log('\n📋 Sample created data:');
    console.log('Suppliers:');
    createdSuppliers.forEach(supplier => {
      console.log(`  - ${supplier.name} (${supplier.email || 'No email'})`);
    });
    
    console.log('Products:');
    createdProducts.forEach(product => {
      console.log(`  - ${product.name} (${product.partNo}) - Qty: ${product.quantity}`);
    });

    console.log('Stock Locations:');
    stockLocationsData.forEach(location => {
      console.log(`  - ${location.name} (${location.type}) - ${location.address}`);
    });

    console.log('Rooms:');
    roomsData.forEach(room => {
      const locationName = stockLocationsData.find(loc => loc.name === 'Main Warehouse')?.name || 'Location';
      console.log(`  - ${room.name} - Capacity: ${room.capacity}`);
    });

    console.log('Racks:');
    racksData.forEach(rack => {
      console.log(`  - ${rack.name} - ${rack.description} - Capacity: ${rack.capacity}`);
    });

  } catch (error) {
    console.error('❌ Seed data creation failed:', error);
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script if executed directly
if (require.main === module) {
  createCompleteSeedData()
    .then(() => {
      console.log('✅ Complete seed data creation script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Complete seed data creation script failed:', error);
      process.exit(1);
    });
}

export { createCompleteSeedData };
