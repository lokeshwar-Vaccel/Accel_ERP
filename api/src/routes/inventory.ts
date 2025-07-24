import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import multer from 'multer';
import {
  previewInventoryImport,
  importInventory,
  downloadInventoryTemplate,
  exportInventoryExcel
} from '../controllers/inventoryImportController';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel and CSV files
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// Apply authentication and authorization to all routes
router.use(protect);
router.use(checkModuleAccess('inventory'));

// @route   GET /api/v1/inventory/import-template
// @desc    Download inventory import template
// @access  Private (Admin, Manager)
router.get('/import-template',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  downloadInventoryTemplate
);

// @route   GET /api/v1/inventory/export-excel
// @desc    Export inventory as Excel in import format
// @access  Private (Admin, Manager)
router.get('/export-excel',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  exportInventoryExcel
);

// @route   POST /api/v1/inventory/preview-import
// @desc    Preview inventory import before processing
// @access  Private (Admin, Manager)
router.post('/preview-import',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  upload.single('file'),
  previewInventoryImport
);

// @route   POST /api/v1/inventory/import
// @desc    Import inventory from Excel/CSV
// @access  Private (Admin, Manager)
router.post('/import',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  upload.single('file'),
  importInventory
);

export default router; 