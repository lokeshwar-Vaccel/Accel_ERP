import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'red';
}

export default function StatCard({ title, value, change, icon, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-500 to-blue-600',
      bg: 'from-blue-50 to-blue-100',
      text: 'text-blue-600',
      shadow: 'shadow-blue-500/20'
    },
    green: {
      gradient: 'from-green-500 to-green-600',
      bg: 'from-green-50 to-green-100',
      text: 'text-green-600',
      shadow: 'shadow-green-500/20'
    },
    orange: {
      gradient: 'from-orange-500 to-orange-600',
      bg: 'from-orange-50 to-orange-100',
      text: 'text-orange-600',
      shadow: 'shadow-orange-500/20'
    },
    red: {
      gradient: 'from-red-500 to-red-600',
      bg: 'from-red-50 to-red-100',
      text: 'text-red-600',
      shadow: 'shadow-red-500/20'
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-500">{/* Removed overlay elements */}

      <div className="relative flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Enhanced icon container */}
          <div className={`relative p-4 rounded-2xl bg-gradient-to-br ${colors.gradient} shadow-lg ${colors.shadow} group-hover:scale-110 transition-transform duration-300`}>
            <div className="text-white">
              {icon}
            </div>
            {/* Removed shine effect */}
          </div>
          
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1 tracking-wide uppercase">{title}</p>
            <p className="text-3xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300">
              {value}
            </p>
          </div>
        </div>
        
        {/* Enhanced change indicator */}
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
          change >= 0 
            ? 'text-green-700 bg-gradient-to-r from-green-100 to-green-200 shadow-green-500/20' 
            : 'text-red-700 bg-gradient-to-r from-red-100 to-red-200 shadow-red-500/20'
        } shadow-lg group-hover:scale-105`}>
          {change >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span>{Math.abs(change)}%</span>
        </div>
      </div>

      {/* Removed bottom accent line */}
    </div>
  );
}