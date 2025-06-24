import React, { useState } from 'react';
import {
  LayoutGrid,
  Users,
  Package,
  Wrench,
  Settings,
  X,
  LogOut,
  User,
  Zap,
  ShoppingCart,
  FileText,
  BarChart3,
  Upload,
  MessageSquare,
  Calendar,
  Cog
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout, forceLogout } from '../redux/auth/authSlice';

interface SidebarProps {
  currentPanel: string;
  onPanelChange: (panel: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  {
    id: 1,
    name: 'Dashboard',
    icon: <LayoutGrid className="w-5 h-5" />,
    path: '/dashboard',
    key: 'dashboard',
  },
  {
    id: 2,
    name: 'Customer Management',
    icon: <Users className="w-5 h-5" />,
    path: '/customer-management',
    key: 'customer-management',
  },
  {
    id: 3,
    name: 'User Management',
    icon: <User className="w-5 h-5" />,
    path: '/user-management',
    key: 'user-management',
  },
  {
    id: 4,
    name: 'Product Management',
    icon: <Package className="w-5 h-5" />,
    path: '/product-management',
    key: 'product-management',
  },
  {
    id: 5,
    name: 'Inventory Management',
    icon: <Package className="w-5 h-5" />,
    path: '/inventory-management',
    key: 'inventory-management',
  },
  {
    id: 6,
    name: 'Service Management',
    icon: <Wrench className="w-5 h-5" />,
    path: '/service-management',
    key: 'service-management',
  },
  {
    id: 7,
    name: 'AMC Management',
    icon: <Calendar className="w-5 h-5" />,
    path: '/amc-management',
    key: 'amc-management',
  },
  {
    id: 8,
    name: 'Purchase Orders',
    icon: <ShoppingCart className="w-5 h-5" />,
    path: '/purchase-order-management',
    key: 'purchase-order-management',
  },
  {
    id: 9,
    name: 'Reports & Analytics',
    icon: <BarChart3 className="w-5 h-5" />,
    path: '/reports-management',
    key: 'reports-management',
  },
  {
    id: 10,
    name: 'File Management',
    icon: <Upload className="w-5 h-5" />,
    path: '/file-management',
    key: 'file-management',
  },
  {
    id: 11,
    name: 'Communications',
    icon: <MessageSquare className="w-5 h-5" />,
    path: '/communication-management',
    key: 'communication-management',
  },
  {
    id: 12,
    name: 'Admin Settings',
    icon: <Cog className="w-5 h-5" />,
    path: '/admin-settings',
    key: 'admin-settings',
  },
];

export default function Sidebar({
  currentPanel,
  onPanelChange,
  isOpen,
  onToggle,
}: SidebarProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Try the normal logout process first
      await dispatch(logout()).unwrap();
    } catch (error) {
      // If normal logout fails, force logout locally
      console.warn('Normal logout failed, forcing local logout:', error);
      dispatch(forceLogout());
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'A';
  };

  const getUserDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.email || 'Admin User';
  };

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
          bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white
          ${isOpen ? 'block' : 'hidden'} lg:block
          w-72 flex flex-col border-r border-white/10 h-screen
        `}
      >
        {/* Removed animated background */}

        {/* Header */}
        <div className="relative h-20 p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
              <div>
                <h1 className="font-bold text-xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Sun Power
                </h1>
                <p className="text-xs text-gray-400 font-medium">Services ERP</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-5 overflow-y-auto">
          <ul className="space-y-2">
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
                      group relative w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-300
                      ${isActive
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                    `}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-orange-400 rounded-r-full"></div>
                    )}

                    {/* Icon */}
                    <div
                      className={`relative p-1.5 rounded-lg transition-all duration-300
                      ${isActive ? 'bg-orange-600/30 shadow-inner' : 'bg-gray-600/20 group-hover:bg-gray-600/40'}`}
                    >
                      {item.icon}
                    </div>

                    {/* Label */}
                    <span className="font-medium text-sm tracking-wide flex-1 text-left">{item.name}</span>

                    {/* Removed hover effect */}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="relative p-6 border-t border-white/10">
          <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-600/20 rounded-xl">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">{getUserDisplayName()}</p>
              <p className="text-xs text-gray-400">{user?.role || 'Admin'}</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            disabled={isLoading || isLoggingOut}
            className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="p-1 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors duration-300">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-medium">
              {isLoading || isLoggingOut ? 'Signing out...' : 'Logout'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
