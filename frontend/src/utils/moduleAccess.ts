// Module access utility functions

export interface ModuleAccess {
  module: string;
  access: boolean;
  permission: 'read' | 'write' | 'admin';
}

export interface User {
  role: string;
  moduleAccess: ModuleAccess[];
}

// Mapping of routes to their required modules
export const ROUTE_MODULE_MAPPING: Record<string, string> = {
  // Dashboard
  '/dashboard': 'dashboard',
  
  // User Management
  '/user-management': 'user_management',
  
  // CRM/Lead Management
  '/lead-management': 'lead_management',
  
  // Product Management
  '/product-management': 'product_management',
  
  // Inventory Management
  '/inventory-management': 'inventory_management',
  
  // Service Management
  '/service-management': 'service_management',
  
  // AMC Management
  '/amc-management': 'amc_management',
  '/amc-quotations': 'amc_management',
  '/amc-quotations/create': 'amc_management',
  '/amc-quotations/edit': 'amc_management',
  '/amc-quotations/:id/print': 'amc_management',
  
  // Purchase Orders
  '/purchase-order-management': 'purchase_orders',
  '/purchase-order-management/create': 'purchase_orders',
  '/purchase-order-management/edit': 'purchase_orders',
  '/dg-purchase-order-management': 'purchase_orders',
  
  // Billing
  '/billing': 'billing',
  '/billing/create': 'billing',
  '/billing/edit': 'billing',
  '/billing/quotation': 'billing',
  '/billing/quotation/create': 'billing',
  '/billing/quotation/edit': 'billing',
  '/billing/challan/create': 'billing',
  '/billing/challan/edit': 'billing',
  
  // DG Sales
  '/dg-sales': 'dg_sales',
  '/dg-quotation-management': 'dg_sales',
  '/dg-quotation/create': 'dg_sales',
  '/dg-quotation/edit': 'dg_sales',
  '/dg-sales/invoice/create': 'dg_sales',
  '/dg-sales/invoice/edit': 'dg_sales',
  '/dg-proforma/create': 'dg_sales',
  '/dg-proforma/edit': 'dg_sales',
  '/dg-proforma': 'dg_sales',
  '/po-from-customer-management': 'dg_sales',
  '/po-from-customer/create': 'dg_sales',
  '/po-from-customer/edit': 'dg_sales',
  
  // Reports & Analytics
  '/reports-management': 'reports_analytics',
  
  // File Management
  '/file-management': 'file_management',
  
  // Communications
  '/communication-management': 'communications',
  
  // Admin Settings
  '/admin-settings': 'admin_settings',
  
  // OEM Order Management
  '/oem-order-management': 'purchase_orders',
};

// Function to check if a user has access to a specific route
export const hasRouteAccess = (user: User, pathname: string): boolean => {
  // Admin/Super admin bypass - admins and super admins have access to everything
  if (user.role === 'super_admin' || user.role === 'admin') {
    console.log(`${user.role} access granted to route: ${pathname}`);
    return true;
  }

  if (!user?.moduleAccess || !Array.isArray(user.moduleAccess)) {
    console.warn('User module access is not defined or not an array');
    return false;
  }
  
  // Try exact match first
  let requiredModule = ROUTE_MODULE_MAPPING[pathname];
  
  // If no exact match, try pattern matching for dynamic routes
  if (!requiredModule) {
    // Handle dynamic routes like /billing/edit/:id
    for (const route in ROUTE_MODULE_MAPPING) {
      if (route.includes(':') || route.includes('*')) {
        // Convert route pattern to regex
        const routePattern = route
          .replace(/\/:\w+/g, '/[^/]+') // Replace :id with [^/]+
          .replace(/\*/g, '.*'); // Replace * with .*
        
        const regex = new RegExp(`^${routePattern}$`);
        if (regex.test(pathname)) {
          requiredModule = ROUTE_MODULE_MAPPING[route];
          break;
        }
      } else if (pathname.startsWith(route)) {
        // Handle nested routes
        requiredModule = ROUTE_MODULE_MAPPING[route];
        break;
      }
    }
  }
  
  // If still no module found, default to deny access
  if (!requiredModule) {
    console.warn(`No module mapping found for route: ${pathname}`);
    return false;
  }
  
  // Check if user has access to the required module
  const moduleEntry = user.moduleAccess.find(mod => mod.module === requiredModule);
  if (!moduleEntry) {
    console.warn(`User does not have ${requiredModule} in module access`);
    return false;
  }
  
  return moduleEntry.access === true;
};

// Function to get the required permission level for a route
export const getRoutePermission = (pathname: string): 'read' | 'write' | 'admin' => {
  // Define which routes require write/admin permissions
  const writeRoutes = [
    '/user-management',
    '/admin-settings',
  ];
  
  const adminRoutes = [
    '/admin-settings',
  ];
  
  // Check if route requires admin permission
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    return 'admin';
  }
  
  // Check if route requires write permission
  if (writeRoutes.some(route => pathname.startsWith(route))) {
    return 'write';
  }
  
  // Default to read permission
  return 'read';
};

// Function to check if user has sufficient permission level
export const hasSufficientPermission = (
  userModulePermission: 'read' | 'write' | 'admin',
  requiredPermission: 'read' | 'write' | 'admin'
): boolean => {
  const permissionLevels = { read: 1, write: 2, admin: 3 };
  return permissionLevels[userModulePermission] >= permissionLevels[requiredPermission];
};