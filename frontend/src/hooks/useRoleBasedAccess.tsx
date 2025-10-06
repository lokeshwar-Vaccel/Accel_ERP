import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { hasRouteAccess, hasSufficientPermission } from '../utils/moduleAccess';

// Hook to check module access from components
export const useRoleBasedAccess = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // Helper function to check if user is admin or super admin
  const isAdminOrSuperAdmin = (): boolean => {
    return user?.role === 'super_admin' || user?.role === 'admin';
  };

  const hasModuleAccess = (moduleName: string): boolean => {
    // Admin and Super admin have access to all modules
    if (isAdminOrSuperAdmin()) return true;
    
    if (!user?.moduleAccess) return false;
    const module = user.moduleAccess.find(mod => mod.module === moduleName);
    return module ? module.access : false;
  };

  const getModulePermission = (moduleName: string): 'read' | 'write' | 'admin' | null => {
    // Admin and Super admin have admin permission for all modules
    if (isAdminOrSuperAdmin()) return 'admin';
    
    if (!user?.moduleAccess) return null;
    const module = user.moduleAccess.find(mod => mod.module === moduleName);
    return module ? module.permission : null;
  };

  const hasPermission = (moduleName: string, requiredPermission: 'read' | 'write' | 'admin'): boolean => {
    // Admin and Super admin have all permissions
    if (isAdminOrSuperAdmin()) return true;
    
    const userPermission = getModulePermission(moduleName);
    if (!userPermission) return false;
    
    return hasModuleAccess(moduleName) && hasSufficientPermission(userPermission, requiredPermission);
  };

  const canAccess = (moduleName: string): boolean => {
    return isAdminOrSuperAdmin() || hasModuleAccess(moduleName);
  };

  const canWrite = (moduleName: string): boolean => {
    return isAdminOrSuperAdmin() || hasPermission(moduleName, 'write');
  };

  const canAdmin = (moduleName: string): boolean => {
    return isAdminOrSuperAdmin() || hasPermission(moduleName, 'admin');
  };

  return {
    user,
    isAdminOrSuperAdmin,
    hasModuleAccess,
    getModulePermission,
    hasPermission,
    canAccess,
    canWrite,
    canAdmin,
  };
};

export default useRoleBasedAccess;
