import React from 'react';
import { useSelector } from 'react-redux';
import Login from './components/Login';
import AppRoutes from 'routes/AppRoutes';
import Layout from 'layout/Layout';
import { RootState } from './store';
import { LoadingSpinner } from 'components/ui/LoadingSpinner';
import { LoginForm } from 'components/features/auth/LoginForm';


const App = () => {
const { isAuthenticated, isLoading } = useSelector((state: any) => state.auth);

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

  if (isAuthenticated) {
    return <Login />;
  }

  return (
      <div className="min-h-screen w-full transition-colors duration-300">
          <Layout>
            <AppRoutes />
          </Layout>
      </div>
  );
};

export default App;
