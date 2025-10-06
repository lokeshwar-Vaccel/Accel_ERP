import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Sun, CheckCircle, AlertCircle } from 'lucide-react';
import { resetPassword, clearError, resetPasswordConfirmState } from 'redux/auth/authSlice';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from 'components/ui/Botton';
import { AppDispatch, RootState } from '../../../store';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(16, { message: 'Password must not exceed 16 characters' })
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, { 
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one special character' 
    })
    .regex(/^\S*$/, { message: 'Password cannot contain spaces' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const ResetPasswordForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { passwordResetConfirm } = useSelector((state: RootState) => state.auth);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get token from URL parameters
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      toast.error('Invalid reset link. Please request a new password reset.');
      navigate('/forgot-password');
      return;
    }
    setToken(tokenParam);
  }, [searchParams, navigate]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (passwordResetConfirm.error) {
      toast.error(passwordResetConfirm.error);
    }
  }, [passwordResetConfirm.error]);

  useEffect(() => {
    if (passwordResetConfirm.isSuccess) {
      toast.success('Password reset successfully! Please log in with your new password.');
      setTimeout(() => {
        dispatch(resetPasswordConfirmState());
        navigate('/login');
      }, 2000);
    }
  }, [passwordResetConfirm.isSuccess, dispatch, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Invalid reset token');
      return;
    }
    
    if (!validateForm()) return;
    
    dispatch(resetPassword({ token, newPassword : password }));
  };

  const validateForm = () => {
    try {
      resetPasswordSchema.parse({ password, confirmPassword });
      return true;
    } catch (err: any) {
      err.errors.forEach((error: any) => {
        toast.error(error.message);
      });
      return false;
    }
  };

  const handleInputChange = () => {
    if (passwordResetConfirm.error) {
      dispatch(clearError());
    }
  };

  if (passwordResetConfirm.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 transition-all">
          {/* Branding */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sun Power Services</h1>
            <p className="text-sm text-gray-500 mt-1">Enterprise Resource Planning</p>
          </div>

          {/* Success State */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Password Reset Successfully!</h2>
            <p className="text-sm text-gray-600 mb-4">
              Your password has been updated. You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-gray-100 transition-all">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sun Power Services</h1>
          <p className="text-sm text-gray-500 mt-1">Enterprise Resource Planning</p>
        </div>

        {/* Form Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">Set New Password</h2>
          <p className="text-sm text-gray-600 text-center">
            Please choose a strong password for your account.
          </p>
        </div>

        {/* Reset Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  handleInputChange();
                }}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Enter new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  handleInputChange();
                }}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            isLoading={passwordResetConfirm.isLoading}
            disabled={!password || !confirmPassword || passwordResetConfirm.isLoading}
          >
            {passwordResetConfirm.isLoading ? 'Updating Password...' : 'Update Password'}
          </Button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};