import React, { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  iconColor?: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  darkMode?: boolean;
}

export default function StatsCard({
  title,
  value,
  description,
  icon,
  iconColor = 'blue',
  change,
  darkMode = false
}: StatsCardProps) {
  // Get the appropriate background and text color based on iconColor
  let bgColorClass = 'bg-blue-50 dark:bg-blue-900/20';
  let textColorClass = 'text-blue-500 dark:text-blue-400';
  
  if (iconColor === 'green') {
    bgColorClass = 'bg-green-50 dark:bg-green-900/20';
    textColorClass = 'text-green-500 dark:text-green-400';
  } else if (iconColor === 'red') {
    bgColorClass = 'bg-red-50 dark:bg-red-900/20';
    textColorClass = 'text-red-500 dark:text-red-400';
  } else if (iconColor === 'yellow') {
    bgColorClass = 'bg-yellow-50 dark:bg-yellow-900/20';
    textColorClass = 'text-yellow-500 dark:text-yellow-400';
  } else if (iconColor === 'purple') {
    bgColorClass = 'bg-purple-50 dark:bg-purple-900/20';
    textColorClass = 'text-purple-500 dark:text-purple-400';
  }
  
  return (
    <div className={`rounded-xl shadow-sm p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
      <div className="flex items-center">
        {icon && (
          <div className={`p-3 rounded-full mr-4 ${bgColorClass}`}>
            <div className={textColorClass}>
              {icon}
            </div>
          </div>
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          <div className="flex items-baseline mt-1">
            <p className="text-2xl font-semibold">{value}</p>
            {change && (
              <p className={`ml-2 text-xs font-medium ${
                change.type === 'increase' 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
              }`}>
                {change.type === 'increase' ? '↑' : '↓'} {change.value}%
              </p>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
} 