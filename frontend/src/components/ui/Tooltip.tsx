import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = ''
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'group-hover:opacity-100 opacity-0 bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'group-hover:opacity-100 opacity-0 top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'group-hover:opacity-100 opacity-0 right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'group-hover:opacity-100 opacity-0 left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'group-hover:opacity-100 opacity-0 bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 -mt-1';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 -ml-1';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 -mr-1';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 -mt-1';
    }
  };

  return (
    <div className={`group relative inline-block ${className}`}>
      {children}
      <div
        className={`absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200 ${getPositionClasses()}`}
        style={{ minWidth: 'max-content' }}
      >
        {content}
        <div
          className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${getArrowClasses()}`}
        />
      </div>
    </div>
  );
}; 