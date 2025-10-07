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
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Serve file (public access for viewing) - must come first
router.get('/:filename', serveFile);

// Serve PDF file (public access for viewing) - must come before other routes
router.get('/pdf/:filename', (req, res): void => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../assets/uploadPdfs', filename);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.status(404).json({
      success: false,
      message: 'PDF file not found'
    });
    return;
  }
  
  // Set appropriate headers for PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  
  // Stream the file
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
});



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