'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setAuthData } from '@/lib/auth-utils';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingRedirect, setProcessingRedirect] = useState(false);

  // Two-factor authentication states
  const [showTwoFactorForm, setShowTwoFactorForm] = useState(false);
  const [twoFactorVerificationCode, setTwoFactorVerificationCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'sms' | 'email'>('sms');
  const [userId, setUserId] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorDestination, setTwoFactorDestination] = useState('');
  const [sendingCode, setSendingCode] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      // For debugging
      console.log('Login response status:', response.status);
      console.log('Login response data:', data);
      
      if (response.status === 402) {
        // Payment required
        setProcessingRedirect(true);
        
        // Log the userId for debugging
        console.log('Raw userId from API:', data.userId);
        
        // Validate the user ID - make sure it exists and is a string
        if (!data.userId) {
          setError('Missing user ID. Please try signing up again.');
          setProcessingRedirect(false);
          return;
        }
        
        // Convert to string in case it's an object
        const userIdStr = data.userId.toString();
        console.log('User ID as string:', userIdStr);
        
        // Validate the user ID format (24 hex characters for MongoDB ObjectId)
        if (!/^[0-9a-fA-F]{24}$/.test(userIdStr)) {
          console.error('Invalid userId format:', userIdStr);
          setError('Invalid user ID format. Please try signing up again.');
          setProcessingRedirect(false);
          return;
        }
        
        // Always redirect to address page regardless of whether we have previous data
        // This allows the user to choose their plan and update address if needed
        setError('Please complete your address details and select a plan...');
        
        // Construct URL parameters for the address page
        const addressParams = data.addressData || {};
        const planParams = data.planData || {};
        
        // Use the string version of userId for the URL
        const redirectUrl = `/signup/details?userId=${encodeURIComponent(userIdStr)}&email=${encodeURIComponent(formData.email)}&continueRegistration=true&address=${encodeURIComponent(addressParams.address || '')}&city=${encodeURIComponent(addressParams.city || '')}&state=${encodeURIComponent(addressParams.state || '')}&pincode=${encodeURIComponent(addressParams.pincode || '')}&country=${encodeURIComponent(addressParams.country || '')}&planId=${planParams.planId || ''}`;
        
        console.log('Redirecting to:', redirectUrl);
        
        // Redirect to address details page with user info
        router.push(redirectUrl);
        
        return;
      }
      
      if (!response.ok && response.status !== 200) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      // Check if two-factor authentication is required
      if (data.requiresTwoFactor) {
        console.log('2FA required, showing 2FA form');
        setLoading(false);
        
        // Set the user ID and method for 2FA verification
        setUserId(data.userId);
        setTwoFactorMethod(data.twoFactorMethod || 'sms');
        
        // Show the 2FA form
        setShowTwoFactorForm(true);
        
        // Send the verification code automatically
        sendTwoFactorCode(data.userId, data.twoFactorMethod || 'sms');
        
        return;
      }
      
      // Only proceed with login if 2FA is not required
      handleLoginSuccess(data);
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred');
      setProcessingRedirect(false);
      setLoading(false);
    }
  };
  
  // Helper function to handle successful login
  const handleLoginSuccess = (data: any) => {
      // Login successful - store user ID in localStorage if available
      if (data.user && data.user.id) {
        setAuthData(data.user.id.toString());
        console.log('User ID stored for authentication:', data.user.id.toString());
      }

      // Redirect to dashboard with user's name and returning=true parameter
      if (data.user && data.user.name) {
        router.push(`/dashboard?welcome=true&name=${encodeURIComponent(data.user.name)}&returning=true`);
      } else {
        router.push('/dashboard?returning=true');
      }
  };
  
  // Function to send 2FA verification code
  const sendTwoFactorCode = async (userIdToUse: string, method: 'sms' | 'email') => {
    try {
      setSendingCode(true);
      setTwoFactorError('');
      
      console.log('Sending 2FA code to user:', userIdToUse, 'via', method);
      
      const response = await fetch('/api/auth/send-2fa-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToUse
        }),
      });
      
      const data = await response.json();
      console.log('2FA code send response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      // Set the masked email/phone to display to the user
      if (method === 'email' && data.email) {
        setTwoFactorDestination(data.email);
      } else if (method === 'sms' && data.phone) {
        setTwoFactorDestination(data.phone);
      }
      
    } catch (err: unknown) {
      console.error('Error sending 2FA code:', err);
      const error = err as Error;
      setTwoFactorError(error.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };
  
  // Function to verify 2FA code
  const handleTwoFactorSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setTwoFactorLoading(true);
      setTwoFactorError('');
      
      // Validate the code
      if (!twoFactorVerificationCode || twoFactorVerificationCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit verification code');
      }
      
      console.log('Verifying 2FA code for user:', userId);
      
      const response = await fetch('/api/auth/verify-2fa-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: twoFactorVerificationCode
        }),
      });
      
      const data = await response.json();
      console.log('2FA verification response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify code');
      }
      
      // Handle successful verification
      handleLoginSuccess(data);
      
    } catch (err: unknown) {
      console.error('Error verifying 2FA code:', err);
      const error = err as Error;
      setTwoFactorError(error.message || 'Failed to verify code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const renderTwoFactorForm = () => {
    return (
      <div className="space-y-6 mt-8">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg text-blue-800">
          <div className="flex">
            <svg className="h-6 w-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Two-Factor Authentication Required</p>
              <p className="mt-1 text-sm">
                For your security, we need to verify your identity. We've sent a verification code to your {twoFactorMethod === 'email' ? 'email' : 'phone'}.
              </p>
              {twoFactorDestination && (
                <p className="mt-1 text-sm font-medium">
                  {twoFactorMethod === 'email' 
                    ? `Email: ${twoFactorDestination}`
                    : `Phone: ${twoFactorDestination}`
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 mb-1">
              Verification Code
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                id="verification-code"
                value={twoFactorVerificationCode}
                onChange={(e) => setTwoFactorVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="pl-10 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md border-gray-300"
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={twoFactorLoading}
                autoFocus
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Enter the 6-digit code sent to your {twoFactorMethod}.</p>
          </div>
          
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all"
              disabled={twoFactorLoading || twoFactorVerificationCode.length !== 6}
            >
              {twoFactorLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify & Sign In'
              )}
            </button>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => sendTwoFactorCode(userId, twoFactorMethod)}
              disabled={sendingCode}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
            >
              {sendingCode ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend Code
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowTwoFactorForm(false);
                setTwoFactorVerificationCode('');
                setTwoFactorError('');
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-stretch bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Left Panel - Brand & Decorative Area */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10 z-0"></div>
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-indigo-900/60 to-transparent z-0"></div>
        
        {/* Enhanced animated elements */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-indigo-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-40 w-32 h-32 bg-blue-300 rounded-full opacity-20 animate-pulse" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-60 left-10 w-24 h-24 bg-indigo-400 rounded-full opacity-20 animate-pulse" style={{animationDelay: '0.7s'}}></div>
        
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMxLjIgMCAyLjEuOSAyLjEgMi4xdjE5LjhjMCAxLjItLjkgMi4xLTIuMSAyLjFIMTguMWMtMS4yIDAtMi4xLS45LTIuMS0yLjFWMjAuMWMwLTEuMi45LTIuMSAyLjEtMi4xaDE3Ljh6TTU0IDU4YzEuMiAwIDIuMS0uOSAyLjEtMi4xVjM2LjFjMC0xLjItLjktMi4xLTIuMS0yLjFIMzYuMWMtMS4yIDAtMi4xLjktMi4xIDIuMXYxOS44YzAgMS4yLjkgMi4xIDIuMSAyLjFINTR6TTM2IDBjMS4yIDAgMi4xLjkgMi4xIDIuMXYxOS44YzAgMS4yLS45IDIuMS0yLjEgMi4xSDE4LjFjLTEuMiAwLTIuMS0uOS0yLjEtMi4xVjIuMUMxNiAuOSAxNi45IDAgMTguMSAwSDF6TTIgMzZjMS4yIDAgMi4xLjkgMi4xIDIuMXYxOS44YzAgMS4yLS45IDIuMS0yLjEgMi4xaC0xN2MtMS4xIDAtMi0uOS0yLTIuMVYzOC4yYzAtMS4yLjktMi4xIDIuMS0yLjEiIGZpbGw9IiNmZmYiIG9wYWNpdHk9IjAuMDUiLz48L2c+PC9zdmc+')] opacity-20 z-0"></div>
        
        <div className="relative z-10">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mr-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-0">ProServeMoney</h1>
              <p className="text-blue-200 text-lg">Secure financial management platform</p>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 space-y-8 mt-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Welcome back!</h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              Access your account to manage your financial services, view reports, and track your payment status.
            </p>
            
            <div className="mt-6 flex items-center space-x-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-sm font-medium text-blue-100">Secure connection</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-blue-100">Payments</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
              </svg>
              <span className="text-xs font-medium text-blue-100">Analytics</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20">
              <svg className="w-8 h-8 text-white mb-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-14a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V4z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-blue-100">History</span>
            </div>
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-blue-200 flex items-center justify-between mt-8">
          <span>© 2023 ProServeMoney. All rights reserved.</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </div>
      
      {/* Mobile header - only visible on mobile */}
      <div className="md:hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-4 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="text-white">
          <h1 className="text-xl font-bold">ProServeMoney</h1>
          <p className="text-xs text-blue-100">Secure financial platform</p>
        </div>
      </div>
      
      {/* Right Panel - Login Form or 2FA Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-white md:bg-transparent py-8 px-4">
        <div className="max-w-md w-full p-8 md:p-10 space-y-8 bg-white rounded-2xl shadow-xl border border-gray-100">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="rounded-full p-3 bg-gradient-to-r from-blue-600 to-indigo-700 shadow-xl transform transition-all hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showTwoFactorForm 
                    ? "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    : "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"} />
                </svg>
              </div>
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {showTwoFactorForm ? 'Verification Required' : 'Welcome back'}
            </h2>
            <p className="mt-3 text-gray-600">
              {showTwoFactorForm 
                ? `For your security, we need to verify your identity` 
                : 'Sign in to access your account'}
            </p>
          </div>
          
          {/* Error display for login */}
          {!showTwoFactorForm && error && (
            <div className={`${processingRedirect ? 'bg-blue-50 border-blue-500' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-md shadow-sm animate-fade-in-down`}>
              <div className="flex items-center">
                {processingRedirect ? (
                  <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="h-5 w-5 mr-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
                <p className={`${processingRedirect ? 'text-blue-600' : 'text-red-600'} font-medium`}>{error}</p>
              </div>
            </div>
          )}
          
          {/* 2FA error display */}
          {showTwoFactorForm && twoFactorError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
              <div className="flex items-center">
                <svg className="h-5 w-5 mr-3 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-red-600 font-medium">{twoFactorError}</p>
              </div>
            </div>
          )}
          
          {/* Conditional rendering of either login form or 2FA form */}
          {!showTwoFactorForm ? (
            // Login Form
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="input-text pl-10 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md border-gray-300 bg-white text-black"
                    placeholder="you@example.com"
                    style={{ color: 'black', backgroundColor: 'white' }}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="flex justify-between text-sm font-medium text-gray-700">
                  <span>Password</span>
                  <Link href="/forgot-password" className="font-semibold text-blue-600 hover:text-blue-500">
                    Forgot password?
                  </Link>
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-text pl-10 focus:ring-blue-500 focus:border-blue-500 block w-full rounded-md border-gray-300 bg-white text-black"
                    placeholder="••••••••"
                    style={{ color: 'black', backgroundColor: 'white' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-start">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                  disabled={processingRedirect}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me for 30 days
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-base font-medium rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all transform hover:translate-y-[-1px] active:translate-y-[1px]"
                disabled={loading || processingRedirect}
              >
                {loading || processingRedirect ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {loading ? 'Signing in...' : 'Redirecting...'}
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Sign in 
                    <svg className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </button>
            </div>
          </form>
          ) : (
            // Two-Factor Authentication Form
            renderTwoFactorForm()
          )}
          
          <div className="text-center pt-4">
            <div className="mt-6 flex items-center justify-center">
              <span className="bg-gray-300 h-px flex-grow mr-3"></span>
              <span className="text-sm text-gray-500 font-medium">OR</span>
              <span className="bg-gray-300 h-px flex-grow ml-3"></span>
            </div>
            
            <p className="mt-6 text-sm text-gray-600">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                Create an account
              </Link>
            </p>
            
            <div className="mt-8 flex justify-center space-x-4">
              <div className="p-2 bg-gray-100 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 15a7 7 0 100-14 7 7 0 000 14zm-1.024-8.025a.566.566 0 01-.8 0L6.7 7.5a.566.566 0 01.8-.8l1.1 1.1 3.9-3.9a.566.566 0 01.8.8l-4.324 4.275z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-2 bg-gray-100 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="p-2 bg-gray-100 rounded-full">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-1 0a7 7 0 11-14 0 7 7 0 0114 0zm-7.536 2.95a.75.75 0 001.072 0l3.236-3.236a.75.75 0 00-1.06-1.06l-2.689 2.69-1.11-1.111a.75.75 0 10-1.06 1.06l1.64 1.646.001.001.009.01z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <p className="mt-6 text-xs text-gray-500">
              By signing in, you agree to our 
              <a href="#" className="text-blue-600 hover:underline ml-1">Terms of Service</a>
              <span className="mx-1">and</span>
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 