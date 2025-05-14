'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import ChartComponent from '../../components/ui/Chart';
import { ChartData } from 'chart.js';
import { Check, Copy, Users, BarChart3, UserCircle, Link as LinkIcon } from 'lucide-react';
import StatsCard from '../../components/StatsCard';
import CustomReferralLinkGenerator from '../../components/CustomReferralLinkGenerator';
import LogoutConfirmation from '../../components/LogoutConfirmation';

// Add custom Rupee icon component
const RupeeIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 7H9.5a3.5 3.5 0 0 0 0 7h.5"></path>
    <path d="M18 14H9"></path>
    <path d="M14 11v10"></path>
    <path d="M6 21h12"></path>
    <path d="M6 3h12"></path>
  </svg>
);

export default function ReferralPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'links'>('overview');
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referrerInfo, setReferrerInfo] = useState<any>(null);
  const [referralCode, setReferralCode] = useState<string>('Loading...');
  const [conversionData, setConversionData] = useState<{ converted: number, pending: number, abandoned: number }>({
    converted: 0,
    pending: 0,
    abandoned: 0
  });
  const [referralChartData, setReferralChartData] = useState<ChartData<'bar'>>({
    labels: [],
    datasets: [{
      label: 'Referred Users',
      data: [],
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  });
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState<string>('');
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    conversionRate: 0,
  });
  const [referralData, setReferralData] = useState<any[]>([]);
  const [detailedEarnings, setDetailedEarnings] = useState<any[]>([]); // State to store detailed earnings
  const [chartData, setChartData] = useState<ChartData<'line'>>({
    labels: [],
    datasets: [
      {
        label: 'Referrals',
        data: [],
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true
      }
    ]
  });
  const [persistentTotalEarnings, setPersistentTotalEarnings] = useState(0);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  
  // Detect dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('dashboard-theme');
    const initialDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setDarkMode(initialDarkMode);
  }, []);
  
  // Toggle dark mode handler
  const handleDarkModeChange = (isDarkMode: boolean) => {
    setDarkMode(isDarkMode);
  };
  
  // Fetch user data and set referral code
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.error("No user ID found in localStorage");
          setLoading(false);
          return;
        }

        // Fetch user data to get referral code
        const userResponse = await fetch(`/api/user/${userId}`);
        if (!userResponse.ok) {
          console.error(`Failed to fetch user data: ${userResponse.status}`);
          setLoading(false);
          return;
        }
        
        const userData = await userResponse.json();
        if (!userData || !userData.user) {
          console.error("Invalid user data structure", userData);
          setLoading(false);
          return;
        }
        
        setUserData(userData.user);
        
        // Set the referral code
        if (userData.user.referralCode) {
          setReferralCode(userData.user.referralCode);
          setReferralLink(`${window.location.origin}/signup?ref=${userData.user.referralCode}`);
        } else {
          setReferralCode('No referral code available');
        }

        // First try to fetch data from the new endpoint
        const statsResponse = await fetch(`/api/user/commission-stats/${userId}`);
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          
          if (statsData.success && statsData.stats) {
            // Update referral statistics
            setReferralStats({
              totalReferrals: statsData.stats.referrals.direct || 0,
              totalEarnings: statsData.stats.earnings.total || 0,
              conversionRate: statsData.stats.referrals.conversionRate || 0
            });
            
            // Store the total earnings in a persistent variable to maintain consistency
            setPersistentTotalEarnings(statsData.stats.earnings.total || 0);
            
            // Prepare chart data if earnings by level are available
            if (statsData.stats.earnings.byLevel && statsData.stats.earnings.byLevel.length > 0) {
              const levelLabels = statsData.stats.earnings.byLevel.map(level => `Level ${level.level}`);
              const levelData = statsData.stats.earnings.byLevel.map(level => level.amount);
              
              setChartData({
                labels: levelLabels,
                datasets: [
                  {
                    label: 'Earnings by Level',
                    data: levelData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                  }
                ]
              });
            }
            
            // Additionally fetch referrals list for the referrals tab
            const referralsResponse = await fetch(`/api/user/referrals/${userId}`);
            if (referralsResponse.ok) {
              const referralsData = await referralsResponse.json();
              
              // Set referrals data for display in the table
              if (referralsData.referrals) {
                setReferralData(referralsData.referrals);
                calculateMockConversionMetrics(referralsData.referrals);
              } else {
                setReferralData([]); // Ensure it's an empty array if null/undefined
                calculateMockConversionMetrics([]);
              }

              // Store detailed earnings data
              if (referralsData.earnings) {
                setDetailedEarnings(referralsData.earnings);
              } else {
                setDetailedEarnings([]); // Ensure it's an empty array if null/undefined
              }
              
              // Store referrer information if available
              if (referralsData.referrer) {
                setReferrerInfo(referralsData.referrer);
              }
            }
          }
        } else {
          // Fall back to the old method if the new API is not available
          await fetchReferralsOldMethod(userId);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching referral data:", error);
        setLoading(false);
        // Initialize with empty data on error
        calculateMockConversionMetrics([]);
      }
    };

    fetchUserData();
  }, []);
  
  // Add this helper function to fall back to the old method if needed
  const fetchReferralsOldMethod = async (userId) => {
    try {
      // Fetch referrals data
      const referralsResponse = await fetch(`/api/user/referrals/${userId}`);
      if (!referralsResponse.ok) {
        console.warn(`Failed to fetch referrals data: ${referralsResponse.status}`);
        calculateMockConversionMetrics([]);
        return;
      }
      
      const referralsData = await referralsResponse.json();

      // Store referrer information if available
      if (referralsData.referrer) {
        setReferrerInfo(referralsData.referrer);
      }

      // Calculate total referrals
      const totalReferrals = referralsData?.referrals?.length || 0;
      
      // Calculate active referrals
      const activeReferrals = referralsData?.referrals?.filter(ref => 
        ref.status === 'active' || ref.hasPaid || ref.paymentCompleted
      ).length || 0;
      
      // Calculate total earnings from referrals and store detailed earnings
      let totalEarnings = 0;
      if (referralsData?.earnings) {
        totalEarnings = referralsData.earnings.reduce((sum: number, earning: any) => sum + earning.amount, 0);
        setDetailedEarnings(referralsData.earnings); // Store detailed earnings in fallback
      } else {
        setDetailedEarnings([]); // Ensure empty array if no earnings
      }
      
      // Store the total earnings in a persistent variable to maintain consistency
      if (totalEarnings > 0) {
        setPersistentTotalEarnings(totalEarnings);
      }
      
      // Calculate conversion rate as percentage of active referrals to total referrals
      let conversionRate = totalReferrals > 0 ? Math.round((activeReferrals / totalReferrals) * 100) : 0;
      
      setReferralStats({
        totalReferrals,
        totalEarnings,
        conversionRate
      });

      // Process the referrals data for the conversion chart
      if (referralsData?.referrals && referralsData.referrals.length > 0) {
        // Calculate conversion data for the chart
        calculateMockConversionMetrics(referralsData.referrals);
        
        // Set referral data for table view
        setReferralData(referralsData.referrals);
      } else {
        // Initialize with empty data if no referrals
        calculateMockConversionMetrics([]);
      }

      // Prepare chart data
      if (referralsData?.referrals) {
        // Group referrals by month
        const monthlyData: { [key: string]: number } = {};
        
        referralsData.referrals.forEach((referral: any) => {
          const date = new Date(referral.createdAt);
          const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
          
          if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = 0;
          }
          monthlyData[monthYear]++;
        });
        
        const labels = Object.keys(monthlyData);
        const data = Object.values(monthlyData);
        
        setChartData({
          labels,
          datasets: [
            {
              label: 'Referrals',
              data,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              fill: true
            }
          ]
        });
      }
    } catch (error) {
      console.error("Error in fetchReferralsOldMethod:", error);
    }
  };
  
  // Function to calculate conversion metrics based on referral data
  const calculateMockConversionMetrics = (referrals: any[]) => {
    const totalReferrals = referrals.length;
    
    if (totalReferrals === 0) {
      setConversionData({
        converted: 0,
        pending: 0,
        abandoned: 0
      });
      return;
    }
    
    // Count status distribution if available in referral data
    const statusCounts = {
      active: 0,
      pending: 0,
      inactive: 0
    };
    
    // Count referrals by status
    referrals.forEach(ref => {
      const status = ref.status ? ref.status.toLowerCase() : 'active';
      
      if (status === 'active') {
        statusCounts.active++;
      } else if (status === 'pending') {
        statusCounts.pending++;
      } else {
        statusCounts.inactive++;
      }
    });
    
    // Calculate the exact conversion rate as percentage of active to total
    const converted = Math.round((statusCounts.active / totalReferrals) * 100);
    const pending = Math.round((statusCounts.pending / totalReferrals) * 100);
    
    // Make sure remaining percentage is allocated to abandoned to sum to 100%
    let abandoned = 100 - (converted + pending);
    if (abandoned < 0) abandoned = 0;
    
    // Set the conversion data for the chart
    setConversionData({
      converted,
      pending,
      abandoned
    });
  };
  
  const copyReferralCode = () => {
    if (referralCode !== 'Loading...' && referralCode !== 'No referral code available') {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const copyReferralLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Handle link generation button click
  const handleGenerateLink = () => {
    alert('Custom referral links feature is coming soon! This will allow you to track the source of your referrals.');
  };
  
  // Create tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-6">
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/90'} shadow-lg backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Referral Statistics</h3>
                <div className="h-64">
                  <ChartComponent 
                    type="line"
                    data={chartData}
                    darkMode={darkMode}
                  />
                </div>
              </div>
              
              <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/90'} shadow-lg backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className="text-lg font-semibold mb-4">Conversion Rate</h3>
                <div className="h-64 flex items-center justify-center">
                  <ChartComponent 
                    type="doughnut"
                    data={{
                      labels: ['Converted', 'Pending', 'Abandoned'],
                      datasets: [{
                        data: [conversionData.converted, conversionData.pending, conversionData.abandoned],
                        backgroundColor: [
                          'rgba(16, 185, 129, 0.7)',  // Green
                          'rgba(59, 130, 246, 0.7)',  // Blue 
                          'rgba(239, 68, 68, 0.7)',   // Red
                        ],
                        borderColor: [
                          'rgb(16, 185, 129)',
                          'rgb(59, 130, 246)',
                          'rgb(239, 68, 68)',
                        ],
                        borderWidth: 1
                      }]
                    }}
                    darkMode={darkMode}
                  />
                </div>
                <div className="text-center mt-4">
                  <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Active Referrals: {conversionData.converted}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'referrals':
        return (
          <div className={`p-5 rounded-lg ${darkMode ? 'bg-gray-800/70' : 'bg-white/90'} shadow-lg backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className="text-lg font-semibold mb-4">Your Referrals</h3>
            
            {referralData.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-100 text-blue-600">
                  <Users className="h-8 w-8" />
                </div>
                <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  No referrals yet
                </p>
                <p className={`max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  You haven't referred anyone yet. Share your referral code to start earning rewards!
                </p>
                <button 
                  onClick={() => copyReferralLink()}
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copy Referral Link
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    <span className="font-medium">Note:</span> You only earn commissions from referrals who complete their payment. 
                    Pending referrals have signed up but haven't completed payment yet.
                  </p>
                </div>
                <div className="overflow-x-auto rounded-lg">
                  <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <thead className={`text-xs uppercase ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'}`}>
                      <tr>
                        <th scope="col" className="px-4 py-3 rounded-tl-lg">User</th>
                        <th scope="col" className="px-4 py-3">Joined On</th>
                        <th scope="col" className="px-4 py-3">Status</th>
                        <th scope="col" className="px-4 py-3">Plan</th>
                        <th scope="col" className="px-4 py-3 rounded-tr-lg">Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralData.map((referral, index) => (
                        <tr key={index} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'} ${index % 2 === 0 ? darkMode ? 'bg-gray-800/50' : 'bg-gray-50/50' : ''}`}>
                          <td className="px-4 py-3 font-medium text-center">
                            <div className="flex items-center justify-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`}>
                                <UserCircle className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                              </div>
                              <span>{referral.name || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {new Date(referral.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              referral.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : referral.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {referral.status === 'active' ? 'Paid' : 
                               referral.status === 'pending' ? 'Pending Payment' : 
                               referral.status || 'Unknown'}
                            </span>
                          </td>
                          {/* Plan */}
                          <td className="px-4 py-3 text-center text-sm">
                            {referral.plan || 'N/A'} {/* Display plan or 'N/A' if not available */}
                          </td>
                          <td className="px-4 py-3 font-medium text-center">
                            <div className="flex items-center justify-center">
                              <span className={`mr-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>₹</span>
                              {referral.status === 'active' 
                                ? (
                                    detailedEarnings
                                      // Refined filter: Handle both populated and non-populated referralId, comparing as strings
                                      .filter(earning => earning.referralId && 
                                        (earning.referralId._id ? earning.referralId._id.toString() === referral._id.toString() : earning.referralId.toString() === referral._id.toString()))
                                      .reduce((sum, earning) => sum + (earning.amount || 0), 0)
                                  ).toFixed(2)
                                : <span className="text-xs text-gray-500 italic">Pending</span>
                              }
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'links':
        return <CustomReferralLinkGenerator darkMode={darkMode} />;
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <div className="container mx-auto px-4 py-6 max-w-7xl mt-8">
        {/* Header with gradient background */}
        <div className={`relative overflow-hidden rounded-2xl mb-8 mt-4 ${darkMode ? 'bg-gradient-to-r from-blue-800 to-indigo-900' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
          <div className="absolute inset-0 opacity-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="refPattern" patternUnits="userSpaceOnUse" width="60" height="60" patternTransform="scale(2) rotate(0)">
                  <path d="M10 10L50 50M50 10L10 50" stroke="white" strokeWidth="2" fill="none" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#refPattern)" />
            </svg>
          </div>
          <div className="relative p-8 md:p-10 pt-10 md:pt-14">
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Referral Program
            </h1>
            <p className="text-blue-100 max-w-2xl">
              Invite friends to join our platform and earn rewards for every successful referral. The more friends you invite, the more rewards you earn!
            </p>
          </div>
        </div>
        
        {/* Referral Code Section - Modern Card */}
        <div className={`p-6 rounded-xl mb-8 ${darkMode ? 'bg-gray-800/70' : 'bg-white/90'} shadow-lg backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-4 flex-1">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Your Referral Code
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Share this code with friends to earn rewards when they join.
              </p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralCode}
                  className={`flex-1 p-3 rounded-l-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={copyReferralCode}
                  className={`px-4 rounded-r-lg transition-colors ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
            
            <div className="space-y-4 flex-1">
              <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Referral Link
              </h2>
              <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Or share your personalized signup link:
              </p>
              <div className="flex">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className={`flex-1 p-3 rounded-l-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
                <button
                  onClick={copyReferralLink}
                  className={`px-4 rounded-r-lg transition-colors ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                  }`}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Statistics Cards - Glass morphism effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Referrals" 
            value={referralStats.totalReferrals.toString()} 
            icon={<Users className="w-6 h-6 text-blue-500" />} 
            trend={`${referralStats.conversionRate.toFixed(1)}% conversion`}
          />
          <StatsCard 
            title="Total Earnings" 
            value={`₹${persistentTotalEarnings.toFixed(2)}`} // Use Rupee symbol here
            icon={<span className="text-green-500 text-2xl font-bold">₹</span>} // Replaced RupeeIcon with standard symbol 
            trend="Lifetime earnings"
          />
          <StatsCard 
            title="Conversion Rate"
            value={`${conversionData.converted}%`}
            icon={<BarChart3 className={`h-8 w-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />}
            darkMode={darkMode}
          />
        </div>
        
        {/* Tab Navigation - Floating tab design */}
        <div className="mb-8">
          <div className={`rounded-lg p-1.5 ${darkMode ? 'bg-gray-800/60' : 'bg-gray-100/60'} backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <nav className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'overview'
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-600 shadow-md'
                    : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                Overview
              </button>
              
              <button
                onClick={() => setActiveTab('referrals')}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'referrals'
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-600 shadow-md'
                    : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                Referrals
              </button>
              
              <button
                onClick={() => setActiveTab('links')}
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'links'
                    ? darkMode
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-blue-600 shadow-md'
                    : darkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-white/80'
                }`}
              >
                Custom Links
              </button>
            </nav>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="mb-8">
          {renderTabContent()}
        </div>
        
        {/* Referrer Information Section - Moved to bottom */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800/70' : 'bg-white/90'} shadow-lg backdrop-blur-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Your Referrer
          </h2>
          
          {referrerInfo ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                <UserCircle className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              </div>
              <div className="space-y-2">
                <p className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {referrerInfo.name || 'User'}
                </p>
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {referrerInfo.email || 'Anonymous'}
                </p>
                {userData?.usedReferralCode && (
                  <div className={`inline-flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>Referral Code:</span>{' '}
                    <span className={`px-2.5 py-0.5 rounded-md text-sm ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      {userData.usedReferralCode}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center p-6">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${darkMode ? 'bg-yellow-900/20' : 'bg-yellow-100'}`}>
                <UserCircle className={`h-8 w-8 ${darkMode ? 'text-yellow-500' : 'text-yellow-600'}`} />
              </div>
              <p className={`text-lg font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Not Referred
              </p>
              <p className={`max-w-md ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                You weren't referred by another user. You discovered us on your own!
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}