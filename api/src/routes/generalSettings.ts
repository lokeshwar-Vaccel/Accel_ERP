import express from 'express';
import {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from '../controllers/generalSetting';
import { protect, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { companySchema } from '../schemas';

const router = express.Router();

// Create a new company
router.post(
  '/',
  protect,
  // validate(companySchema),
  checkPermission('write'),
  createCompany
);

// Get all companies (paginated)
router.get(
  '/',
  protect,
  checkPermission('read'),
  getCompanies
);

// Get single company by ID
router.get(
  '/:id',
  protect,
  checkPermission('read'),
  getCompanyById
);

// Update company by ID
router.put(
  '/:id',
  protect,
  // validate(companySchema),
  checkPermission('write'),
  updateCompany
);

// Delete company by ID
router.delete(
  '/:id',
  protect,
  checkPermission('delete'),
  deleteCompany
);

export default router;
