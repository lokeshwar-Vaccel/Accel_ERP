import express from 'express';
import { protect } from '../middleware/auth';
import {
  uploadQrCodeImage,
  deleteQrCodeImage,
  getQrCodeImageInfo
} from '../controllers/qrCodeController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Upload QR code image
router.post('/upload', uploadQrCodeImage);

// Get QR code image info
router.get('/:filename', getQrCodeImageInfo);

// Delete QR code image
router.delete('/:filename', deleteQrCodeImage);

export default router; 