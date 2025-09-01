import express from 'express';
import { 
  uploadFile, 
  uploadMultipleFiles, 
  uploadPdfFile,
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

// Serve PDF file (public access for viewing)
router.get('/pdf/:filename', (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../assets/uploadPdfs', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'PDF file not found' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Stream the PDF file
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    // Handle stream errors
    stream.on('error', (error) => {
      return next(error);
    });
    
    return;
  } catch (error) {
    return next(error);
  }
});

// All other routes require authentication
router.use(protect);

// Upload single file
router.post('/upload', 
  checkModuleAccess('service_management'),
  uploadFile
);

// Upload PDF file
router.post('/upload-pdf', 
  checkModuleAccess('service_management'),
  uploadPdfFile
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