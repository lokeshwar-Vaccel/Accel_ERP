import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  resetPassword,
  getUserStats,
  getFieldOperators
} from '../controllers/userController';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for user management
router.use(checkModuleAccess('user_management'));

// User statistics (Admin only)
router.get('/stats', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), 
  getUserStats  
);

// Get field operators for dropdown
router.get('/field-operators', 
  checkPermission('read'), 
  getFieldOperators
);

// CRUD operations
router.route('/')
  .get(checkPermission('read'), getUsers)
  .post(
    restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), 
    checkPermission('write'), 
    createUser
  );

router.route('/:id')
  .get(checkPermission('read'), getUser)
  .put(
    restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.HR), 
    checkPermission('write'), 
    updateUser
  )
  .delete(
    restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), 
    checkPermission('delete'), 
    deleteUser
  );

// Password reset (Admin only)
router.put('/:id/reset-password', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  resetPassword
);

// Restore deleted user (Admin only)
router.put('/:id/restore', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  restoreUser
);

export default router; 