import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AppRoutes from 'routes/AppRoutes';
import Layout from 'layout/Layout';
import { RootState, AppDispatch } from './store';
import { LoadingSpinner } from 'components/ui/LoadingSpinner';
import { LoginForm } from 'components/features/auth/LoginForm';
import { checkAuthStatus } from './redux/auth/authSlice';
import { Toaster } from 'react-hot-toast';
import { ForgotPasswordForm } from 'components/features/auth/ForgotPasswordForm';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ResetPasswordForm } from 'components/features/auth/ResetPasswordForm';

const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading, user } = useSelector((state: RootState) => state.auth);

  console.log("user:", user);
  console.log("user.moduleAccess:", user?.moduleAccess);

  // Check authentication status on app startup
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch]);

  // Fallback moduleAccess if user doesn't have it defined
  const moduleAccess = user?.moduleAccess || [];

  // Removed full-screen loading overlay to prevent UI blocking

  return (
    <>
      {isAuthenticated ? (
        <Layout moduleAccess={moduleAccess}>
          <AppRoutes />
        </Layout>
      ) : (
        <>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            <Route path="/reset-password" element={<ResetPasswordForm />} />
            <Route
              path="/forgot-password"
              element={
                <Navigate to="/login" replace />
              }
            />
          </Routes>
        </>
      )}
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
