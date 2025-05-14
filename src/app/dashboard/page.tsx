'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import ChartComponent from '../components/ui/Chart';
import { ChartData } from 'chart.js';
import DashboardGuard from '../components/DashboardGuard';
import Image from 'next/image';
import { Sun, Moon, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { clearAuthData } from '@/lib/auth-utils';
import LogoutConfirmation from '../components/LogoutConfirmation';

// Move the Components that use useSearchParams to a separate component
function DashboardContent() {
  const searchParams = useSearchParams();
  const [userName, setUserName] = useState<string>('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [referralData, setReferralData] = useState<ReferralData>({
    referrals: [],
    referredBy: null
  });
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  
  // Add these state variables for the enhanced referral list
  const [filteredReferrals, setFilteredReferrals] = useState<ReferredUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'email' | 'createdAt'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // New state variables for tabbed interfaces
  const [activeReferralCodeTab, setActiveReferralCodeTab] = useState<'code' | 'generator'>('code');
  const [activeReferralDataTab, setActiveReferralDataTab] = useState<'list' | 'network' | 'referrer'>('list');
  const [viewMode, setViewMode] = useState<'data' | 'graph'>('data');
  
  // Add state for earnings data
  const [earningsTotal, setEarningsTotal] = useState<number>(0);
  const [loadingEarnings, setLoadingEarnings] = useState(true);
  
  const router = useRouter();
  
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Apply styles to ensure text visibility and handle theme
  useEffect(() => {
    // Check if user prefers dark mode or had it enabled previously
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('dashboard-theme');
    const initialDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setDarkMode(initialDarkMode);
    
    // Apply the theme to the document
    document.documentElement.classList.toggle('dark', initialDarkMode);
    
    // Apply styles to ensure text visibility in inputs and content
    const style = document.createElement('style');
    style.innerHTML = `
      input, textarea, select { color: black !important; background-color: white !important; }
      .dashboard-content { color: black !important; }
      .dashboard-heading { color: #1f2937 !important; }
      .dashboard-card { color: #111827 !important; }
      
      .dark input, .dark textarea, .dark select { color: white !important; background-color: #1f2937 !important; }
      .dark .dashboard-content { color: #e5e7eb !important; }
      .dark .dashboard-heading { color: #f3f4f6 !important; }
      .dark .dashboard-card { color: #f9fafb !important; }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.setItem('dashboard-theme', newDarkMode ? 'dark' : 'light');
  };

  // Define fetchReferralData first with useCallback
  const fetchReferralData = useCallback(async (userId: string | null) => {
    if (!userId) return;
    
    try {
      setLoadingReferrals(true);
      const response = await fetch(`/api/user/referrals/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch referral data');
      }
      
      const data = await response.json();
      setReferralData(data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setLoadingReferrals(false);
    }
  }, []);

  // Then define fetchUserData with useCallback, after fetchReferralData
  const fetchUserData = useCallback(async () => {
    try {
      // Get userId from localStorage or query params
      const userId = localStorage.getItem('userId') || searchParams.get('userId');
      
      console.log('Dashboard - userId from localStorage or params:', userId);
      
      if (!userId) {
        console.error('No user ID found');
        setLoading(false);
        
        // Check if we have a name parameter to at least show a welcome message
        const nameParam = searchParams.get('name');
        if (nameParam) {
          setUserName(nameParam);
        }
        
        // Set some default data to avoid crashing
        setUserData({
          name: nameParam || 'User',
          email: '',
          referralCode: searchParams.get('referenceCode') || '',
          status: 'active'
        });
        
        // Check local storage for edge case where it might be stored in a different format
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          console.log(`LocalStorage check - Key ${i}: ${key}, Value: ${localStorage.getItem(key)}`);
        }
        
        return;
      }
      
      const response = await fetch(`/api/user/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }
      
      const data = await response.json();
      console.log('Dashboard - User data from API:', data.user); // Debug log to see if photoUrl is present
      setUserData(data.user);
      setUserName(data.user.name);
      
      // After fetching user data, fetch referral data - userId is guaranteed to be a string at this point
      if (typeof userId === 'string') {
        fetchReferralData(userId);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Handle error by showing fallback data
      setUserData(prevData => ({
        ...prevData,
        name: userName || 'User',
        status: 'active',
        referralCode: searchParams.get('referenceCode') || (prevData?.referralCode || '')
      }) as UserData);
    } finally {
      setLoading(false);
    }
  }, [searchParams, userName, fetchReferralData]);
  
  const copyToClipboard = () => {
    if (!userData?.referralCode) return;
    
    navigator.clipboard.writeText(userData.referralCode)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  useEffect(() => {
    // Fetch user data including reference code
    fetchUserData();
    
    // Check if photo was updated
    const photoUpdated = localStorage.getItem('photoUpdated');
    if (photoUpdated === 'true') {
      // Clear the flag
      localStorage.removeItem('photoUpdated');
      
      // Force refetch user data to get the updated photo
      const refetchTimerId = setTimeout(() => {
        console.log('Photo was updated, refetching user data...');
        fetchUserData();
      }, 1000); // Small delay to ensure DB update is complete
      
      return () => clearTimeout(refetchTimerId);
    }
    
    // Check if we have a welcome parameter, name, or isReturning
    const welcome = searchParams.get('welcome');
    const name = searchParams.get('name');
    const referralCodeParam = searchParams.get('referenceCode');
    const isReturning = searchParams.get('returning') === 'true';
    
    // If we have a reference code in the URL, update the state
    if (referralCodeParam) {
      setUserData(prevData => ({
        ...prevData,
        referralCode: referralCodeParam
      }) as UserData);
    }
    
    // Only show welcome message for first-time or explicit welcome parameter
    if (welcome === 'true') {
      // If we have a name parameter, use it
      if (name) {
        setUserName(name);
      }
      
      setShowWelcome(true);
      
      // Auto-hide welcome message after 5 seconds
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, fetchUserData]);
  
  // Add a useEffect to filter and sort referrals whenever dependencies change
  useEffect(() => {
    if (!referralData.referrals) return;
    
    let result = [...referralData.referrals];
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(lowerSearchTerm) || 
        user.email.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      if (sortField === 'createdAt') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        const valueA = (a[sortField] || '').toLowerCase();
        const valueB = (b[sortField] || '').toLowerCase();
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
    });
    
    setFilteredReferrals(result);
  }, [referralData.referrals, searchTerm, sortField, sortDirection]);
  
  // Function to toggle sort direction
  const handleSort = (field: 'name' | 'email' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Add a function to fetch earnings data
  const fetchUserEarnings = useCallback(async (userId: string | null) => {
    if (!userId) return;
    
    try {
      setLoadingEarnings(true);
      const response = await fetch(`/api/user/earnings/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setEarningsTotal(data.totalEarnings || 0);
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
    } finally {
      setLoadingEarnings(false);
    }
  }, []);

  // Modify the useEffect to also fetch earnings
  useEffect(() => {
    if (userData && userData._id) {
      const userId = userData._id;
      fetchReferralData(userId);
      fetchUserEarnings(userId);
    }
  }, [userData, fetchReferralData, fetchUserEarnings]);
  
  return (
    <DashboardGuard>
      <DashboardLayout darkMode={darkMode} onDarkModeChange={toggleDarkMode}>
        {/* Custom header for dashboard only */}
        <div className="flex justify-between items-center mb-8 theme-bg-primary rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <span className={`font-bold text-xl theme-text`}>
              Welcome, <span className="text-sky-600">
                {userName || 'User'}
              </span>
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleDarkMode}
              className={`p-2 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700/60 text-yellow-300 hover:bg-gray-700/80' 
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }`}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => setShowLogoutConfirmation(true)}
              className={`p-2 w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700/60 text-red-400 hover:bg-gray-700/80 hover:text-red-300' 
                  : 'bg-sky-100 text-red-600 hover:bg-sky-200 hover:text-red-700'
              }`}
              aria-label="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Welcome banner - different for new vs returning users */}
        {showWelcome && (
          <div className="mb-6 p-4 rounded-lg bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 animation-fadeout">
            {searchParams.get('welcome') === 'true' && !searchParams.get('returning') ? (
              <>
                <h2 className="text-lg font-semibold">Welcome, {userName}! 🎉</h2>
                <p>Your account has been successfully created. Start exploring your dashboard now!</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Hello, {userName}! 👋</h2>
                <p>Welcome back to your dashboard.</p>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Stats Card */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 dashboard-heading">Dashboard Overview</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-sky-50 dark:bg-blue-900/30 p-4 rounded-lg border border-sky-100 dark:border-blue-800/30 shadow-sm">
                <h3 className="text-sm text-sky-700 dark:text-blue-300 font-medium">Total Earnings</h3>
                {loadingEarnings ? (
                  <p className="text-2xl font-bold text-sky-800 dark:text-blue-200">—</p>
                ) : (
                  <p className="text-2xl font-bold text-sky-800 dark:text-blue-200">₹{earningsTotal.toFixed(2)}</p>
                )}
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800/30 shadow-sm">
                <h3 className="text-sm text-green-700 dark:text-green-300 font-medium">Referrals</h3>
                <p className="text-2xl font-bold text-green-800 dark:text-green-200">{referralData.referrals.length}</p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30 shadow-sm">
                <h3 className="text-sm text-purple-700 dark:text-purple-300 font-medium">Rank</h3>
                {referralData.referrals.length >= 120 ? (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">Diamond</p>
                ) : referralData.referrals.length >= 95 ? (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">Platinum</p>
                ) : referralData.referrals.length >= 75 ? (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">Gold</p>
                ) : referralData.referrals.length >= 50 ? (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">Silver</p>
                ) : referralData.referrals.length >= 10 ? (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">Bronze</p>
                ) : (
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">—</p>
                )}
              </div>
            </div>
            
            {/* Chart */}
            <div className="h-64 w-full">
              <EarningsChart userId={userData?._id || null} darkMode={darkMode} />
            </div>
          </div>
          
          {/* User Profile Card */}
          <div className="col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold dashboard-heading">Your Profile</h2>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
            
            <div className="flex flex-col items-center mb-4">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-2 overflow-hidden">
                {userData?.photoUrl ? (
                  <Image 
                    src={userData.photoUrl}
                    alt={userData?.name || 'User'}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                    priority
                    unoptimized={userData.photoUrl.startsWith('/uploads/')} // Skip optimization for local images
                  />
                ) : (
                  userData?.name?.charAt(0) || 'U'
                )}
              </div>
              <h3 className="text-lg font-semibold dashboard-card">{userData?.name || 'User'}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{userData?.email || 'user@example.com'}</p>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Referral Code</h3>
              <div className="flex">
                <input
                  type="text"
                  value={userData?.referralCode || ''}
                  readOnly
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none sm:text-sm"
                />
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none"
                >
                  {copySuccess ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4 dashboard-heading">Referral Network</h2>
          
          <ReferralNetworkStats 
            userId={userData?._id || null} 
            darkMode={darkMode}
            viewMode={viewMode}
          />
        </div>

        {/* Logout Confirmation Dialog */}
        <LogoutConfirmation 
          isOpen={showLogoutConfirmation} 
          onClose={() => setShowLogoutConfirmation(false)}
          darkMode={darkMode}
        />
      </DashboardLayout>
    </DashboardGuard>
  );
}

function EarningsChart({ userId, darkMode }: { userId: string | null; darkMode: boolean }) {
  const [earningsData, setEarningsData] = useState<{ labels: string[], datasets: any[] }>({
    labels: [],
    datasets: []
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (userId) {
      fetchEarningsData();
    } else {
      setIsLoading(false);
    }
  }, [userId]);
  
  async function fetchEarningsData() {
    setIsLoading(true);
    
    try {
      // Fetch actual data from API
      const response = await fetch(`/api/user/earnings/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch earnings data');
      }
      
      const data = await response.json();
      
      if (data.chartData && data.chartData.length > 0) {
        // Transform the API data into chart format
        const labels = data.chartData.map((item: any) => {
          const date = new Date(item.date);
          // Format date as month for display
          return new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
        });
        
        // Create dataset for total earnings
        const totalEarnings = data.chartData.map((item: any) => item.total || 0);
        
        // Create dataset for referral earnings
        const referralEarnings = data.chartData.map((item: any) => (item.referral || 0) + (item.commission || 0));
        
        const chartData: ChartData<'line'> = {
          labels,
          datasets: [
            {
              label: 'Total Earnings',
              data: totalEarnings,
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Referral Earnings',
              data: referralEarnings,
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        };
        
        setEarningsData(chartData);
      } else {
        // No chart data available, set empty state
        setEarningsData({
          labels: [],
          datasets: [
            {
              label: 'Total Earnings',
              data: [],
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            },
            {
              label: 'Referral Earnings',
              data: [],
              borderColor: '#8b5cf6',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching earnings data:', error);
      // Set empty chart data on error
      setEarningsData({
        labels: [],
        datasets: []
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading chart data...</div>;
  }
  
  if (!userId || earningsData.labels.length === 0) {
    return <div className="flex justify-center items-center h-full text-gray-500 dark:text-gray-400">No earnings data available</div>;
  }
  
  return (
    <ChartComponent 
      type="line" 
      data={earningsData} 
      darkMode={darkMode} 
      height="250px"
      options={{
        plugins: {
          title: {
            display: true,
            text: 'Monthly Earnings',
            color: darkMode ? '#e5e7eb' : '#374151',
            font: {
              size: 16,
              weight: 'bold'
            }
          }
        }
      }}
    />
  );
}

function ReferralNetworkStats({ userId, darkMode, viewMode = 'data' }: { userId: string | null; darkMode: boolean; viewMode?: 'data' | 'graph' }) {
  const [networkData, setNetworkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchReferralNetworkData() {
      // Use the passed userId prop instead of localStorage
      if (!userId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/user/referrals/tree/${userId}?format=stats`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch referral network data');
        }
        
        const data = await response.json();
        setNetworkData(data);
      } catch (error) {
        console.error('Error fetching referral network data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchReferralNetworkData();
  }, [userId]);
  
  if (loading) {
    return <div className="flex justify-center items-center h-24">Loading referral data...</div>;
  }
  
  // Prepare chart data
  const chartData: ChartData<'bar'> = {
    labels: ['Direct Referrals', 'Indirect Referrals'],
    datasets: [
      {
        label: 'Referrals',
        data: [networkData.summary.directReferrals, networkData.summary.indirectReferrals],
        backgroundColor: [
          'rgba(59, 130, 246, 0.7)',  // Blue for direct
          'rgba(139, 92, 246, 0.7)'   // Purple for indirect
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 1
      }
    ]
  };
  
  if (viewMode === 'graph') {
    return (
      <div className="flex flex-col">
        <div className="self-end mb-4">
          <button 
            onClick={() => setViewMode('data')}
            className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md text-sm"
          >
            Show Stats
          </button>
        </div>
        
        <div className="h-80">
          <ChartComponent 
            type="bar" 
            data={chartData} 
            darkMode={darkMode} 
            height="300px"
            options={{
              plugins: {
                title: {
                  display: true,
                  text: 'Referral Breakdown',
                  color: darkMode ? '#e5e7eb' : '#374151',
                  font: {
                    size: 16,
                    weight: 'bold'
                  }
                }
              }
            }}
          />
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setViewMode('graph')}
          className={`px-3 py-1 ${
            darkMode 
              ? 'bg-gray-700 text-gray-200' 
              : 'bg-sky-100 text-sky-800'
          } rounded-md text-sm`}
        >
          Show Graph
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-sky-50 dark:bg-blue-900/30 p-4 rounded-lg">
          <h3 className="text-sm text-sky-700 dark:text-blue-300 font-medium">Total Referrals</h3>
          <p className="text-2xl font-bold text-sky-800 dark:text-blue-200">{networkData.summary.totalReferrals}</p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
          <h3 className="text-sm text-purple-700 dark:text-purple-300 font-medium">Direct Referrals</h3>
          <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{networkData.summary.directReferrals}</p>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
          <h3 className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Indirect Referrals</h3>
          <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">{networkData.summary.indirectReferrals}</p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
          <h3 className="text-sm text-green-700 dark:text-green-300 font-medium">Conversion Rate</h3>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">{networkData.summary.conversionRate}%</p>
        </div>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2 dashboard-heading">Recent Referrals</h3>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg overflow-hidden">
          {networkData.data && networkData.data.length > 0 && networkData.data[0].users && networkData.data[0].users.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {networkData.data[0].users
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((referral: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-3">
                      {referral.name.charAt(0)}
                    </div>
                    <span className="dashboard-card">{referral.name}</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(referral.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No recent referrals to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Interface definitions
interface UserData {
  name: string;
  email: string;
  referralCode: string;
  status: string;
  photoUrl?: string;
}

interface ReferredUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface ReferrerUser {
  _id: string;
  name: string;
  email: string;
}

interface ReferralData {
  referrals: ReferredUser[];
  referredBy: ReferrerUser | null;
}

// Main component that wraps DashboardContent in a Suspense boundary
export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
} 