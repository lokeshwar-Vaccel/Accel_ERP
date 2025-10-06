import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Navigate } from 'react-router-dom';
import ModuleProtectedRoute from '../components/auth/ModuleProtectedRoute';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredPermission?: 'read' | 'write' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Use ModuleProtectedRoute for additional security
  return (
    <ModuleProtectedRoute requiredPermission={requiredPermission}>
      {children}
    </ModuleProtectedRoute>
  );
};

export default ProtectedRoute; 