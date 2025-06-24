import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="relative mb-6">
      {/* Main Header Container */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100/50 to-red-100/50 rounded-full -translate-y-6 translate-x-6 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-tr from-orange-200/30 to-yellow-200/30 rounded-full translate-y-3 -translate-x-3 blur-xl"></div>
        
        <div className="relative flex justify-between items-start">
          <div className="flex-1">
            {/* Title with gradient underline */}
            <div className="relative inline-block">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {title}
              </h1>
              {/* Straight thick gradient underline */}
              <div className="w-full h-1.5 bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 rounded-full animate-pulse"></div>
            </div>
            
            {subtitle && (
              <p className="text-gray-600 mt-2 text-base max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Action buttons */}
          {children && (
            <div className="flex-shrink-0 ml-6">
              {children}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom curved shadow */}
      <div className="relative -mt-2">
        <svg
          className="w-full h-6 text-gray-200"
          viewBox="0 0 1200 24"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C300,24 900,24 1200,0 L1200,24 L0,24 Z"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
};

export default PageHeader; 