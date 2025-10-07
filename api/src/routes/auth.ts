import { Router } from 'express';
import {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout,
  resetPassword,
  forgotPassword
} from '../controllers/authController';
import { protect, restrictTo } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/me', getMe);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
// Admin only routes
router.post('/register', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), register);

export default router; 