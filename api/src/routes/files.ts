import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  upload,
  uploadSingleFile,
  uploadMultipleFiles,
  downloadFile,
  getFileMetadata,
  listFiles,
  deleteFile,
  uploadSignature,
  getFileStats
} from '../controllers/fileController';

const router = Router();

// All routes are protected
router.use(protect);

// File upload routes
router.post('/upload', upload.single('file'), uploadSingleFile);
router.post('/upload-multiple', upload.array('files', 5), uploadMultipleFiles);

// Signature upload (special handling for base64 data)
router.post('/signature', uploadSignature);

// File download route (public access for public files)
router.get('/:fileId/download', downloadFile);

// File metadata and management
router.get('/:fileId', getFileMetadata);
router.delete('/:fileId', deleteFile);

// File listing and statistics
router.get('/', listFiles);
router.get('/stats/overview', getFileStats);

export default router; 