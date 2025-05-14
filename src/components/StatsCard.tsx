import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  darkMode?: boolean;
}

export default function StatsCard({ 
  title, 
  value, 
  description, 
  icon, 
  darkMode = false 
}: StatsCardProps) {
  return (
    <div className={`p-6 rounded-xl shadow-lg backdrop-blur-sm border transition-all hover:shadow-xl dashboard-card ${
      darkMode 
        ? 'bg-gray-800/70 border-gray-700 hover:bg-gray-800/80' 
        : 'bg-white/90 border-gray-200 hover:bg-white/95'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium mb-1 theme-text-secondary`}>
            {title}
          </p>
          <p className={`text-3xl font-bold theme-text`}>
            {value}
          </p>
          {description && (
            <p className={`text-xs mt-2 theme-text-secondary`}>
              {description}
            </p>
          )}
        </div>
        <div className={`rounded-full p-4 ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-100/80'
        }`}>
          {icon}
        </div>
      </div>
    </div>
  );
} 