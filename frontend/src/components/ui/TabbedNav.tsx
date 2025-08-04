import React from 'react';

interface Tab {
  label: string;
  key: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabbedNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

const TabbedNav: React.FC<TabbedNavProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`flex items-center px-4 py-2 -mb-px border-b-2 font-medium text-sm focus:outline-none transition-colors
            ${activeTab === tab.key
              ? 'border-blue-600 text-blue-700 bg-white'
              : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'}
          `}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
          {typeof tab.count === 'number' && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default TabbedNav; 