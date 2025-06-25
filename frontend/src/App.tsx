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

  // Removed full-screen loading overlay to prevent UI blocking

  return (
    <>
      {isAuthenticated ? (
        <Layout>
          <AppRoutes />
        </Layout>
      ) : (
        <LoginForm />
      )}
    </>
  );
};

export default App;
