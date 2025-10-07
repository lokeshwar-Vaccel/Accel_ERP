import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { StockLocation } from '../models/Stock';
import { Product } from '../models/Product';
import { UserRole, UserStatus, ProductCategory } from '../types';

// Load environment variables
dotenv.config();

const setup = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-services-erp';
    await mongoose.connect(mongoURI);

    // Create Super Admin user if it doesn't exist
    const existingSuperAdmin = await User.findOne({ role: UserRole.SUPER_ADMIN });
    
    if (!existingSuperAdmin) {
      
      const superAdmin = await User.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@sunpowerservices.com',
        password: 'admin123',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        phone: '+911234567890',
        address: 'Sun Power Services Head Office',
        moduleAccess: [
          { module: 'dashboard', access: true, permission: 'admin' },
          { module: 'lead_management', access: true, permission: 'admin' },
          { module: 'user_management', access: true, permission: 'admin' },
          { module: 'quotation_management', access: true, permission: 'admin' },
          { module: 'product_management', access: true, permission: 'admin' },
          { module: 'inventory_management', access: true, permission: 'admin' },
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
      });

    } else {
      console.error('Super Admin already exists');
    }

    // Create default stock locations
    const defaultLocations = [
      {
        name: 'Main Office',
        address: 'Sun Power Services Head Office, Mumbai',
        type: 'main_office',
        contactPerson: 'Office Manager',
        phone: '+911234567890'
      },
      {
        name: 'Warehouse A',
        address: 'Warehouse A, Industrial Area, Mumbai',
        type: 'warehouse',
        contactPerson: 'Warehouse Manager',
        phone: '+911234567891'
      },
      {
        name: 'Service Center Delhi',
        address: 'Service Center, Delhi',
        type: 'service_center',
        contactPerson: 'Service Manager',
        phone: '+911234567892'
      }
    ];

    for (const locationData of defaultLocations) {
      const existingLocation = await StockLocation.findOne({ name: locationData.name });
      if (!existingLocation) {
        await StockLocation.create(locationData);
      }
    }

    // Create sample products
    const sampleProducts = [
      {
        name: 'Diesel Generator 10KVA',
        description: 'High efficiency diesel generator suitable for commercial use',
        category: ProductCategory.GENSET,
        brand: 'PowerGen',
        model: 'PG-10KVA',
        specifications: {
          power: '10KVA',
          fuel: 'Diesel',
          phases: '3-Phase',
          voltage: '415V',
          frequency: '50Hz'
        },
        price: 150000,
        minStockLevel: 5,
        createdBy: null as string | null // Will be set to super admin ID
      },
      {
        name: 'Engine Oil Filter',
        description: 'High quality engine oil filter for diesel generators',
        category: ProductCategory.SPARE_PART,
        brand: 'FilterTech',
        model: 'FT-EOL-001',
        specifications: {
          compatibility: 'Most diesel engines',
          material: 'Paper element',
          micronRating: '25 micron'
        },
        price: 500,
        minStockLevel: 50,
        createdBy: null as string | null
      },
      {
        name: 'Battery Charger',
        description: 'Automatic battery charger for generator starting systems',
        category: ProductCategory.ACCESSORY,
        brand: 'ChargeMaster',
        model: 'CM-12V-10A',
        specifications: {
          voltage: '12V',
          current: '10A',
          type: 'Automatic',
          features: 'Overcharge protection'
        },
        price: 5000,
        minStockLevel: 20,
        createdBy: null as string | null
      }
    ];

    const superAdminUser = await User.findOne({ role: UserRole.SUPER_ADMIN });

    for (const productData of sampleProducts) {
      const existingProduct = await Product.findOne({ name: productData.name });
      if (!existingProduct && superAdminUser) {
        productData.createdBy = (superAdminUser._id as mongoose.Types.ObjectId).toString();
        await Product.create(productData);
      }
    }

  } catch (error) {
    console.error('Setup failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setup();
}

export default setup; 