import express from 'express';
import {
  getDGProducts,
  getDGProductById,
  createDGProduct,
  updateDGProduct,
  deleteDGProduct,
  getDGProductCategories,
  getDGProductStats,
  importDGProducts,
  previewDGProducts
} from '../controllers/dgProductController';
import { protect } from '../middleware/auth';
import { uploadExcelSingle } from '../middleware/upload';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// DG Product routes
router.route('/')
  .get(getDGProducts)
  .post(createDGProduct);

router.route('/import')
  .post(uploadExcelSingle, importDGProducts);

router.route('/preview')
  .post(uploadExcelSingle, previewDGProducts);

router.route('/categories')
  .get(getDGProductCategories);

router.route('/stats')
  .get(getDGProductStats);

router.route('/:id')
  .get(getDGProductById)
  .put(updateDGProduct)
  .delete(deleteDGProduct);

export default router; 