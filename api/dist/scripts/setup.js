"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
const Stock_1 = require("../models/Stock");
const Product_1 = require("../models/Product");
const types_1 = require("../types");
dotenv_1.default.config();
const setup = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sun-power-services-erp';
        await mongoose_1.default.connect(mongoURI);
        console.log('Connected to MongoDB');
        const existingSuperAdmin = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
        if (!existingSuperAdmin) {
            console.log('Creating Super Admin user...');
            const superAdmin = await User_1.User.create({
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@sunpowerservices.com',
                password: 'admin123',
                role: types_1.UserRole.SUPER_ADMIN,
                status: types_1.UserStatus.ACTIVE,
                phone: '+911234567890',
                address: 'Sun Power Services Head Office'
            });
            console.log('Super Admin created:', {
                email: superAdmin.email,
                password: 'admin123',
                role: superAdmin.role
            });
        }
        else {
            console.log('Super Admin already exists');
        }
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
            const existingLocation = await Stock_1.StockLocation.findOne({ name: locationData.name });
            if (!existingLocation) {
                await Stock_1.StockLocation.create(locationData);
                console.log(`Created stock location: ${locationData.name}`);
            }
        }
        const sampleProducts = [
            {
                name: 'Diesel Generator 10KVA',
                description: 'High efficiency diesel generator suitable for commercial use',
                category: types_1.ProductCategory.GENSET,
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
                createdBy: null
            },
            {
                name: 'Engine Oil Filter',
                description: 'High quality engine oil filter for diesel generators',
                category: types_1.ProductCategory.SPARE_PART,
                brand: 'FilterTech',
                model: 'FT-EOL-001',
                specifications: {
                    compatibility: 'Most diesel engines',
                    material: 'Paper element',
                    micronRating: '25 micron'
                },
                price: 500,
                minStockLevel: 50,
                createdBy: null
            },
            {
                name: 'Battery Charger',
                description: 'Automatic battery charger for generator starting systems',
                category: types_1.ProductCategory.ACCESSORY,
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
                createdBy: null
            }
        ];
        const superAdminUser = await User_1.User.findOne({ role: types_1.UserRole.SUPER_ADMIN });
        for (const productData of sampleProducts) {
            const existingProduct = await Product_1.Product.findOne({ name: productData.name });
            if (!existingProduct && superAdminUser) {
                productData.createdBy = superAdminUser._id.toString();
                await Product_1.Product.create(productData);
                console.log(`Created sample product: ${productData.name}`);
            }
        }
        console.log('\n🎉 Database setup completed successfully!');
        console.log('\n📝 Default credentials:');
        console.log('   Email: admin@sunpowerservices.com');
        console.log('   Password: admin123');
        console.log('\n🚀 You can now start the server with: npm run dev');
    }
    catch (error) {
        console.error('Setup failed:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
};
if (require.main === module) {
    setup();
}
exports.default = setup;
//# sourceMappingURL=setup.js.map