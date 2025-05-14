'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Wallet, 
  History, 
  Users, 
  Trophy, 
  UserCircle, 
  Settings, 
  LogOut,
  HelpCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface SidebarProps {
  darkMode: boolean;
  onLogout: () => void;
  onDarkModeToggle?: () => void;
}

const Sidebar = ({ darkMode, onLogout, onDarkModeToggle }: SidebarProps) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Check if sidebar state is saved in localStorage
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState) {
      setIsCollapsed(savedState === 'true');
    }
    
    // Set collapsed state on smaller screens by default
    const checkScreenSize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setIsCollapsed(true);
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', newState.toString());
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home size={18} /> },
    { name: 'Wallet', path: '/dashboard/wallet', icon: <Wallet size={18} /> },
    { name: 'History', path: '/dashboard/history', icon: <History size={18} /> },
    { name: 'Referral', path: '/dashboard/referral', icon: <Users size={18} /> },
    { name: 'Ranking', path: '/dashboard/ranking', icon: <Trophy size={18} /> },
    { name: 'Profile', path: '/dashboard/profile', icon: <UserCircle size={18} /> },
    { name: 'Settings', path: '/dashboard/settings', icon: <Settings size={18} /> },
  ];

  const containerStyle = isCollapsed
    ? `w-16 transition-all duration-300 ease-in-out shadow-lg ${
        darkMode ? 'bg-gray-900' : 'bg-white border-r border-gray-200'
      }`
    : `w-48 transition-all duration-300 ease-in-out shadow-lg ${
        darkMode ? 'bg-gray-900' : 'bg-white border-r border-gray-200'
      }`;

  // Define style for the navigation links based on dark mode
  const getNavLinkStyle = (isActive: boolean) => {
    if (darkMode) {
      return isActive
        ? 'flex items-center p-2 rounded-lg bg-sky-600/20 text-sky-500'
        : 'flex items-center p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-200';
    } else {
      return isActive
        ? 'flex items-center p-2 rounded-lg bg-sky-100 text-sky-700'
        : 'flex items-center p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900';
    }
  };

  // Define style for the icon containers
  const getIconStyle = (isActive: boolean) => {
    if (darkMode) {
      return isActive
        ? 'w-6 h-6 text-sky-500'
        : 'w-6 h-6 text-gray-400 group-hover:text-gray-200';
    } else {
      return isActive
        ? 'w-6 h-6 text-sky-700'
        : 'w-6 h-6 text-gray-500 group-hover:text-gray-700';
    }
  };

  return (
    <div className={`h-full flex flex-col ${containerStyle} ${
      darkMode ? 'text-white' : 'text-gray-800'
    }`}>
      {/* Main Navigation */}
      <div className="flex-1 py-4">
        <div className="px-3 mb-6">
          {isCollapsed ? (
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">P$</span>
            </div>
          ) : (
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center mr-2">
                <span className="text-white font-bold text-sm">P$</span>
              </div>
              <div>
                <h1 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ProServe<span className="text-sky-600">Money</span>
                </h1>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Financial Management
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation Links */}
        <nav>
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <li key={item.name}>
                  <Link
                    href={item.path}
                    className={getNavLinkStyle(isActive)}
                  >
                    <div className="flex items-center">
                      <div className={getIconStyle(isActive)}>
                        {item.icon}
                      </div>
                      
                      {!isCollapsed && (
                        <span className={`ml-2 font-medium text-sm ${isActive ? '' : ''}`}>
                          {item.name}
                        </span>
                      )}
                    </div>
                    
                    {!isCollapsed && isActive && (
                      <div className="bg-white bg-opacity-20 rounded-full w-1.5 h-1.5"></div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom section with additional links */}
      <div className="px-2 pb-4 space-y-1">
        {!isCollapsed && (
          <>
            <Link
              href="/dashboard/help"
              className={`flex items-center p-2 rounded-lg transition-all duration-200 ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                  : 'text-black hover:bg-sky-100 hover:text-sky-800'
              }`}
            >
              <HelpCircle size={18} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
              <span className="ml-2 font-medium text-sm">Help & Support</span>
            </Link>
            
            <hr className={`my-2 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          </>
        )}
        
        {/* Toggle collapse button */}
        <button 
          onClick={toggleSidebar}
          className={`w-full flex items-center justify-${isCollapsed ? 'center' : 'between'} p-2 rounded-lg transition-all duration-200 ${
            darkMode
              ? 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
              : 'text-black hover:bg-sky-100 hover:text-sky-800'
          }`}
        >
          {!isCollapsed && <span className="font-medium text-sm">Collapse</span>}
          <div className={`${isCollapsed ? '' : 'mr-1'}`}>
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 