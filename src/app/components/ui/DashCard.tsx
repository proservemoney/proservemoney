import React from "react";
import { useDarkMode } from "@/app/hooks/useDarkMode";

interface DashCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
}

export default function DashCard({
  title,
  value,
  change,
  isPositive,
  icon,
}: DashCardProps) {
  const { darkMode } = useDarkMode();

  return (
    <div className={`rounded-xl p-5 ${
      darkMode 
        ? "bg-gray-800 text-white" 
        : "bg-sky-50 text-black"
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm font-medium ${
            darkMode ? "text-gray-300" : "text-gray-600"
          }`}>
            {title}
          </h3>
          <p className={`text-2xl font-semibold mt-1 ${
            darkMode ? "text-white" : "text-black"
          }`}>
            {value}
          </p>
          {change && (
            <p className={`text-xs mt-1 ${
              isPositive 
                ? "text-green-400" 
                : "text-red-400"
            }`}>
              {isPositive ? "+" : "-"} {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            darkMode 
              ? "bg-blue-600/20 text-blue-500" 
              : "bg-sky-200 text-sky-700"
          }`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
} 