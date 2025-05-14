'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './ui/Sidebar';
import { Menu, X, Moon, Sun, LogOut } from 'lucide-react';
import { clearAuthData } from '@/lib/auth-utils';
import Link from 'next/link';
import LogoutConfirmation from './LogoutConfirmation';

interface DashboardLayoutProps {
  children: ReactNode;
  darkMode: boolean;
  onDarkModeChange?: (isDarkMode: boolean) => void;
}

const DashboardLayout = ({ children, darkMode, onDarkModeChange }: DashboardLayoutProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Determine if we should show the floating navbar (for all pages except the main dashboard)
  const showFloatingNavbar = pathname !== '/dashboard';
  
  // Apply dark mode to the root HTML element
  useEffect(() => {
    // Apply or remove the dark class based on the darkMode prop
    document.documentElement.classList.toggle('dark', darkMode);
    
    // Store dark mode preference in localStorage
    localStorage.setItem('dashboard-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  
  // Close sidebar when clicking outside of it on mobile
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (isSidebarOpen && window.innerWidth < 1024) {
        const sidebar = document.getElementById('mobile-sidebar');
        const toggleButton = document.getElementById('sidebar-toggle');
        
        if (sidebar && 
            toggleButton && 
            !sidebar.contains(e.target as Node) && 
            !toggleButton.contains(e.target as Node)) {
          setIsSidebarOpen(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleOutsideClick);
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isSidebarOpen]);
  
  // Close sidebar when window is resized to desktop view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const handleLogout = () => {
    // Show logout confirmation instead of logging out directly
    setShowLogoutConfirmation(true);
  };
  
  const handleToggleDarkMode = () => {
    // Toggle dark mode directly
    const newDarkMode = !darkMode;
    
    // Apply or remove the dark class immediately
    document.documentElement.classList.toggle('dark', newDarkMode);
    
    // Store dark mode preference in localStorage immediately
    localStorage.setItem('dashboard-theme', newDarkMode ? 'dark' : 'light');
    
    // Only call the callback if it exists
    if (onDarkModeChange) {
      onDarkModeChange(newDarkMode);
    }
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Add additional styling to ensure text visibility in both themes
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .theme-text { color: ${darkMode ? '#ffffff' : '#1f2937'} !important; }
      .theme-text-secondary { color: ${darkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.8)'} !important; }
      .theme-bg-primary { background-color: ${darkMode ? 'rgba(17, 24, 39, 0.8)' : 'rgba(255, 255, 255, 0.95)'} !important; }
      input, select, textarea { 
        color: ${darkMode ? '#ffffff' : '#1f2937'} !important; 
        background-color: ${darkMode ? '#374151' : '#ffffff'} !important; 
        border-color: ${darkMode ? '#4b5563' : '#d1d5db'} !important;
      }
      .dark .dashboard-content { color: #ffffff !important; }
      .dark .dashboard-heading { color: #f9fafb !important; font-weight: 600 !important; }
      .dark .dashboard-card { color: #f3f4f6 !important; background-color: rgba(31, 41, 55, 0.7) !important; }
      
      .dashboard-content { color: #1f2937 !important; }
      .dashboard-heading { color: #111827 !important; font-weight: 600 !important; }
      .dashboard-card { color: #1f2937 !important; background-color: rgba(255, 255, 255, 0.95) !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important; }
      
      /* Add specific overrides for light theme text */
      .light-mode-text { color: #1f2937 !important; }
      .dark-mode-text { color: #f9fafb !important; }
      
      /* Additional overrides for specific components */
      .dark button span { color: #ffffff !important; }
      button span { color: #1f2937 !important; }
      
      h1, h2, h3, h4, h5, h6 { 
        color: ${darkMode ? '#f9fafb' : '#111827'} !important; 
      }
      
      p, span, div { 
        color: ${darkMode ? '#f3f4f6' : '#1f2937'}; 
      }
      
      .stats-card {
        background-color: ${darkMode ? 'rgba(31, 41, 55, 0.7)' : '#ffffff'} !important;
        color: ${darkMode ? '#f3f4f6' : '#1f2937'} !important;
        box-shadow: ${darkMode ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.05)'} !important;
      }
      
      /* Improved card styling for light mode */
      .light-mode-card {
        background-color: #ffffff !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, [darkMode]);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-sky-50'}`}>
      {/* Background with gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-sky-200/30 to-blue-300/40 dark:from-gray-900/90 dark:to-gray-800/90 -z-10"></div>
      
      {/* Desktop Sidebar - Always visible on desktop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-20 w-48 transition-transform">
        <Sidebar darkMode={darkMode} onLogout={handleLogout} onDarkModeToggle={handleToggleDarkMode} />
      </div>
      
      {/* Floating Navbar - Only visible on pages other than main dashboard */}
      {showFloatingNavbar && (
        <div className="fixed top-4 lg:left-52 right-4 left-4 z-30">
          <div className={`flex items-center justify-between py-3 px-4 rounded-xl backdrop-blur-md shadow-lg border ${
            darkMode ? 'bg-gray-800/70 border-gray-700' : 'bg-white/90 border-sky-200'
          }`}>
            {/* Left side: Logo and mobile menu toggle */}
            <div className="flex items-center space-x-3">
              <button 
                id="sidebar-toggle"
                onClick={toggleSidebar} 
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <Menu size={20} />
              </button>
              <Link href="/dashboard" className="flex items-center">
                <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-black'}`}>
                  ProServe<span className="text-sky-600">Money</span>
                </span>
              </Link>
            </div>
            
            {/* Right side: Actions - Increased spacing and fixed button size */}
            <div className="flex items-center space-x-3">
              <button 
                onClick={handleToggleDarkMode}
                className={`p-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700/60 text-yellow-300 hover:bg-gray-700/80' 
                    : 'bg-sky-200 text-sky-800 hover:bg-sky-300'
                }`}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              
              <button 
                onClick={handleLogout}
                className={`p-2 w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700/60 text-red-400 hover:bg-gray-700/80 hover:text-red-300' 
                    : 'bg-sky-200 text-red-600 hover:bg-sky-300 hover:text-red-700'
                }`}
                aria-label="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Sidebar - Only visible when toggled */}
      {isSidebarOpen && (
        <div 
          id="mobile-sidebar"
          className="fixed inset-0 z-40 lg:hidden"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleSidebar}></div>
          
          {/* Sidebar content */}
          <div className={`absolute inset-y-0 left-0 w-48 shadow-xl transition-transform transform-gpu translate-x-0 ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            <div className="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
              <span className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-black'}`}>
                PS<span className="text-sky-600">Money</span>
              </span>
              <button 
                onClick={toggleSidebar}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <X size={20} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
              </button>
            </div>
            <Sidebar darkMode={darkMode} onLogout={handleLogout} onDarkModeToggle={handleToggleDarkMode} />
          </div>
        </div>
      )}
      
      {/* Main content - Adjusted padding and margin based on whether floating navbar is visible */}
      <main className={`transition-all duration-300 ${showFloatingNavbar ? 'pt-36' : 'pt-4'} lg:ml-48 p-4 sm:p-6 lg:p-8 theme-text dashboard-content ${darkMode ? 'dark-mode-text' : 'light-mode-text'} ${darkMode ? '' : 'bg-white/60 shadow-sm rounded-xl border border-gray-100'}`}>
        {children}
      </main>

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmation 
        isOpen={showLogoutConfirmation} 
        onClose={() => setShowLogoutConfirmation(false)}
        darkMode={darkMode}
      />
    </div>
  );
};

export default DashboardLayout; 