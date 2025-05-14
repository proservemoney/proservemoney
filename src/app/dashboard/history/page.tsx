'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';

export default function HistoryPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [activityFilter, setActivityFilter] = useState('all');
  
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
  
  // Fetch user activity history
  useEffect(() => {
    const fetchActivityHistory = async () => {
      try {
        setLoading(true);
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.error('No user ID found');
          setLoading(false);
          return;
        }
        
        // Fetch user's activity history
        const response = await fetch(`/api/user/activity/${userId}`);
        
        // If API endpoint is not implemented yet, show sample data
        if (!response.ok) {
          console.warn('Activity API endpoint not available, using placeholder data');
          // Placeholder data
          setActivityHistory([
            { id: 1, activity: 'Login', date: new Date().toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' },
            { id: 2, activity: 'Dashboard Visit', date: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' }
          ]);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.activities)) {
          setActivityHistory(data.activities.map((activity: any, index: number) => ({
            id: activity._id || index + 1,
            activity: activity.type || 'Unknown',
            date: activity.createdAt || new Date().toISOString(),
            ip: activity.ip || '-',
            device: activity.device || 'Unknown'
          })));
        } else {
          // Fallback to placeholder data if API response is invalid
          setActivityHistory([
            { id: 1, activity: 'Login', date: new Date().toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' },
            { id: 2, activity: 'Dashboard Visit', date: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching activity history:', error);
        // Set placeholder data on error
        setActivityHistory([
          { id: 1, activity: 'Login', date: new Date().toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' },
          { id: 2, activity: 'Dashboard Visit', date: new Date(Date.now() - 86400000).toISOString(), ip: '192.168.1.1', device: 'Chrome on Windows' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivityHistory();
  }, []);
  
  // Filter activities by type
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setActivityFilter(e.target.value);
  };
  
  // Filtered activities based on selected filter
  const filteredActivities = activityFilter === 'all' 
    ? activityHistory 
    : activityHistory.filter(activity => activity.activity.toLowerCase().includes(activityFilter.toLowerCase()));
  
  if (loading) {
    return (
      <DashboardLayout darkMode={darkMode}>
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading activity history...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <h1 className="text-2xl font-bold mb-6 dashboard-heading mt-16">Activity History</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold dashboard-heading">Recent Activities</h2>
            
            <div className="flex space-x-2">
              <select 
                value={activityFilter}
                onChange={handleFilterChange}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                <option value="all">All Activities</option>
                <option value="login">Login</option>
                <option value="referral">Referral</option>
                <option value="payment">Payment</option>
                <option value="profile">Profile</option>
              </select>
              
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                Export
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {filteredActivities.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Activity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredActivities.map((activity) => (
                  <tr key={activity.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800 dark:text-gray-200">
                      {activity.activity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {new Date(activity.date).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {activity.ip}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-gray-200">
                      {activity.device}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex justify-center items-center p-8">
              <p className="text-gray-500 dark:text-gray-400">No activity history found</p>
            </div>
          )}
        </div>
        
        {filteredActivities.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing <span className="font-medium">{filteredActivities.length}</span> of <span className="font-medium">{activityHistory.length}</span> activities
            </div>
            
            <div className="flex space-x-2">
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 disabled:opacity-50"
                disabled={activityHistory.length <= 10}>
                Previous
              </button>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
                disabled={activityHistory.length <= 10}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 