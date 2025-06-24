import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import AppRoutes from 'routes/AppRoutes';
import Layout from 'layout/Layout';
import { RootState, AppDispatch } from './store';
import { LoadingSpinner } from 'components/ui/LoadingSpinner';
import { LoginForm } from 'components/features/auth/LoginForm';
import { checkAuthStatus } from './redux/auth/authSlice';

const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  // Check authentication status on app startup
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      dispatch(checkAuthStatus());
    }
  }, [dispatch]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full transition-colors duration-300">
      {isAuthenticated ? (
        <Layout>
          <AppRoutes />
        </Layout>
      ) : (
        <LoginForm />
      )}
    </div>
  );
};

export default App;
