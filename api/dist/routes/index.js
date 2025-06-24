"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = __importDefault(require("./auth"));
const users_1 = __importDefault(require("./users"));
const customers_1 = __importDefault(require("./customers"));
const products_1 = __importDefault(require("./products"));
const stock_1 = __importDefault(require("./stock"));
const services_1 = __importDefault(require("./services"));
const amc_1 = __importDefault(require("./amc"));
const purchaseOrders_1 = __importDefault(require("./purchaseOrders"));
const reports_1 = __importDefault(require("./reports"));
const dashboard_1 = __importDefault(require("./dashboard"));
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Sun Power Services ERP API v1.0',
        version: '1.0.0',
        endpoints: {
            auth: '/auth',
            users: '/users',
            customers: '/customers',
            products: '/products',
            stock: '/stock',
            services: '/services',
            amc: '/amc',
            purchaseOrders: '/purchase-orders',
            reports: '/reports',
            dashboard: '/dashboard'
        }
    });
});
router.use('/auth', auth_1.default);
router.use('/users', users_1.default);
router.use('/customers', customers_1.default);
router.use('/products', products_1.default);
router.use('/stock', stock_1.default);
router.use('/services', services_1.default);
router.use('/amc', amc_1.default);
router.use('/purchase-orders', purchaseOrders_1.default);
router.use('/reports', reports_1.default);
router.use('/dashboard', dashboard_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map