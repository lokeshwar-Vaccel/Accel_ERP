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
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  currentPanel: string;
  onPanelChange: (panel: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
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
    name: 'Customer Management',
    icon: <Users className="w-4 h-4" />,
    path: '/customer-management',
    key: 'customer-management',
  },
  {
    id: 3,
    name: 'User Management',
    icon: <User className="w-4 h-4" />,
    path: '/user-management',
    key: 'user-management',
  },
  {
    id: 4,
    name: 'Product Management',
    icon: <Package className="w-4 h-4" />,
    path: '/product-management',
    key: 'product-management',
  },
  {
    id: 5,
    name: 'Inventory Management',
    icon: <Package className="w-4 h-4" />,
    path: '/inventory-management',
    key: 'inventory-management',
  },
  {
    id: 6,
    name: 'Service Management',
    icon: <Wrench className="w-4 h-4" />,
    path: '/service-management',
    key: 'service-management',
  },
  {
    id: 7,
    name: 'AMC Management',
    icon: <Calendar className="w-4 h-4" />,
    path: '/amc-management',
    key: 'amc-management',
  },
  {
    id: 8,
    name: 'Purchase Orders',
    icon: <ShoppingCart className="w-4 h-4" />,
    path: '/purchase-order-management',
    key: 'purchase-order-management',
  },
  {
    id: 9,
    name: 'Reports & Analytics',
    icon: <BarChart3 className="w-4 h-4" />,
    path: '/reports-management',
    key: 'reports-management',
  },
  {
    id: 10,
    name: 'File Management',
    icon: <Upload className="w-4 h-4" />,
    path: '/file-management',
    key: 'file-management',
  },
  {
    id: 11,
    name: 'Communications',
    icon: <MessageSquare className="w-4 h-4" />,
    path: '/communication-management',
    key: 'communication-management',
  },
  {
    id: 12,
    name: 'Admin Settings',
    icon: <Cog className="w-4 h-4" />,
    path: '/admin-settings',
    key: 'admin-settings',
  },
];

export default function Sidebar({
  currentPanel,
  onPanelChange,
  isOpen,
  onToggle,
  isCollapsed,
  onCollapseToggle,
}: SidebarProps) {
  const navigate = useNavigate();

  // Get current path to determine active menu item
  const currentPath = window.location.pathname;
  const getActiveKey = () => {
    const activeItem = menuItems.find(item => item.path === currentPath);
    return activeItem?.key || 'dashboard';
  };

  return (
    <>
      {/* Sidebar overlay removed to prevent UI blocking */}

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
              {/* Clickable Sun Icon */}
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
                
                {/* Non-clickable version for mobile */}
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
              {/* Collapse Button - Only shown when expanded */}
              {!isCollapsed && (
                <button
                  onClick={onCollapseToggle}
                  className="hidden lg:flex p-1.5 hover:bg-gray-700/50 rounded-lg transition-all duration-200"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-3 h-3 text-gray-400 hover:text-white transition-colors duration-200" />
                </button>
              )}
              
              {/* Mobile Close Button */}
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
            {menuItems.map((item, index) => {
              const isActive = getActiveKey() === item.key || currentPath === item.path;
              return (
                <li
                  key={item.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-fade-in-up"
                >
                  <button
                    onClick={() => {
                      onPanelChange(item.key);
                      navigate(item.path);
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
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-4 bg-orange-400 rounded-r-full"></div>
                    )}

                    {/* Icon */}
                    <div
                      className={`relative p-1 rounded-md transition-all duration-300
                      ${isActive ? 'bg-orange-600/30 shadow-inner' : 'bg-gray-600/20 group-hover:bg-gray-600/40'}`}
                    >
                      {item.icon}
                    </div>

                    {/* Label - Only show when not collapsed */}
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
