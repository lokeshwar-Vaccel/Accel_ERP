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
    path: '/',
    key: 'admin',
  },
  {
    id: 2,
    name: 'Client Management',
    icon: <Users className="w-5 h-5" />,
    path: '/client-management',
    key: 'client-management',
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
    name: 'Inventory',
    icon: <Package className="w-5 h-5" />,
    path: '/inventory',
    key: 'inventory',
  },
  {
    id: 5,
    name: 'Service',
    icon: <Wrench className="w-5 h-5" />,
    path: '/service',
    key: 'service',
  },
  {
    id: 6,
    name: 'Settings',
    icon: <Settings className="w-5 h-5" />,
    path: '/settings',
    key: 'settings',
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

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
          onClick={onToggle}
        />
      )}

      <div
        className={`
          fixed left-0 top-0 h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white z-50
          transform transition-all duration-500 ease-out shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
          w-72 flex flex-col backdrop-blur-xl border-r border-white/10
        `}
      >
        {/* Animated background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-transparent to-orange-500/20" />
        </div>

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
                <p className="text-xs text-gray-400 font-medium">Services CRM</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-5">
          <ul className="space-y-3">
            {menuItems.map((item, index) => {
              const isActive = currentPanel === item.key;
              return (
                <li
                  key={item.id}
                  style={{ animationDelay: `${index * 100}ms` }}
                  className="animate-fade-in-up"
                >
                  <button
                    onClick={() => {
                      onPanelChange(item.key);
                      navigate(item.path);
                      if (window.innerWidth < 1024) onToggle();
                    }}
                    className={`
                      group relative w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-300
                      transform hover:scale-[1.02] hover:translate-x-1
                      ${isActive
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-lg text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'}
                    `}
                  >
                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full"></div>
                    )}

                    {/* Icon */}
                    <div
                      className={`relative p-1 rounded-lg transition-all duration-300
                      ${isActive ? 'bg-white/20 shadow-inner' : 'bg-white/5 group-hover:bg-white/10'}`}
                    >
                      {item.icon}
                      {isActive && (
                        <div className="absolute inset-0 bg-white/10 rounded-lg animate-pulse"></div>
                      )}
                    </div>

                    {/* Label */}
                    <span className="font-semibold text-sm tracking-wide">{item.name}</span>

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="relative p-6 border-t border-white/10">
          <div className="flex items-center space-x-4 mb-4 p-3 bg-white/5 rounded-xl backdrop-blur-sm">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-semibold text-sm">{getUserInitials()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
            </div>
            <div>
              <p className="font-semibold text-white">{getUserDisplayName()}</p>
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
