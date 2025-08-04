import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import {
  createDGQuotation,
  getDGQuotationById,
  getAllDGQuotations,
  updateDGQuotation,
  deleteDGQuotation,
  getDGQuotationStats,
  generateQuotationNumber,
  getQuotationsByEnquiry
} from '../controllers/dgQuotationController';

const router = Router();

// Apply authentication and module access middleware
router.use(protect);
router.use(checkModuleAccess('dg_sales'));

// Generate quotation number
router.get('/generate-number', checkPermission('read'), generateQuotationNumber);

// Get statistics
router.get('/stats', checkPermission('read'), getDGQuotationStats);

// Get quotations by enquiry
router.get('/by-enquiry/:enquiryId', checkPermission('read'), getQuotationsByEnquiry);

// CRUD routes
router.get('/', checkPermission('read'), getAllDGQuotations);
router.get('/:id', checkPermission('read'), getDGQuotationById);
router.post('/', checkPermission('write'), createDGQuotation);
router.put('/:id', checkPermission('write'), updateDGQuotation);
router.delete('/:id', checkPermission('delete'), deleteDGQuotation);

export default router; 