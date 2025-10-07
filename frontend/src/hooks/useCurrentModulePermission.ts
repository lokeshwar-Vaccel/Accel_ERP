import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

function getActiveKeyFromPath(pathname: string): string {
  if (pathname.startsWith('/po-from-customer') || 
      pathname.startsWith('/billing') ||
      pathname.startsWith('/invoice') ||
      pathname.startsWith('/quotation') ||
      pathname.startsWith('/amc-quotations')) {
    return 'billing';
  }

  if (pathname.startsWith('/dg-quotation') || 
      pathname.startsWith('/dg-sales') ||
      pathname.startsWith('/dg-purchase-order')) {
    return 'dg_sales';
  }

  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/lead-management')) return 'lead_management';
  if (pathname.startsWith('/user-management')) return 'user_management';
  if (pathname.startsWith('/product-management')) return 'product_management';
  if (pathname.startsWith('/inventory-management')) return 'inventory_management';
  if (pathname.startsWith('/service-management')) return 'service_management';
  if (pathname.startsWith('/amc-management')) return 'amc_management';
  if (pathname.startsWith('/purchase-order-management')) return 'purchase_orders';
  if (pathname.startsWith('/reports-management')) return 'reports_analytics';
  if (pathname.startsWith('/communication-management')) return 'communications';
  if (pathname.startsWith('/admin-settings')) return 'admin_settings';

  return 'dashboard';
}

export function useCurrentModulePermission() {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const currentModuleKey = getActiveKeyFromPath(location.pathname);
  const moduleEntry = user?.moduleAccess?.find(
    (entry: any) => entry.module === currentModuleKey
  );

  return moduleEntry?.permission ?? null;
}


