import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AppRoutes from 'routes/AppRoutes';
import Layout from 'layout/Layout';
import { RootState, AppDispatch } from './store';
import { LoadingSpinner } from 'components/ui/LoadingSpinner';
import { LoginForm } from 'components/features/auth/LoginForm';
import { checkAuthStatus, forceLogout } from './redux/auth/authSlice';
import { Toaster } from 'react-hot-toast';
import { ForgotPasswordForm } from 'components/features/auth/ForgotPasswordForm';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ResetPasswordForm } from 'components/features/auth/ResetPasswordForm';
import PaymentPage from 'pages/PaymentPage';
import PaymentSuccess from 'pages/PaymentSuccess';
import CustomerFeedback from 'pages/CustomerFeedback';

const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  // Check authentication status on app startup
  useEffect(() => {
    // Check both localStorage and sessionStorage for token
    const persistentToken = localStorage.getItem('authToken');
    const sessionToken = sessionStorage.getItem('authToken');
    const token = persistentToken || sessionToken;
    
    if (token) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch]);

  // Separate effect to handle stuck loading state
  useEffect(() => {
    // If we're loading but there's no token, stop loading
    if (isLoading && !localStorage.getItem('authToken') && !sessionStorage.getItem('authToken')) {
      dispatch(forceLogout());
    }
  }, [dispatch, isLoading]);

  // Fallback moduleAccess if user doesn't have it defined
  const moduleAccess = user?.moduleAccess || [];

  // Removed full-screen loading overlay to prevent UI blocking

  return (
    <>
      <Routes>
        {/* Public routes that don't require authentication */}
        <Route path="/pay/:token" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/feedback/:token" element={<CustomerFeedback />} />
        
        {/* Authentication routes */}
        <Route path="/login" element={<LoginForm />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password" element={<ResetPasswordForm />} />
        
        {/* Protected routes - require authentication */}
        {isLoading ? (
          // Show loading while checking authentication
          <Route path="/*" element={
            <div className="flex items-center justify-center min-h-screen">
              <LoadingSpinner />
            </div>
          } />
        ) : isAuthenticated ? (
          <Route path="/*" element={
            <Layout moduleAccess={moduleAccess}>
              <AppRoutes />
            </Layout>
          } />
        ) : (
          <Route path="/*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
            zIndex: 9999,
            position: 'relative',
            minWidth: '300px',
            padding: '16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#ef4444',
            },
          },
        }}
      />    </>
  );
};

export default App;
