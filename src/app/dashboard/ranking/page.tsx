'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import DashboardLayout from '../../components/DashboardLayout';
import Link from 'next/link';
import InviteButton from '../../components/InviteButton';

// Define ranking tiers with min referrals and commission percentages
const rankingTiers = [
  { tier: 'Bronze', minReferrals: 0, commission: 8 },
  { tier: 'Silver', minReferrals: 10, commission: 10 },
  { tier: 'Gold', minReferrals: 20, commission: 12 },
  { tier: 'Platinum', minReferrals: 30, commission: 15 },
  { tier: 'Diamond', minReferrals: 50, commission: 18 },
];

export default function RankingPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'direct' | 'multilevel' | 'earnings' | 'oldest'>('direct');
  const [rankingData, setRankingData] = useState({
    direct: [] as any[],
    multilevel: [] as any[],
    earnings: [] as any[],
    oldest: [] as any[]
  });
  const [userPosition, setUserPosition] = useState({
    direct: { position: 0, value: 0, isInTop: false },
    multilevel: { position: 0, value: 0, isInTop: false },
    earnings: { position: 0, value: 0, isInTop: false },
    oldest: { position: 0, isInTop: false }
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Detect dark mode preference
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('dashboard-theme');
    const initialDarkMode = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setDarkMode(initialDarkMode);
    
    // Get the current user ID
    const currentUserId = localStorage.getItem('userId');
    setUserId(currentUserId);
    
    // Fetch user's profile data to get referral code
    if (currentUserId) {
      fetch(`/api/user/${currentUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user) {
            setUserProfile(data.user);
          }
        })
        .catch(err => console.error('Error fetching user data:', err));
    }
  }, []);
  
  // Handle dark mode toggle
  const handleDarkModeChange = (isDarkMode: boolean) => {
    setDarkMode(isDarkMode);
  };
  
  // Fetch ranking data
  useEffect(() => {
    const fetchRankingData = async () => {
      try {
        setLoading(true);
        
        // Fetch direct referrals ranking
        const directResponse = await fetch('/api/ranking/leaderboard?type=direct');
        if (directResponse.ok) {
          const data = await directResponse.json();
          if (data.success) {
            setRankingData(prev => ({ ...prev, direct: data.leaderboard }));
          }
        }
        
        // Fetch multilevel referrals ranking
        const multilevelResponse = await fetch('/api/ranking/leaderboard?type=multilevel');
        if (multilevelResponse.ok) {
          const data = await multilevelResponse.json();
          if (data.success) {
            setRankingData(prev => ({ ...prev, multilevel: data.leaderboard }));
          }
        }
        
        // Fetch earnings ranking
        const earningsResponse = await fetch('/api/ranking/leaderboard?type=earnings');
        if (earningsResponse.ok) {
          const data = await earningsResponse.json();
          if (data.success) {
            setRankingData(prev => ({ ...prev, earnings: data.leaderboard }));
          }
        }
        
        // Fetch oldest members
        const oldestResponse = await fetch('/api/ranking/oldest-members');
        if (oldestResponse.ok) {
          const data = await oldestResponse.json();
          if (data.success) {
            setRankingData(prev => ({ ...prev, oldest: data.oldestMembers }));
          }
        }
        
        // Fetch user position if userId is available
        if (userId) {
          const userPositionResponse = await fetch(`/api/ranking/user-position?userId=${userId}`);
          if (userPositionResponse.ok) {
            const data = await userPositionResponse.json();
            if (data.success) {
              // Check if user is in top 10 for each category
              const isInTopDirect = rankingData.direct.some(user => user.userId === userId);
              const isInTopMultilevel = rankingData.multilevel.some(user => user.userId === userId);
              const isInTopEarnings = rankingData.earnings.some(user => user.userId === userId);
              const isInTopOldest = rankingData.oldest.some(user => user.userId === userId);
              
              setUserPosition({
                direct: {
                  position: data.rankings.direct.position,
                  value: data.rankings.direct.value,
                  isInTop: isInTopDirect
                },
                multilevel: {
                  position: data.rankings.multilevel.position,
                  value: data.rankings.multilevel.value,
                  isInTop: isInTopMultilevel
                },
                earnings: {
                  position: data.rankings.earnings.position,
                  value: data.rankings.earnings.value,
                  isInTop: isInTopEarnings
                },
                oldest: {
                  position: findUserOldestPosition(userId),
                  isInTop: isInTopOldest
                }
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching ranking data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRankingData();
  }, [userId]);
  
  // Find user's position in oldest members
  const findUserOldestPosition = (userId: string) => {
    const userIndex = rankingData.oldest.findIndex(user => user.userId === userId);
    return userIndex !== -1 ? userIndex + 1 : 0;
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Get active ranking data based on current tab
  const getActiveRankingData = () => {
    return rankingData[activeTab] || [];
  };
  
  // Get user position for active tab
  const getUserPositionForActiveTab = () => {
    return userPosition[activeTab] || { position: 0, value: 0, isInTop: false };
  };
  
  // Generate avatar for user (first letter of name)
  const getAvatarText = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  if (loading) {
    return (
      <DashboardLayout darkMode={darkMode}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <div className="pb-8 mt-16">
        <h1 className="text-2xl font-bold mb-6 dashboard-heading">Rankings & Leaderboard</h1>
        
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('direct')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'direct'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                Direct Referrals
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('multilevel')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'multilevel'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                Multilevel Referrals
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('earnings')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'earnings'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                Highest Earnings
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('oldest')}
                className={`inline-block p-4 rounded-t-lg ${
                  activeTab === 'oldest'
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
                    : 'hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300'
                }`}
              >
                Oldest Active Members
              </button>
            </li>
          </ul>
        </div>
        
        {activeTab !== 'oldest' ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">Multi Level Units</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  RKunits is an easy way to grow your income without having to manage jobs directly. See how your members are performing and reach to them. Nothing beats this experience.
                </p>
                <Link href="#" className="text-blue-500 hover:underline">See how it works.</Link>
              </div>
              
              {/* Top performer presentation */}
              {getActiveRankingData()[0] && (
                <div className="mb-10 border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800">
                  <div className="flex items-center mb-4">
                    <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-xl mr-4 overflow-hidden">
                      {getActiveRankingData()[0]?.photoUrl ? (
                        <Image 
                          src={getActiveRankingData()[0].photoUrl} 
                          alt={getActiveRankingData()[0].name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getAvatarText(getActiveRankingData()[0].name)
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{getActiveRankingData()[0].name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {activeTab === 'direct' && `${getActiveRankingData()[0].referrals} Direct Members`}
                        {activeTab === 'multilevel' && `${getActiveRankingData()[0].referrals} Total Members`}
                        {activeTab === 'earnings' && `${formatCurrency(getActiveRankingData()[0].earnings)}`} 
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(getActiveRankingData()[0].earnings)}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-sm">Paid to you</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-semibold">Level 2:</span> {getActiveRankingData()[0]?.level2Count || 0} members
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">Level 3:</span> {getActiveRankingData()[0]?.level3Count || 0} members
                    </div>
                  </div>
                </div>
              )}
              
              {/* Multi-level referral tree */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 p-6 mb-6">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold">{getActiveRankingData()[0]?.level2Count || 0}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">Level 2</span>
                  </div>
                  <div>
                    <span className="text-lg font-bold">{getActiveRankingData()[0]?.level3Count || 0}</span>
                    <span className="text-gray-600 dark:text-gray-400 ml-1">Level 3</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-green-600">{formatCurrency(getActiveRankingData()[0]?.earnings || 0)}</span>
                    <div className="text-gray-600 dark:text-gray-400 text-sm">Paid to you</div>
                  </div>
                </div>
                
                {/* Referral tree visualization */}
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <div className="flex items-start">
                      {/* Root user (You) */}
                      <div className="flex flex-col items-center mr-8">
                        <div className="h-[50px] w-8 flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                          </div>
                        </div>
                        <div className="h-full border-l-2 border-gray-300 dark:border-gray-600 my-1"></div>
                      </div>
                      
                      {/* Level 1 */}
                      <div className="flex-1">
                        {getActiveRankingData()[0]?.childReferrals?.map((childUser, index) => (
                          <div key={childUser.userId} className="mb-6 last:mb-0">
                            <div className="flex items-start">
                              <div className="flex flex-col items-center mr-4">
                                <div className="h-[50px] flex items-center">
                                  <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                </div>
                                <div className="h-full border-l-2 border-gray-300 dark:border-gray-600 my-1"></div>
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold mr-3 overflow-hidden">
                                    {childUser.photoUrl ? (
                                      <Image 
                                        src={childUser.photoUrl} 
                                        alt={childUser.name}
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      getAvatarText(childUser.name)
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{childUser.name}</div>
                                    <div className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                      <div>{childUser.referrals} Members</div>
                                    </div>
                                  </div>
                                  <div className="ml-auto text-right">
                                    <div className="font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(childUser.earnings)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Level 2+ connections */}
                                {childUser.children && childUser.children.length > 0 && (
                                  <div className="pl-8 mt-2">
                                    {childUser.children.map((grandchild) => (
                                      <div key={grandchild.userId} className="flex items-center mb-2 last:mb-0">
                                        <div className="flex flex-col items-center mr-4">
                                          <div className="h-[24px] flex items-center">
                                            <div className="w-8 h-0.5 bg-gray-300 dark:bg-gray-600"></div>
                                          </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-sm mr-3 overflow-hidden">
                                          {grandchild.photoUrl ? (
                                            <Image 
                                              src={grandchild.photoUrl} 
                                              alt={grandchild.name}
                                              width={32}
                                              height={32}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            getAvatarText(grandchild.name)
                                          )}
                                        </div>
                                        <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">
                                          {grandchild.name}
                                        </div>
                                        <div className="ml-auto text-right">
                                          <div className="font-medium text-green-600 dark:text-green-400 text-sm">
                                            {formatCurrency(grandchild.earnings)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Top Performers Sidebar */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
                <div className="text-right text-gray-500 dark:text-gray-400 mb-4">
                  Paid to You
                </div>
                
                <div className="space-y-4">
                  {getActiveRankingData().slice(0, 5).map((user: any, index: number) => (
                    <div key={user.userId} className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-lg mr-3 overflow-hidden">
                          {user.photoUrl ? (
                            <Image 
                              src={user.photoUrl} 
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getAvatarText(user.name)
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {activeTab === 'direct' && `${user.referrals} Members`}
                            {activeTab === 'multilevel' && `${user.referrals} Total Members`}
                            {activeTab === 'earnings' && formatCurrency(user.earnings)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(user.earnings)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Invite Member Button */}
                <div className="mt-6">
                  {userId && userProfile?.referralCode ? (
                    <InviteButton referralCode={userProfile.referralCode} darkMode={darkMode} />
                  ) : (
                    <button 
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center cursor-not-allowed opacity-70"
                      disabled
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Loading Referral Info...
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <h2 className="text-xl font-bold mb-6">Oldest Active Members</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                These are our most loyal members who have been with us the longest.
              </p>
              
              <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow-md mb-8 border border-gray-200 dark:border-gray-700">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left">Rank</th>
                      <th className="px-4 py-3 text-left">Name</th>
                      <th className="px-4 py-3 text-left">Member Since</th>
                      <th className="px-4 py-3 text-right">Paid to You</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.oldest.map((user: any, index: number) => (
                      <tr 
                        key={user.userId}
                        className={`border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 ${
                          user.userId === userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <span className="text-lg font-semibold mr-2">{index + 1}</span>
                            {user.userId === userId && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-lg mr-3 overflow-hidden">
                              {user.photoUrl ? (
                                <Image 
                                  src={user.photoUrl} 
                                  alt={user.name}
                                  width={40}
                                  height={40}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                getAvatarText(user.name)
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.referrals} Members
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {user.memberSince}
                        </td>
                        <td className="px-4 py-4 text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(user.earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Top Performers Sidebar for Oldest Members */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-6">
                <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
                <div className="text-right text-gray-500 dark:text-gray-400 mb-4">
                  Paid to You
                </div>
                
                <div className="space-y-4">
                  {rankingData.oldest.slice(0, 5).map((user: any) => (
                    <div key={user.userId} className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-lg mr-3 overflow-hidden">
                          {user.photoUrl ? (
                            <Image 
                              src={user.photoUrl} 
                              alt={user.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            getAvatarText(user.name)
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Member since {user.memberSince}
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(user.earnings)}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Invite Member Button */}
                <div className="mt-6">
                  {userId && userProfile?.referralCode ? (
                    <InviteButton referralCode={userProfile.referralCode} darkMode={darkMode} />
                  ) : (
                    <button 
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center cursor-not-allowed opacity-70"
                      disabled
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Loading Referral Info...
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 