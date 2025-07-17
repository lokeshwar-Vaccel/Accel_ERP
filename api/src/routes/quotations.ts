import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import {
  generateQuotation,
  getQuotationPreview,
  downloadQuotationPDF,
  getQuotationById,
  getQuotations,
  createQuotation,
  createQuotationFromImage,
  updateQuotation,
  deleteQuotation
} from '../controllers/quotationController';

const router = Router();

router.use(protect);
router.use(checkModuleAccess('billing'));

router.post('/generate/:invoiceId', checkPermission('read'), generateQuotation);
router.get('/preview/:invoiceId', checkPermission('read'), getQuotationPreview);
router.get('/download/:invoiceId', checkPermission('read'), downloadQuotationPDF);

// CRUD routes for Quotation
router.get('/', checkPermission('read'), getQuotations);
router.get('/:id', checkPermission('read'), getQuotationById);
router.post('/', checkPermission('write'), createQuotation);
router.post('/from-image', checkPermission('write'), createQuotationFromImage);
router.put('/:id', checkPermission('write'), updateQuotation);
router.delete('/:id', checkPermission('delete'), deleteQuotation);

export default router; 