import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Sun, CheckCircle, Clock } from 'lucide-react';
// import { Button } from '../ui/';
// import { RootState, AppDispatch } from '../../store';
import { forgotPassword, clearError, clearPasswordResetState } from 'redux/auth/authSlice';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from 'components/ui/Botton';
import { AppDispatch, RootState } from 'redux/store';

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
});

export const ForgotPasswordForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { passwordResetState } = useSelector((state: RootState) => state.auth);
  
  const [email, setEmail] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  useEffect(() => {
    if (passwordResetState.error) {
      toast.error(passwordResetState.error);
    }
  }, [passwordResetState.error]);

  // Handle countdown for resend functionality
  useEffect(() => {
    if (passwordResetState.emailSent && passwordResetState.lastEmailSent) {
      const elapsed = Date.now() - passwordResetState.lastEmailSent;
      const remaining = Math.max(0, 60000 - elapsed); // 60 seconds
      
      if (remaining > 0) {
        setCanResend(false);
        setCountdown(Math.ceil(remaining / 1000));
        
        const timer = setInterval(() => {
          const newElapsed = Date.now() - passwordResetState.lastEmailSent;
          const newRemaining = Math.max(0, 60000 - newElapsed);
          
          if (newRemaining === 0) {
            setCanResend(true);
            setCountdown(0);
            clearInterval(timer);
          } else {
            setCountdown(Math.ceil(newRemaining / 1000));
          }
        }, 1000);
        
        return () => clearInterval(timer);
      }
    }
  }, [passwordResetState.emailSent, passwordResetState.lastEmailSent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const res:any = await dispatch(forgotPassword({ email }));
    
    toast.success(res?.payload.message )
  };

  const handleResend = async () => {
    if (!canResend || !email) return;
    const response = await dispatch(forgotPassword({ email }));
      toast.success(response?.payload.message )
  };

  const validateForm = () => {
    try {
      forgotPasswordSchema.parse({ email });
      return true;
    } catch (err: any) {
      err.errors.forEach((error: any) => {
        toast.error(error.message);
      });
      return false;
    }
  };

  const handleInputChange = () => {
    if (passwordResetState.error) {
      dispatch(clearError());
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearPasswordResetState());
    navigate('/login');
  };

  if (passwordResetState.emailSent) {
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
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Check your email</h2>
            <p className="text-sm text-gray-600 mb-4">
              We've sent a password reset link to
            </p>
            <p className="text-sm font-medium text-gray-800 bg-gray-50 rounded-lg p-2 mb-4">
              {email}
            </p>
            <p className="text-xs text-gray-500">
              Didn't receive the email? Check your spam folder or request a new one.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleResend}
              disabled={!canResend || passwordResetState.isLoading}
              className="w-full"
              variant="outline"
            >
              {countdown > 0 ? (
                <>
                  <Clock size={16} />
                  Resend in {countdown}s
                </>
              ) : (
                'Resend Email'
              )}
            </Button>
            
            <Button
              onClick={handleBackToLogin}
              className="w-full"
              variant="secondary"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Button>
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
          <h2 className="text-xl font-semibold text-gray-800 text-center mb-2">Reset your password</h2>
          <p className="text-sm text-gray-600 text-center">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Forgot Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleInputChange();
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            isLoading={passwordResetState.isLoading}
            disabled={!email || passwordResetState.isLoading}
          >
            {passwordResetState.isLoading ? 'Sending Reset Link...' : 'Send Reset Link'}
          </Button>

          {/* Back to Login */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-sm text-blue-600 hover:underline hover:text-blue-800 transition flex items-center justify-center gap-1"
            >
              <ArrowLeft size={14} />
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};