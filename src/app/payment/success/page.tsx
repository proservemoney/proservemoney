'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { setAuthData } from '@/lib/auth-utils';

// Content component with searchParams
function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Get the payment token and userId
  const paymentToken = searchParams.get('token');
  const userId = searchParams.get('userId');

  // Verify the payment token and activate the user account
  useEffect(() => {
    // Validate parameters
    if (!paymentToken && !userId) {
      console.error('Missing both required parameters');
      setError('Invalid payment session - missing required parameters');
      setVerifying(false);
      return;
    }
    
    // Allow the success page to work with just userId if token is missing
    if (!paymentToken) {
      console.warn('Payment token missing, but userId present - proceeding with caution');
    }
    
    // Allow the success page to work with just token if userId is missing
    if (!userId) {
      console.warn('UserId missing, but payment token present - proceeding with caution');
      setError('User ID missing - authentication may fail');
      setVerifying(false);
      return;
    }
    
    // Check if userId is valid MongoDB ObjectId format (24 hex characters)
    if (userId === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Invalid userId format:', userId);
      setError('Invalid user ID format');
      setVerifying(false);
      return;
    }
    
    // Store user ID in localStorage immediately, even before verifying the payment
    // This ensures we have it available regardless of API call outcome
    try {
      console.log('Storing userId in localStorage (immediately):', userId);
      
      // Use multiple storage methods for redundancy
      localStorage.setItem('userId', userId);
      sessionStorage.setItem('userId', userId);
      document.cookie = `userId=${userId}; path=/; max-age=2592000; SameSite=Strict`;
      
      // Add a global variable as last resort
      (window as any).userAuthenticated = userId;
      
      // Verify it was stored correctly
      const storedId = localStorage.getItem('userId');
      console.log('Verified stored userId (immediately):', storedId);
      
      if (!storedId) {
        console.error('Failed to store userId in localStorage - attempting fallback');
        // Try an alternative approach with setTimeout
        setTimeout(() => {
          localStorage.setItem('userId', userId);
          sessionStorage.setItem('userId', userId);
          document.cookie = `userId=${userId}; path=/; max-age=2592000; SameSite=Strict`;
          console.log('Attempted userId storage via setTimeout');
        }, 100);
      }
    } catch (err) {
      console.error('Error storing userId in localStorage:', err);
    }
    
    const verifyPayment = async () => {
      try {
        setVerifying(true);
        
        if (!paymentToken) {
          console.log('No payment token available, skipping verification and proceeding to dashboard');
          
          // Store authentication data using utility function
          setAuthData(userId);
          
          // Wait longer to ensure auth data is saved
          setTimeout(() => {
            window.location.href = '/dashboard?welcome=true';
          }, 3000);
          
          return;
        }
        
        console.log('Verifying payment with token and userId:', { token: paymentToken, userId });
        
        // Call the API to activate the account
        const response = await fetch('/api/payment/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: paymentToken,
            userId,
          }),
        });

        const data = await response.json();
        console.log('Activation response:', data);

        // Handle various response scenarios
        if (!response.ok) {
          // If payment was already processed, treat it as success
          if (data.message && data.message.includes('Payment already processed')) {
            console.log('Payment was already processed, treating as success');
            
            // Store authentication data again to be sure
            setAuthData(userId);
            
            // Add a delay before redirect to ensure localStorage is updated
            setTimeout(() => {
              // Use window.location for a full page reload
              window.location.href = '/dashboard?welcome=true';
            }, 3000);
            
            return;
          }
          throw new Error(data.message || 'Account activation failed');
        }

        // Account successfully activated
        // Set auth data in multiple ways to ensure it's stored
        console.log('Storing userId after payment success:', userId);
        
        // First try normal auth data setting
        setAuthData(userId);
        
        // Then verify it was stored correctly
        const storedId = localStorage.getItem('userId');
        console.log('Verified stored userId after setAuthData:', storedId);
        
        if (!storedId) {
          // If storage failed, try direct approaches
          try {
            localStorage.setItem('userId', userId);
            sessionStorage.setItem('userId', userId);
            document.cookie = `userId=${userId}; path=/; max-age=2592000; SameSite=Strict`;
            console.log('Fallback 1: Direct localStorage and cookie setting');
            
            // Add a global variable as last resort
            (window as any).userAuthenticated = userId;
          } catch (storageError) {
            console.error('Error with direct storage approach:', storageError);
          }
        }

        // Prepare redirect params
        let referralCodeParam = '';
        if (data.referralCode) {
          setReferralCode(data.referralCode);
          referralCodeParam = `&referralCode=${data.referralCode}`;
        }
        
        // Add a delay before redirecting to ensure auth data is properly saved
        // Increased from 2000ms to 3000ms to ensure proper saving
        setTimeout(() => {
          console.log('Redirecting to dashboard after successful payment');
          // Use window.location for a full page reload instead of router.push
          window.location.href = `/dashboard?welcome=true${referralCodeParam}`;
        }, 3000);
        
        setVerifying(false);
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        console.error("Activation error:", error);
        setError(error.message || 'Account activation failed');
        setVerifying(false);
        
        // Even if activation fails, try to direct user to dashboard if we have userId
        if (userId) {
          console.log('Activation failed but attempting to redirect to dashboard with userId');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 5000);
        }
      }
    };

    verifyPayment();
  }, [paymentToken, userId, router]);

  // Show error state if verification fails
  if (error) {
    // Special case for "Payment already processed" to show as success
    if (error.includes('Payment already processed')) {
      // Redirect to success view with auto-redirect to login
      return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" 
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80")', 
            backgroundSize: 'cover'
          }}
        >
          {/* Background overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-800/85 to-blue-600/85 z-0"></div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md w-full bg-white bg-opacity-95 backdrop-blur-sm p-10 rounded-xl shadow-2xl z-10 border border-green-100 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative"
            >
              <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              
              {/* Celebratory animation */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="absolute"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], top: [0, -30], left: [-20, -40] }}
                  transition={{ delay: 0.6, duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute w-4 h-4 bg-yellow-400 rounded-full"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], top: [0, -40], left: [20, 30] }}
                  transition={{ delay: 0.8, duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute w-3 h-3 bg-blue-400 rounded-full"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0], top: [0, -20], left: [10, 40] }}
                  transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute w-2 h-2 bg-purple-400 rounded-full"
                />
              </motion.div>
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-3xl font-bold text-gray-800 mb-2"
            >
              <span className="text-green-600">Success!</span> Payment Complete!
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-lg text-gray-700 mb-6"
            >
              Your account has been successfully activated and is ready to use.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 text-left"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span className="font-semibold text-gray-800">Account Status: Active</span>
              </div>
              {referralCode && (
                <div className="flex items-start mt-2">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  <div>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-800">Your Referral Code:</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(referralCode);
                          alert('Referral code copied to clipboard!');
                        }} 
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center">
                      <span className="font-mono bg-gray-100 text-blue-600 font-bold px-2 py-1 rounded text-lg">{referralCode}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Share this code with others to refer them to our service</p>
                  </div>
                </div>
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mb-6"
            >
              <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.7, duration: 5 }}
                  className="h-1 bg-blue-600 rounded-full"
                ></motion.div>
              </div>
              <p className="text-sm text-gray-600">
                Redirecting to dashboard in 5 seconds...
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <Link href="/dashboard" className="inline-flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition duration-150 ease-in-out">
                Go to Dashboard Now
              </Link>
            </motion.div>
          </motion.div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80")', 
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/85 to-blue-600/85 z-0"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white bg-opacity-95 backdrop-blur-sm p-10 rounded-xl shadow-2xl z-10 border border-red-100 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
            className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-3xl font-bold text-gray-800 mb-2"
          >
            Verification Failed
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-lg text-gray-700 mb-8"
          >
            {error}
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="space-y-4"
          >
            <Link href="/signup" className="inline-flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition duration-150 ease-in-out">
              Return to Signup
            </Link>
            
            <div>
              <button 
                onClick={() => router.back()}
                className="mt-4 text-blue-600 hover:text-blue-800 transition duration-150 ease-in-out"
              >
                Try payment again
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Show loading state while verifying
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" 
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80")', 
          backgroundSize: 'cover'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-800/85 to-blue-600/85 z-0"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full bg-white bg-opacity-95 backdrop-blur-sm p-10 rounded-xl shadow-2xl z-10 border border-blue-100 text-center"
        >
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16">
              <svg className="animate-spin w-full h-full text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Activating Your Account
          </h2>
          
          <p className="text-lg text-gray-700 mb-8">
            Please wait while we verify your payment and set up your account...
          </p>
        </motion.div>
      </div>
    );
  }

  // Default success view (shown after verification completes)
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" 
      style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80")', 
        backgroundSize: 'cover'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-800/85 to-blue-600/85 z-0"></div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white bg-opacity-95 backdrop-blur-sm p-10 rounded-xl shadow-2xl z-10 border border-green-100 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 relative"
        >
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          
          {/* Celebratory animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="absolute"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], top: [0, -30], left: [-20, -40] }}
              transition={{ delay: 0.6, duration: 1, repeat: Infinity, repeatDelay: 3 }}
              className="absolute w-4 h-4 bg-yellow-400 rounded-full"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], top: [0, -40], left: [20, 30] }}
              transition={{ delay: 0.8, duration: 1, repeat: Infinity, repeatDelay: 3 }}
              className="absolute w-3 h-3 bg-blue-400 rounded-full"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0, 1.3, 0], top: [0, -20], left: [10, 40] }}
              transition={{ delay: 1, duration: 1, repeat: Infinity, repeatDelay: 3 }}
              className="absolute w-2 h-2 bg-purple-400 rounded-full"
            />
          </motion.div>
        </motion.div>
        
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-3xl font-bold text-gray-800 mb-2"
        >
          <span className="text-green-600">Success!</span> Payment Complete!
        </motion.h2>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-lg text-gray-700 mb-6"
        >
          Your account has been successfully activated and is ready to use. Your payment has been processed.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6 text-left"
        >
          <div className="flex items-center mb-1">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-semibold text-gray-800">Payment Status: Completed</span>
          </div>
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
            <span className="font-semibold text-gray-800">Account Status: Active</span>
          </div>
          {referralCode && (
            <div className="flex items-start mt-2">
              <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              <div>
                <div className="flex items-center">
                  <span className="font-semibold text-gray-800">Your Referral Code:</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(referralCode);
                      alert('Referral code copied to clipboard!');
                    }} 
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="Copy to clipboard"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                  </button>
                </div>
                <div className="flex items-center">
                  <span className="font-mono bg-gray-100 text-blue-600 font-bold px-2 py-1 rounded text-lg">{referralCode}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">Share this code with others to refer them to our service</p>
              </div>
            </div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-6"
        >
          <div className="h-1 w-full bg-gray-200 rounded-full mb-2">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ delay: 0.7, duration: 5 }}
              className="h-1 bg-blue-600 rounded-full"
            ></motion.div>
          </div>
          <p className="text-sm text-gray-600">
            Redirecting to dashboard in 5 seconds...
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <Link href="/dashboard" className="inline-flex justify-center py-3 px-6 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition duration-150 ease-in-out">
            Go to Dashboard Now
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Main component
export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="p-4 rounded-lg bg-white shadow-md">
        <p className="text-lg font-bold">Loading payment status...</p>
      </div>
    </div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
} 