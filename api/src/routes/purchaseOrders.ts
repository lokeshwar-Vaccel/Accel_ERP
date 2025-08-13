import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  purchaseOrderQuerySchema,
  receivePOSchema,
  approvePOSchema,
  cancelPOSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  sendPurchaseOrder,
  receiveItems,
  cancelPurchaseOrder,
  getPurchaseOrderStats,
  checkGstInvoiceNumber
} from '../controllers/purchaseOrderController';
import { importPurchaseOrders, previewPurchaseOrderImport } from '../controllers/purchaseOrderImportController';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel and CSV files
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

// All routes are protected
router.use(protect);

// Check module access for inventory management
router.use(checkModuleAccess('inventory_management'));

// Placeholder functions
const deletePurchaseOrder = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Delete purchase order endpoint',
    data: { id: req.params.id }
  });
};

const getPendingApprovals = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get pending approvals endpoint',
    data: []
  });
};

// Purchase Order routes
router.route('/')
  .get(validate(purchaseOrderQuerySchema, 'query'), checkPermission('read'), getPurchaseOrders)
  .post(validate(createPurchaseOrderSchema), checkPermission('write'), createPurchaseOrder);

// Preview import route for Excel/CSV upload - shows what will be imported without saving
router.post('/preview-import', 
  upload.single('file'), 
  checkPermission('write'), 
  previewPurchaseOrderImport
);

// Import route for Excel/CSV upload
router.post('/import', 
  upload.single('file'), 
  checkPermission('write'), 
  importPurchaseOrders
);

router.route('/:id')
  .get(checkPermission('read'), getPurchaseOrder)
  .put(validate(updatePurchaseOrderSchema), checkPermission('write'), updatePurchaseOrder)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deletePurchaseOrder);

// Purchase order actions
router.put('/:id/status', checkPermission('write'), updatePurchaseOrderStatus);

router.post('/:id/send', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER), 
  checkPermission('write'), 
  sendPurchaseOrder
);

router.post('/:id/receive', checkPermission('write'), receiveItems); // validate(receivePOSchema) 
router.post('/:id/cancel', validate(cancelPOSchema), checkPermission('write'), cancelPurchaseOrder);

// Special queries
router.get('/pending/approvals', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER), 
  checkPermission('read'), 
  getPendingApprovals
);

// Check GST Invoice Number for duplicates
router.get('/check-gst-invoice/:gstInvoiceNumber', checkPermission('read'), checkGstInvoiceNumber);

router.get('/stats/overview', checkPermission('read'), getPurchaseOrderStats);

export default router; 