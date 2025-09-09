import express from 'express';
import {
  getDGProformas,
  getDGProformaById,
  createDGProforma,
  updateDGProforma,
  deleteDGProforma,
  exportDGProformas
} from '../controllers/dgProformaController';
import { protect, checkPermission } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/v1/dg-proformas
// @desc    Get all DG Proformas
// @access  Private
router.get('/', checkPermission('read'), getDGProformas);

// @route   GET /api/v1/dg-proformas/export
// @desc    Export DG Proformas to Excel
// @access  Private
router.get('/export', checkPermission('read'), exportDGProformas);

// @route   GET /api/v1/dg-proformas/:id
// @desc    Get DG Proforma by ID
// @access  Private
router.get('/:id', checkPermission('read'), getDGProformaById);

// @route   POST /api/v1/dg-proformas
// @desc    Create new DG Proforma
// @access  Private
router.post('/', checkPermission('write'), createDGProforma);

// @route   PUT /api/v1/dg-proformas/:id
// @desc    Update DG Proforma
// @access  Private
router.put('/:id', checkPermission('write'), updateDGProforma);

// @route   DELETE /api/v1/dg-proformas/:id
// @desc    Delete DG Proforma
// @access  Private
router.delete('/:id', checkPermission('delete'), deleteDGProforma);

export default router;
