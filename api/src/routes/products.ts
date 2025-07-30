import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createProductSchema, 
  updateProductSchema, 
  productQuerySchema 
} from '../schemas';
import { UserRole } from '../types';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  getProductCategories,
  searchProducts,
  getProductsWithInventory
} from '../controllers/productController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for inventory management
router.use(checkModuleAccess('inventory_management'));

// Special routes (must come before parameterized routes)
router.get('/categories', checkPermission('read'), getProductCategories);
router.get('/search', checkPermission('read'), searchProducts);
router.get('/with-inventory', checkPermission('read'), getProductsWithInventory);

// Product routes
router.route('/')
  .get(validate(productQuerySchema, 'query'), checkPermission('read'), getProducts)
  .post(validate(createProductSchema), checkPermission('write'), createProduct);

router.route('/:id')
  .get(checkPermission('read'), getProduct)
  .put(validate(updateProductSchema), checkPermission('write'), updateProduct)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteProduct);

// Product status toggle
router.put('/:id/activate', 
  checkPermission('write'), 
  toggleProductStatus
);

export default router; 