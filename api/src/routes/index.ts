import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import customerRoutes from './customers';
import productRoutes from './products';
import dgProductRoutes from './dgProducts';
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
import quotationsRouter from './quotations';
import inventoryRoutes from './inventory';
import digitalServiceReportRoutes from './digitalServiceReports';
import feedbackRoutes from './feedback';
import dgEnquiriesRoutes from './dgEnquiries';
import dgPurchaseOrdersRoutes from './dgPurchaseOrders';
import proformaInvoicesRoutes from './proformaInvoices';
import dgInvoicesRoutes from './dgInvoices';
import dgPaymentsRoutes from './dgPayments';
import oemsRoutes from './oems';
import oemOrdersRoutes from './oemOrders';
import dgReportsRoutes from './dgReports';
import dgQuotationsRoutes from './dgQuotations';
import purchaseOrderPaymentRoutes from './purchaseOrderPayments';
import quotationPaymentRoutes from './quotationPayments';
import invoicePaymentRoutes from './invoicePayments';
import dgInvoicePaymentRoutes from './dgInvoicePayments';
import dgQuotationPaymentRoutes from './dgQuotationPayments';
import qrCodeRoutes from './qrCode';
import poFilesRoutes from './poFiles';
import poFromCustomersRoutes from './poFromCustomers';
import dgPoFromCustomersRoutes from './dgPoFromCustomers';
import dgProformasRoutes from './dgProformas';
import deliveryChallanRoutes from './deliveryChallans';

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
      paymentLinks: '/payment-links',
      inventory: '/inventory',
      purchaseOrderPayments: '/purchase-order-payments',
      quotationPayments: '/quotation-payments',
      invoicePayments: '/invoice-payments',
      dgInvoicePayments: '/dg-invoice-payments',
      dgQuotationPayments: '/dg-quotation-payments',
      poFromCustomers: '/po-from-customers',
      dgPoFromCustomers: '/dg-po-from-customers',
      dgProformas: '/dg-proformas',
      dgInvoices: '/dg-invoices',
      deliveryChallans: '/delivery-challans',
    }
  });
});

// Route middlewares
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/dg-products', dgProductRoutes);
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
router.use('/quotations', quotationsRouter);
router.use('/inventory', inventoryRoutes);
router.use('/digital-service-reports', digitalServiceReportRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/dg-enquiries', dgEnquiriesRoutes);
router.use('/dg-purchase-orders', dgPurchaseOrdersRoutes);
router.use('/proforma-invoices', proformaInvoicesRoutes);
router.use('/dg-invoices', dgInvoicesRoutes);
router.use('/dg-payments', dgPaymentsRoutes);
router.use('/oems', oemsRoutes);
router.use('/oem-orders', oemOrdersRoutes);
router.use('/dg-reports', dgReportsRoutes);
router.use('/dg-quotations', dgQuotationsRoutes);
router.use('/purchase-order-payments', purchaseOrderPaymentRoutes);
router.use('/quotation-payments', quotationPaymentRoutes);
router.use('/invoice-payments', invoicePaymentRoutes);
router.use('/dg-invoice-payments', dgInvoicePaymentRoutes);
router.use('/dg-quotation-payments', dgQuotationPaymentRoutes);
router.use('/qr-code', qrCodeRoutes);
router.use('/po-files', poFilesRoutes);
router.use('/po-from-customers', poFromCustomersRoutes);
router.use('/dg-po-from-customers', dgPoFromCustomersRoutes);
router.use('/dg-proformas', dgProformasRoutes);
router.use('/delivery-challans', deliveryChallanRoutes);

export default router;