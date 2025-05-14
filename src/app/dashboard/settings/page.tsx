'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function SettingsPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState({
    referrals: true,
    payments: true,
    security: true,
    newsletter: false,
    marketing: false
  });
  const [pushNotifications, setPushNotifications] = useState({
    referrals: true,
    payments: true,
    security: false
  });
  const [language, setLanguage] = useState('english');
  
  // Detect dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('dashboard-theme');
    const initialDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setDarkMode(initialDarkMode);
  }, []);
  
  // Handle dark mode toggle
  const handleDarkModeChange = (isDarkMode: boolean) => {
    setDarkMode(isDarkMode);
  };
  
  const handleEmailChange = (type: string) => {
    setEmailNotifications({
      ...emailNotifications,
      [type]: !emailNotifications[type as keyof typeof emailNotifications]
    });
  };
  
  const handlePushChange = (type: string) => {
    setPushNotifications({
      ...pushNotifications,
      [type]: !pushNotifications[type as keyof typeof pushNotifications]
    });
  };

  // Save settings function
  const saveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('emailNotifications', JSON.stringify(emailNotifications));
    localStorage.setItem('pushNotifications', JSON.stringify(pushNotifications));
    localStorage.setItem('language', language);
    
    // Show a success message (you could implement a toast notification here)
    alert('Settings saved successfully!');
  };

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 theme-text dashboard-heading mt-8">Settings</h1>
        
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 dashboard-card">
          <h2 className="text-xl font-bold mb-6 theme-text">Appearance</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium theme-text">Dark Mode</h3>
                <p className="text-sm theme-text-secondary">
                  Toggle between light and dark theme
                </p>
              </div>
              <div className="flex items-center">
                <label className="inline-flex relative items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={darkMode}
                    onChange={() => handleDarkModeChange(!darkMode)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-medium theme-text">Language</h3>
                <p className="text-sm theme-text-secondary">
                  Select your preferred language
                </p>
              </div>
              <div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="chinese">Chinese</option>
                  <option value="japanese">Japanese</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        {/* Notifications Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8 dashboard-card">
          <h2 className="text-xl font-bold mb-6 theme-text">Notifications</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium theme-text mb-4">Email Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Referral Activity
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive emails when someone signs up using your referral code
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailNotifications.referrals}
                      onChange={() => handleEmailChange('referrals')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Payment Notifications
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive emails for payment transactions and earnings
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailNotifications.payments}
                      onChange={() => handleEmailChange('payments')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Security Alerts
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive emails about security updates and suspicious activity
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailNotifications.security}
                      onChange={() => handleEmailChange('security')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Newsletter
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive our monthly newsletter with tips and updates
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailNotifications.newsletter}
                      onChange={() => handleEmailChange('newsletter')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Marketing Communications
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive emails about promotions and special offers
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={emailNotifications.marketing}
                      onChange={() => handleEmailChange('marketing')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium theme-text mb-4">Push Notifications</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Referral Activity
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive push notifications for referral activities
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushNotifications.referrals}
                      onChange={() => handlePushChange('referrals')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Payment Notifications
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive push notifications for payment activities
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushNotifications.payments}
                      onChange={() => handlePushChange('payments')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium theme-text">
                      Security Alerts
                    </p>
                    <p className="text-xs theme-text-secondary">
                      Receive push notifications for security alerts
                    </p>
                  </div>
                  <label className="inline-flex relative items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={pushNotifications.security}
                      onChange={() => handlePushChange('security')}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Save Settings Button */}
        <div className="flex justify-end mt-8">
          <button
            onClick={saveSettings}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-150"
          >
            Save Settings
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
} 