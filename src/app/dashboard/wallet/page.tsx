'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { PlusIcon, ArrowDownIcon, ArrowUpIcon, InfoIcon, RedoIcon } from 'lucide-react';
import TransactionTable from '../../components/TransactionTable';
import StatsCard from '../../components/StatsCard';
import { formatCurrency } from '../../lib/utils';
import PageTitle from '../../components/ui/PageTitle';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

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

export default function WalletPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [monthlyData, setMonthlyData] = useState({
    labels: [],
    values: []
  });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('bank');
  const [withdrawStatus, setWithdrawStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [tab, setTab] = useState('overview');
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [balanceHistoryData, setBalanceHistoryData] = useState<any>(null);

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

  useEffect(() => {
    const fetchWalletData = async () => {
      setLoading(true);
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.error("No user ID found");
          setLoading(false);
          return;
        }

        // Fetch user data to get wallet balance
        const userResponse = await fetch(`/api/user/${userId}`);
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData && userData.user) {
            setWalletBalance(userData.user.walletBalance || 0);
          }
        } else {
          console.error(`Failed to fetch user data: ${userResponse.status}`);
        }

        // Fetch earnings data
        await fetchEarningsData(userId);
        
        // Fetch withdrawals data
        await fetchWithdrawalsData(userId);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching wallet data:", error);
        setLoading(false);
      }
    };

    fetchWalletData();
  }, []);

  const fetchEarningsData = async (userId) => {
    try {
      const earningsResponse = await fetch(`/api/user/earnings/${userId}`);
      if (earningsResponse.ok) {
        const earningsData = await earningsResponse.json();
        
        if (earningsData && earningsData.earnings) {
          const earnings = earningsData.earnings; // This is actually referral/commission earnings
          
          // Use the totalEarnings provided by the API
          setTotalEarnings(earningsData.totalEarnings || 0);
          
          // Calculate commission total based on the filtered earnings list
          const commission = earnings
            .filter(earning => earning.source === 'commission')
            .reduce((sum, earning) => sum + earning.amount, 0);
          setCommissionTotal(commission);
          
          // Process transactions for table
          const earningTransactions = earnings.map(earning => ({
            id: earning._id,
            date: new Date(earning.createdAt),
            description: earning.description || `Earning from ${earning.source}`,
            amount: earning.amount,
            status: earning.status,
            type: 'earning',
            source: earning.source
          }));
          
          setTransactions(prev => [...earningTransactions, ...prev]);
          setTotalTransactions(prev => prev + earningTransactions.length);
          
          // Process data for the chart
          processChartData(earningTransactions, []);
        }
      } else if (earningsResponse.status === 404) {
        console.log("No earnings data found for user");
      } else {
        console.error(`Failed to fetch earnings: ${earningsResponse.status}`);
      }
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    }
  };

  const fetchWithdrawalsData = async (userId) => {
    try {
      const withdrawalsResponse = await fetch(`/api/user/withdrawals/${userId}`);
      if (withdrawalsResponse.ok) {
        const withdrawalsData = await withdrawalsResponse.json();
        
        if (withdrawalsData && withdrawalsData.withdrawals) {
          const withdrawals = withdrawalsData.withdrawals;
          
          // Process transactions for table
          const withdrawalTransactions = withdrawals.map(withdrawal => ({
            id: withdrawal._id,
            date: new Date(withdrawal.createdAt),
            description: withdrawal.description || 'Withdrawal',
            amount: -withdrawal.amount, // negative amount for withdrawals
            status: withdrawal.status,
            type: 'withdrawal'
          }));
          
          setTransactions(prev => [...prev, ...withdrawalTransactions]);
          setTotalTransactions(prev => prev + withdrawalTransactions.length);
          
          // Update chart data with withdrawals
          processChartData([], withdrawalTransactions);
        }
      } else if (withdrawalsResponse.status === 404) {
        console.log("No withdrawals data found for user");
      } else {
        console.error(`Failed to fetch withdrawals: ${withdrawalsResponse.status}`);
      }
    } catch (error) {
      console.error("Error fetching withdrawals data:", error);
    }
  };

  const processChartData = (earnings, withdrawals) => {
    // Combine all transactions
    const allTransactions = [...earnings, ...withdrawals].sort((a, b) => a.date - b.date);
    
    if (allTransactions.length === 0) {
      return;
    }
    
    // Group by month
    const monthlyTotals = {};
    let runningBalance = 0;
    
    allTransactions.forEach(transaction => {
      const date = transaction.date;
      const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      runningBalance += transaction.amount;
      
      if (!monthlyTotals[monthYear]) {
        monthlyTotals[monthYear] = runningBalance;
      } else {
        monthlyTotals[monthYear] = runningBalance;
      }
    });
    
    // Convert to arrays for chart
    const labels = Object.keys(monthlyTotals);
    const values = Object.values(monthlyTotals);
    
    setMonthlyData({
      labels,
      values
    });
  };

  const handleWithdraw = async () => {
    // Validate amount
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setWithdrawStatus({
        success: false,
        message: 'Please enter a valid amount'
      });
      return;
    }

    // Check if user has enough balance
    if (walletBalance < parseFloat(withdrawAmount)) {
      setWithdrawStatus({
        success: false,
        message: 'Insufficient balance'
      });
      return;
    }

    setIsWithdrawing(true);
    setWithdrawStatus(null);

    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/user/withdrawals/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          method: withdrawMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setWithdrawStatus({
          success: true,
          message: 'Withdrawal request submitted successfully'
        });
        
        // Update wallet balance
        setWalletBalance(prev => prev - parseFloat(withdrawAmount));
        
        // Add the new transaction to the list
        const newTransaction = {
          id: Date.now().toString(),
          type: 'withdrawal',
          amount: parseFloat(withdrawAmount),
          status: 'pending',
          date: new Date().toISOString(),
          description: `Withdrawal via ${withdrawMethod}`,
        };
        
        setTransactions(prev => [...prev, newTransaction]);
        setTotalTransactions(prev => prev + 1);

        // Close modal after 2 seconds
        setTimeout(() => {
          setShowWithdrawModal(false);
          setWithdrawAmount('');
          setWithdrawStatus(null);
        }, 2000);
      } else {
        setWithdrawStatus({
          success: false,
          message: data.message || 'Failed to process withdrawal'
        });
      }
    } catch (error) {
      console.error('Withdrawal error:', error);
      setWithdrawStatus({
        success: false,
        message: 'An error occurred while processing your withdrawal'
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Format currency with proper INR symbol and fixed decimal places
  const formatCurrency = (amount) => {
    return `₹${amount.toFixed(2)}`;
  };

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <div className="container mx-auto p-4 mt-4">
        <PageTitle title="Wallet" />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Balance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <StatsCard
                title="Wallet Balance"
                value={formatCurrency(walletBalance)}
                description="Available for withdrawal"
                icon={<RupeeIcon className="h-5 w-5" />}
              />
              <StatsCard
                title="Commission Earned"
                value={formatCurrency(commissionTotal)}
                description="From referrals"
                icon={<RupeeIcon className="h-5 w-5" />}
              />
              <StatsCard
                title="Total Transactions"
                value={totalTransactions.toString()}
                description="Earnings & Withdrawals"
                icon={<ArrowUpIcon className="h-5 w-5" />}
              />
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6">
              <Button className="flex-1" variant="outline" onClick={() => setShowWithdrawModal(true)}>
                <ArrowUpIcon className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </div>
            
            {/* Transactions */}
            <Card className="dashboard-card">
              <CardHeader>
                <CardTitle className="theme-text">Transaction History</CardTitle>
                <CardDescription className="theme-text-secondary">
                  Your recent account activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all">
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="earnings">Earnings</TabsTrigger>
                    <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all">
                    <TransactionTable 
                      transactions={transactions} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="earnings">
                    <TransactionTable 
                      transactions={transactions.filter(t => t.type === 'earning')} 
                    />
                  </TabsContent>
                  
                  <TabsContent value="withdrawals">
                    <TransactionTable 
                      transactions={transactions.filter(t => t.type === 'withdrawal')} 
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md theme-bg-primary">
            <h3 className="text-xl font-semibold mb-4 theme-text">Withdraw Funds</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full"
                />
              </div>
              <div>
                <Label htmlFor="method">Withdrawal Method</Label>
                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select withdrawal method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {withdrawStatus && (
                <div className={`p-3 rounded-md ${withdrawStatus.success ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                  {withdrawStatus.message}
                </div>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setWithdrawStatus(null);
                    setWithdrawAmount('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  {isWithdrawing ? (
                    <>
                      <RedoIcon className="mr-2 h-4 w-4 animate-spin" /> Processing
                    </>
                  ) : (
                    'Withdraw'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}