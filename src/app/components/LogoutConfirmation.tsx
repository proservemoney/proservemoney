import React from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Home } from 'lucide-react';
import { clearAuthData } from '@/lib/auth-utils';

interface LogoutConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  darkMode: boolean;
}

const LogoutConfirmation: React.FC<LogoutConfirmationProps> = ({ isOpen, onClose, darkMode }) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleLogout = () => {
    clearAuthData();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      
      {/* Dialog */}
      <div className={`relative w-full max-w-md p-6 rounded-lg ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700 shadow-2xl' 
          : 'bg-white border border-gray-200 shadow-xl'
      }`}>
        <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Confirm Logout
        </h2>
        
        <p className={`mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Are you sure you want to log out of your account?
        </p>
        
        <div className="flex space-x-3">
          <button
            onClick={handleLogout}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
          
          <button
            onClick={onClose}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg transition-colors shadow-sm ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <Home size={18} />
            <span>Stay</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmation; 