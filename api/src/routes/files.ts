import express from 'express';
import { 
  uploadFile, 
  uploadMultipleFiles, 
  uploadDigitalReportFiles,
  serveFile, 
  deleteFileController, 
  getFileInfo 
} from '../controllers/fileController';
import { protect, checkModuleAccess } from '../middleware/auth';

const router = express.Router();

// Serve file (public access for viewing) - must come first
router.get('/:filename', serveFile);

// All other routes require authentication
router.use(protect);

// Upload single file
router.post('/upload', 
  checkModuleAccess('service_management'),
  uploadFile
);

// Upload multiple files
router.post('/upload-multiple', 
  checkModuleAccess('service_management'),
  uploadMultipleFiles
);

// Upload files for digital service report
router.post('/upload-digital-report', 
  checkModuleAccess('service_management'),
  uploadDigitalReportFiles
);

// Get file info
router.get('/info/:filename', 
  checkModuleAccess('service_management'),
  getFileInfo
);

// Delete file
router.delete('/:filename', 
  checkModuleAccess('service_management'),
  deleteFileController
);

export default router; 