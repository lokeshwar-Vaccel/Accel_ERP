import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
  return (
    <div className="relative mb-4">
      {/* Main Header Container */}
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-100/50 to-red-100/50 rounded-full -translate-y-4 translate-x-4 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-14 h-14 bg-gradient-to-tr from-orange-200/30 to-yellow-200/30 rounded-full translate-y-2 -translate-x-2 blur-lg"></div>
        
        <div className="relative flex justify-between items-start">
          <div className="flex-1">
            {/* Title with gradient underline */}
            <div className="relative inline-block">
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5">
                {title}
              </h1>
              {/* Straight thick gradient underline */}
              <div className="w-full h-1 bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 rounded-full animate-pulse"></div>
            </div>
            
            {subtitle && (
              <p className="text-gray-600 mt-1.5 text-sm max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Action buttons */}
          {children && (
            <div className="flex-shrink-0 ml-4">
              {children}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom curved shadow */}
      <div className="relative -mt-1.5">
        <svg
          className="w-full h-4 text-gray-200"
          viewBox="0 0 1200 16"
          preserveAspectRatio="none"
        >
          <path
            d="M0,0 C300,16 900,16 1200,0 L1200,16 L0,16 Z"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </div>
    </div>
  );
};

export default PageHeader; 