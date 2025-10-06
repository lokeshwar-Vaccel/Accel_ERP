import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { RootState } from '../../store';
import { hasRouteAccess, getRoutePermission, hasSufficientPermission, ROUTE_MODULE_MAPPING } from '../../utils/moduleAccess';
import AccessDenied from '../../pages/AccessDenied';

interface ModuleProtectedRouteProps {
  children: React.ReactElement;
  requiredPermission?: 'read' | 'write' | 'admin';
}

const ModuleProtectedRoute: React.FC<ModuleProtectedRouteProps> = ({ 
  children, 
  requiredPermission = 'read' 
}) => {
  const { isAuthenticated, user, isLoading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // If still loading authentication, show loading or stay on current page
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // If not authenticated, redirect to login (this should be handled by the parent ProtectedRoute)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If no user data, deny access
  if (!user) {
    return <AccessDenied />;
  }

  // Check route access using module access
  const hasAccess = hasRouteAccess(user, location.pathname);
  
  if (!hasAccess) {
    console.warn(`Access denied for user ${user.email} to route ${location.pathname}`);
    return <AccessDenied />;
  }

  // Admin/Super admin bypass - admins and super admins have all permissions
  if (user.role === 'super_admin' || user.role === 'admin') {
    console.log(`${user.role} bypass - granting ${requiredPermission} permission to route: ${location.pathname}`);
    return children;
  }

  // Check permission level if specified
  if (requiredPermission !== 'read') {
    // Find which module this route belongs to
    let currentRouteModule: string | null = null;
    for (const route in ROUTE_MODULE_MAPPING) {
      if (location.pathname.startsWith(route)) {
        currentRouteModule = ROUTE_MODULE_MAPPING[route];
        break;
      }
    }
    
    if (currentRouteModule) {
      const currentModule = user.moduleAccess?.find(mod => mod.module === currentRouteModule);
      if (!currentModule || !hasSufficientPermission(currentModule.permission, requiredPermission)) {
        console.warn(`Insufficient permission for user ${user.email} on route ${location.pathname}. Required: ${requiredPermission}, Has: ${currentModule?.permission || 'none'}`);
        return <AccessDenied />;
      }
    }
  }

  return children;
};

export default ModuleProtectedRoute;
