import express from 'express';
import { protect, checkPermission } from '../middleware/auth';
import {
  uploadPOFile,
  deletePOFile,
  getPOFileInfo
} from '../controllers/poFileController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Upload PO file (PDF or image)
router.post('/upload', checkPermission('write'), uploadPOFile);

// Get PO file info
router.get('/:filename', checkPermission('read'), getPOFileInfo);

// Delete PO file
router.delete('/:filename', checkPermission('write'), deletePOFile);

export default router;
