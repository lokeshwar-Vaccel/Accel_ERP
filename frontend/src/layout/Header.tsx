import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, ChevronDown, LogOut, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { logout, forceLogout } from '../redux/auth/authSlice';

interface HeaderProps {
  onMenuToggle: () => void;
  pathSegments: string[];
  baseLabel?: string;
}

const toTitleCase = (str: string) =>
  str
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

export default function Header({ onMenuToggle, pathSegments, baseLabel = 'Home' }: HeaderProps) {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { user, isLoading } = useSelector((state: RootState) => state.auth);

  const paths = pathSegments.map((segment, index) => ({
    name: toTitleCase(segment),
    path: '/' + pathSegments.slice(0, index + 1).join('/'),
  }));

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

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logout()).unwrap();
    } catch (error) {
      console.warn('Normal logout failed, forcing local logout:', error);
      dispatch(forceLogout());
    } finally {
      setIsLoggingOut(false);
      setIsUserDropdownOpen(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-20 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Menu + Breadcrumb */}
        <div className="flex items-center flex-1">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-700 rounded-xl transition-all duration-200 hover:scale-105 mr-4"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
          
          {/* Breadcrumb with larger text */}
          <nav aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse">
              <li className="inline-flex items-center">
                <Link
                  to="/"
                  className="inline-flex items-center text-base font-medium text-gray-300 hover:text-white transition-colors duration-200"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z" />
                  </svg>
                  {baseLabel}
                </Link>
              </li>
              {paths.map((item, index) => (
                <li key={item.path} aria-current={index === paths.length - 1 ? 'page' : undefined}>
                  <div className="flex items-center">
                    <svg
                      className="rtl:rotate-180 block w-4 h-4 mx-2 text-gray-500"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 6 10"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m1 9 4-4-4-4"
                      />
                    </svg>
                    {index === paths.length - 1 ? (
                      <span className="text-base font-medium text-white">
                        {item.name}
                      </span>
                    ) : (
                      <Link
                        to={item.path}
                        className="text-base font-medium text-gray-300 hover:text-white transition-colors duration-200"
                      >
                        {item.name}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Center: Search Bar - Made Wider */}
        <div className="flex-1 flex justify-center">
          <div className="hidden md:flex items-center space-x-2 bg-gray-700/20 rounded-xl px-3 py-2 border border-white/5 hover:bg-gray-700/30 transition-all duration-300 max-w-2xl w-full">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none text-sm flex-1 placeholder-gray-500 text-white"
            />
            <kbd className="px-1.5 py-0.5 bg-gray-800/50 rounded text-xs text-gray-400 border border-gray-600/30">⌘K</kbd>
          </div>
        </div>

        {/* Right: User Dropdown + Notifications */}
        <div className="flex items-center justify-end flex-1 space-x-4">
          {/* User Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              className="flex items-center space-x-3 p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white font-semibold text-xs">{getUserInitials()}</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
              </div>
              <div className="hidden lg:block text-left">
                <p className="font-semibold text-white text-sm">{getUserDisplayName()}</p>
                <p className="text-xs text-gray-400">{user?.role || 'Admin'}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-white transition-all duration-300 ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isUserDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 py-2">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="font-semibold text-white text-sm">{getUserDisplayName()}</p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                  <p className="text-xs text-gray-500">{user?.role || 'Admin'}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  disabled={isLoading || isLoggingOut}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-red-500/20 transition-all duration-300 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="p-1 rounded-lg bg-red-500/20 group-hover:bg-red-500/30 transition-colors duration-300">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-sm">
                    {isLoading || isLoggingOut ? 'Signing out...' : 'Logout'}
                  </span>
                </button>
                             </div>
             )}
           </div>

          {/* Notifications */}
          <button className="relative p-3 hover:bg-gray-700/50 rounded-xl transition-all duration-300 group">
            <Bell className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors duration-300" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">
              3
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}