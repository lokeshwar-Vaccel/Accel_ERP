import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import customerRoutes from './customers';
import productRoutes from './products';
import stockRoutes from './stock';
import serviceRoutes from './services';
import amcRoutes from './amc';
import purchaseOrderRoutes from './purchaseOrders';
import reportRoutes from './reports';
import dashboardRoutes from './dashboard';
import fileRoutes from './files';
import adminRoutes from './admin';
import communicationRoutes from './communications';
import ledgerRoutes from './stockLedgerRoutes';
import invoiceRoutes from './invoices';
import paymentRoutes from './payments';
import paymentLinkRoutes from './paymentLinks';
import notificationRoutes from './notifications';
import generalSettingsRoutes from './generalSettings';


const router = Router();

// API Status
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
      dashboard: '/dashboard',
      files: '/files',
      admin: '/admin',
      communications: '/communications',
      ledger: '/ledger',
      invoices: '/invoices',
      payments: '/payments',
      paymentLinks: '/payment-links'
    }
  });
});

// Route middlewares
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/services', serviceRoutes);
router.use('/amc', amcRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/reports', reportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/files', fileRoutes);
router.use('/admin', adminRoutes);
router.use('/communications', communicationRoutes);
router.use('/ledger', ledgerRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/generalSettings', generalSettingsRoutes);
router.use('/payment-links', paymentLinkRoutes);

export default router;