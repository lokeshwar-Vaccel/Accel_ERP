import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import multer from 'multer';
import { previewDGEnquiryImport, importDGEnquiries, getDGEnquiries } from '../controllers/dgEnquiryImportController';
import { 
  createDGEnquiry, 
  getDGEnquiryById, 
  updateDGEnquiry, 
  deleteDGEnquiry, 
  getAllDGEnquiries,
  getDGEnquiryStats 
} from '../controllers/dgEnquiryController';
import { UserRole } from '../types';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel and CSV files
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain', // Some systems send CSV as text/plain
      'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm files
    ];
    
    const isValidExtension = file.originalname && 
      /\.(xlsx|xls|csv)$/i.test(file.originalname);
    
    if (allowedMimeTypes.includes(file.mimetype) || isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed'));
    }
  }
});

// All routes are protected
router.use(protect);

// Preview import route for Excel/CSV upload
router.post('/preview-import',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  upload.single('file'),
  previewDGEnquiryImport
);

// Import route for Excel/CSV upload
router.post('/import',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  upload.single('file'),
  importDGEnquiries
);

// List DG Enquiries (paginated, filtered) - Updated to use new controller
router.get('/', getAllDGEnquiries);

// Get DG Enquiry statistics
router.get('/stats', getDGEnquiryStats);

// Create new DG Enquiry
router.post('/',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGEnquiry
);

// Get DG Enquiry by ID
router.get('/:id', getDGEnquiryById);

// Update DG Enquiry
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDGEnquiry
);

// Delete DG Enquiry
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteDGEnquiry
);

export default router; 