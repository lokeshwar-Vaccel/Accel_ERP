import React from 'react';
import {
  LayoutGrid,
  Users,
  Package,
  Wrench,
  X,
  User,
  Sun,
  ShoppingCart,
  FileText,
  BarChart3,
  Upload,
  MessageSquare,
  Calendar,
  Cog,
  ChevronLeft
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from 'redux/store';

interface SidebarProps {
  currentPanel: string;
  onPanelChange: (panel: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
  moduleAccess: {
    module: string;
    access: boolean;
    permission: 'read' | 'write' | 'admin';
  }[];
}

const menuItems = [
  {
    id: 1,
    name: 'Dashboard',
    icon: <LayoutGrid className="w-4 h-4" />,
    path: '/dashboard',
    key: 'dashboard',
  },
  {
    id: 2,
    name: 'Lead Management',
    icon: <Users className="w-4 h-4" />,
    path: '/lead-management',
    key: 'lead_management',
  },
  {
    id: 3,
    name: 'Quotation Management',
    icon: <Users className="w-4 h-4" />,
    path: '/quotation-management',
    key: 'quotation_management',
  },
  {
    id: 4,
    name: 'User  Management',
    icon: <User  className="w-4 h-4" />,
    path: '/user-management',
    key: 'user_management',
  },
  {
    id: 5,
    name: 'Product Management',
    icon: <Package className="w-4 h-4" />,
    path: '/product-management',
    key: 'product_management',
  },
  {
    id: 6,
    name: 'Inventory Management',
    icon: <Package className="w-4 h-4" />,
    path: '/inventory-management',
    key: 'inventory_management',
  },
  {
    id: 7,
    name: 'Service Management',
    icon: <Wrench className="w-4 h-4" />,
    path: '/service-management',
    key: 'service_management',
  },
  {
    id: 8,
    name: 'AMC Management',
    icon: <Calendar className="w-4 h-4" />,
    path: '/amc-management',
    key: 'amc_management',
  },
  {
    id: 9,
    name: 'Purchase Orders',
    icon: <ShoppingCart className="w-4 h-4" />,
    path: '/purchase-order-management',
    key: 'purchase_orders',
  },
  {
    id: 10,
    name: 'Billing',
    icon: <FileText className="w-4 h-4" />,
    path: '/billing',
    key: 'billing',
  },
  {
    id: 11,
    name: 'Reports & Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/reports-management',
    key: 'reports_analytics',
  },
  {
    id: 12,
    name: 'File Management',
    icon: <Upload className="w-4 h-4" />,
    path: '/file-management',
    key: 'file_management',
  },
  {
    id: 13,
    name: 'Communications',
    icon: <MessageSquare className="w-4 h-4" />,
    path: '/communication-management',
    key: 'communications',
  },
  {
    id: 14,
    name: 'Admin Settings',
    icon: <Cog className="w-4 h-4" />,
    path: '/admin-settings',
    key: 'admin_settings',
  },
];

function getActiveKeyFromPath(pathname: string): string {
  const activeItem = menuItems.find(item => item.path === pathname);
  return activeItem?.key || 'dashboard';
}

// Hook to get current module permission
export function useCurrentModulePermission() {
  const { user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();
  const currentModuleKey = getActiveKeyFromPath(location.pathname);
  const moduleEntry = user?.moduleAccess?.find(
    (entry) => entry.module === currentModuleKey
  );
  
  return moduleEntry?.permission ?? null; // "read", "write", "admin", or null
}

export default function Sidebar({
  currentPanel,
  onPanelChange,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
  moduleAccess, // Receive moduleAccess as a prop
}: SidebarProps) {
  const navigate = useNavigate();

  // Get current path to determine active menu item
  const location = useLocation();
  const activeKey = getActiveKeyFromPath(location.pathname);
  
  // Filter menu items based on moduleAccess with fallback
  const accessibleMenuItems = React.useMemo(() => {
    // If moduleAccess is not provided or is empty, show at least dashboard
    if (!moduleAccess || !Array.isArray(moduleAccess) || moduleAccess.length === 0) {
      console.warn("ModuleAccess is empty or undefined, showing dashboard only");
      return menuItems.filter(item => item.key === 'dashboard');
    }

    const filtered = menuItems.filter(item =>
      moduleAccess.some(mod => mod.module === item.key && mod.access === true)
    );

    // If no modules are accessible, at least show dashboard
    if (filtered.length === 0) {
      console.warn("No accessible modules found, showing dashboard only");
      return menuItems.filter(item => item.key === 'dashboard');
    }

    return filtered;
  }, [moduleAccess]);

  return (
    <>
      <div
        className={`
          text-white
          ${isOpen ? 'block' : 'hidden'} lg:block
          ${isCollapsed ? 'w-16' : 'w-52'} flex flex-col h-screen transition-all duration-300
        `}
      >
        {/* Header */}
        <div className="relative h-16 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative pl-2 pt-1">
                <button
                  onClick={onCollapseToggle}
                  className="relative group hidden lg:block"
                  title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer">
                    <Sun className="w-5 h-5 text-white" />
                  </div>
                </button>
                <div className="relative lg:hidden pl-2 pt-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                    <Sun className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Sun Power
                  </h1>
                  <p className="text-xs text-gray-400 font-medium">Services ERP</p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {!isCollapsed && (
                <button
                  onClick={onCollapseToggle}
                  className="hidden lg:flex p-1.5 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-3 h-3 text-gray-400 hover:text-white transition-colors duration-200" />
                </button>
              )}
              <button
                onClick={onToggle}
                className="lg:hidden p-1.5 hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {accessibleMenuItems.map((item, index) => {
              const isActive = activeKey === item.key || location.pathname === item.path;
              return (
                <li
                  key={item.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-fade-in-up"
                >
                  <button
                    onClick={() => {
                      onPanelChange(item.key);
                      navigate(item.path,);
                      if (window.innerWidth < 1024) onToggle();
                    }}
                    className={`
                      group relative w-full flex items-center ${isCollapsed ? 'justify-center px-1.5' : 'space-x-2 px-2'} py-1.5 rounded-lg transition-all duration-300
                      ${isActive
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-orange-400 rounded-r-full"></div>
                    )}
                    <div
                      className={`relative p-1 rounded-md transition-all duration-300
                      ${isActive ? 'bg-orange-600/30 shadow-inner' : 'bg-gray-600/20 group-hover:bg-gray-600/40'}`}
                    >
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <span className="font-medium text-xs tracking-wide flex-1 text-left">{item.name}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
