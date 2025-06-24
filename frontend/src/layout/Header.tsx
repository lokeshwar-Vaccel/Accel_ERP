import React from 'react';
import { Menu, Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

export default function Header({ onMenuToggle, title }: HeaderProps) {
  return (
    <header className="relative h-20 bg-gray-400 backdrop-blur-xl border-b border-gray-200/50 px-6 py-4 shadow-sm">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 via-transparent to-orange-50/50 pointer-events-none"></div>
      
      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              {title}
            </h1>
            <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full mt-1"></div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Enhanced Search */}
          <div className="hidden md:flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl px-4 py-3 shadow-inner border border-gray-200/50 hover:shadow-md transition-all duration-300">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search anything..."
              className="bg-transparent outline-none text-sm w-64 placeholder-gray-500"
            />
            <div className="w-px h-4 bg-gray-300"></div>
            <kbd className="px-2 py-1 bg-white rounded text-xs text-gray-500 border border-gray-200">⌘K</kbd>
          </div>

          {/* Enhanced Notifications */}
          <button className="relative p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 rounded-xl transition-all duration-300 group">
            <Bell className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow-lg animate-pulse">
              3
            </span>
          </button>

          {/* User Avatar */}
          <div className="flex items-center space-x-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl px-4 py-2 shadow-sm border border-gray-200/50 hover:shadow-md transition-all duration-300 cursor-pointer group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">Admin</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}