'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Main component with searchParams
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [expiryTimestamp, setExpiryTimestamp] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const amount = searchParams.get('amount');
  const gstAmount = searchParams.get('gstAmount');
  const planId = searchParams.get('planId');
  
  // Get individual address fields
  const addressParam = searchParams.get('address');
  const city = searchParams.get('city');
  const state = searchParams.get('state');
  const pincode = searchParams.get('pincode');
  const country = searchParams.get('country');

  // Payment token - will be null if user hasn't verified payment yet
  const paymentToken = searchParams.get('token') || searchParams.get('paymentToken');

  // Handle JSON string if that's what we're getting
  let address = addressParam;
  let cityValue = city;
  let stateValue = state;
  let pincodeValue = pincode;
  let countryValue = country;

  // Format remaining time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // On load, verify that we have a valid session and start countdown
  useEffect(() => {
    // If URL has a token, proceed with validation
    if (paymentToken && userId) {
      console.log('Payment page loaded with token, proceeding with validation');
      checkTokenValidity();
    } else if (userId) {
      // No token but we have a userId, so initialize payment
      console.log('Payment page loaded without token, initializing payment');
      handleInitPayment();
    } else {
      // No token and no userId, redirect to login
      console.log('Payment page loaded without userId, redirecting to login');
      router.push('/login');
    }

    // Cleanup timer on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Check token validity and get remaining time
  const checkTokenValidity = async () => {
    if (!paymentToken || !userId) return;
    
    try {
      console.log('Checking token validity:', { paymentToken, userId });
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: paymentToken, userId }),
      });
      
      const data = await response.json();
      console.log('Token validity response:', { status: response.status, data });
      
      if (!response.ok) {
        // Check if token is expired
        if (data.expired) {
          setError('Your payment session has expired. Redirecting to login...');
          // Redirect to login after 5 seconds
          setTimeout(() => {
            router.push('/login');
          }, 5000);
        } else {
          setError(data.message || 'Payment verification failed');
        }
        return;
      }
      
      // Update remaining time
      if (data.remainingTime) {
        setTimeLeft(data.remainingTime);
      }
      
      // Save expiry timestamp
      if (data.expiresAt) {
        setExpiryTimestamp(data.expiresAt);
      }
      
    } catch (error) {
      console.error('Error verifying payment token:', error);
    }
  };

  // Start the countdown when we have an expiration timestamp
  useEffect(() => {
    if (!expiryTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiryTimestamp - now) / 1000));
      
      setTimeLeft(secondsLeft);
      
      // If timer reaches zero, redirect to login
      if (secondsLeft === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setError('Your payment session has expired. Redirecting to login...');
        
        setTimeout(() => {
          router.push('/login');
        }, 5000);
      }
    };

    // Update immediately then set interval
    updateTimer();
    
    // Use a more reliable timer with a faster refresh rate (500ms instead of 1000ms)
    timerRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [expiryTimestamp, router]);

  // Initialize payment and get a token with expiration time
  const handleInitPayment = async () => {
    try {
      setLoading(true);
      
      // Validate the user ID before initialization
      if (!userId || userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID. Please try logging in again.');
      }
      
      console.log('Initializing payment with userId:', userId);
      
      const response = await fetch('/api/payment/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          email,
          address: {
            address,
            city: cityValue,
            state: stateValue,
            pincode: pincodeValue,
            country: countryValue
          },
          amount,
          gstAmount,
          planId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize payment');
      }
      
      // Update the page with the token and expiry
      if (data.token && data.expiresAt) {
        setExpiryTimestamp(data.expiresAt);
        router.push(`/payment?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(email || '')}&amount=${amount}&gstAmount=${gstAmount}&planId=${planId}&address=${encodeURIComponent(address || '')}&city=${encodeURIComponent(cityValue || '')}&state=${encodeURIComponent(stateValue || '')}&pincode=${encodeURIComponent(pincodeValue || '')}&country=${encodeURIComponent(countryValue || '')}&token=${data.token}`);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check that we have the required userId
      if (!userId) {
        throw new Error('Missing user ID. Please try logging in again.');
      }
      
      // Additional validation to ensure userId is valid
      if (userId === 'undefined' || userId === 'null') {
        throw new Error('Invalid user ID. Please try logging in again.');
      }
      
      console.log('Processing payment with userId:', userId);
      
      // Verify token is still valid before processing payment
      const verifyResponse = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          token: paymentToken,
          userId 
        }),
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Payment verification response:', { status: verifyResponse.status, data: verifyData });
      
      if (!verifyResponse.ok) {
        if (verifyData.expired) {
          setError('Your payment session has expired. Redirecting to login...');
          setTimeout(() => {
            router.push('/login');
          }, 5000);
        } else {
          throw new Error(verifyData.message || 'Payment verification failed');
        }
        return;
      }
      
      // Simulate payment processing (in a real app, you'd integrate with a payment gateway)
      const paymentId = 'PMT' + Date.now().toString();
      
      // Call our payment completion endpoint
      console.log('Calling payment completion endpoint with:', { userId, planId, amount, gstAmount, paymentId });
      const completeResponse = await fetch('/api/payment/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planId,
          planAmount: amount,
          gstAmount,
          paymentId,
          paymentMethod: 'card'
        }),
      });
      
      const completeData = await completeResponse.json();
      console.log('Payment completion response:', { status: completeResponse.status, data: completeData });
      
      if (!completeResponse.ok) {
        throw new Error(completeData.message || 'Failed to complete payment');
      }
      
      // Update user's payment status
      console.log('Updating user payment status');
      const updateResponse = await fetch('/api/user/update-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          paymentId,
          paymentStatus: 'completed',
          planId
        }),
      });
      
      if (!updateResponse.ok) {
        console.warn('Payment recorded but user status update failed. Will be resolved on next login.');
      }
      
      // Redirect to success page
      console.log('Payment successful, redirecting to success page');
      router.push(`/payment/success?userId=${userId}&planId=${planId}`);
      
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'An error occurred during payment');
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md border border-red-100">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-800">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition duration-150 ease-in-out"
          >
            Go Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-xl w-full max-w-lg border border-gray-200">
        <div className="flex justify-between items-center mb-8">
          <div className="rounded-full bg-blue-50 p-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          
          {timeLeft !== null && (
            <div className="text-center">
              <div className="text-sm font-medium text-gray-500">Payment session expires in:</div>
              <div className={`text-xl font-bold ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} style={{ color: timeLeft < 60 ? '#dc2626' : '#2563eb' }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          )}
        </div>
        
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">Complete Your Payment</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Order Summary</h2>
          <div className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-100">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-gray-700 font-medium">Plan Amount:</p>
                <p className="text-lg font-semibold text-gray-800">₹{amount}</p>
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-gray-700 font-medium">GST (18%):</p>
                <p className="text-gray-800 font-semibold">{amount && gstAmount ? `₹${Number(gstAmount) - Number(amount)}` : ''}</p>
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                <p className="text-gray-800 font-semibold">Total Amount:</p>
                <p className="text-xl font-bold text-blue-700">₹{gstAmount}</p>
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-blue-200">
              <p className="font-medium text-gray-800">Account Details:</p>
              <p className="text-gray-700 mt-1">
                <span className="font-medium">Email:</span> {email}
              </p>
            </div>
            
            <div className="mt-5 pt-4 border-t border-blue-200">
              <p className="font-medium text-gray-800 mb-2">Shipping Address:</p>
              {address && address !== "undefined" && <p className="text-gray-700 font-medium">{address}</p>}
              {(cityValue || stateValue || pincodeValue) && (
                <p className="text-gray-700">
                  {cityValue && cityValue !== "undefined" && cityValue}
                  {stateValue && stateValue !== "undefined" && `, ${stateValue}`} 
                  {pincodeValue && pincodeValue !== "undefined" && ` ${pincodeValue}`}
                </p>
              )}
              {countryValue && countryValue !== "undefined" && <p className="text-gray-700">{countryValue}</p>}
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Payment Method</h2>
          <p className="text-gray-700 mb-4">Select your preferred payment method:</p>
          
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <label className="flex items-center space-x-3 cursor-pointer p-4">
                <input type="radio" name="payment" className="form-radio h-5 w-5 text-blue-600" defaultChecked />
                <div>
                  <span className="text-gray-800 font-semibold">Credit/Debit Card</span>
                  <p className="text-gray-500 text-sm">Pay securely using your card</p>
                </div>
                <div className="ml-auto flex space-x-2">
                  <svg className="w-8 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="4" fill="#1434CB" />
                    <path d="M18.9005 30.5972H14.0939V17.5316H18.9005V30.5972Z" fill="white" />
                    <path d="M14.5517 24.0644C14.5517 21.3348 15.7564 18.9577 17.5356 17.5316C16.4769 16.7368 15.1446 16.2644 13.7005 16.2644C9.86108 16.2644 6.75 19.3755 6.75 24.0644C6.75 28.7532 9.86108 31.8644 13.7005 31.8644C15.1446 31.8644 16.4769 31.3919 17.5356 30.5972C15.7564 29.2 14.5517 26.7939 14.5517 24.0644Z" fill="#F9A51A" />
                    <path d="M41.25 24.0644C41.25 28.7532 38.1389 31.8644 34.2994 31.8644C32.8554 31.8644 31.5231 31.3919 30.4644 30.5972C32.2725 29.1711 33.4483 26.7939 33.4483 24.0644C33.4483 21.3348 32.2436 18.9577 30.4644 17.5316C31.5231 16.7368 32.8554 16.2644 34.2994 16.2644C38.1389 16.2644 41.25 19.4044 41.25 24.0644Z" fill="#ED0006" />
                    <path d="M33.448 24.0644C33.448 26.7939 32.2433 29.171 30.464 30.5971C28.6847 29.171 27.48 26.7939 27.48 24.0644C27.48 21.3348 28.6847 18.9577 30.464 17.5316C32.2433 18.9577 33.448 21.3348 33.448 24.0644Z" fill="#FF5E00" />
                  </svg>
                  <svg className="w-8 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="4" fill="#2566AF" />
                    <path d="M19.9333 31.3984L21.9238 16.6016H25.7952L23.8047 31.3984H19.9333Z" fill="white" />
                    <path d="M36.2866 16.9492C35.4246 16.6016 34.156 16.2539 32.6293 16.2539C28.7579 16.2539 25.9673 18.3281 25.9386 21.332C25.9098 23.5781 27.9578 24.8555 29.5133 25.6016C31.0976 26.3477 31.6023 26.8359 31.6023 27.5234C31.5736 28.5586 30.344 29.0469 29.1719 29.0469C27.5016 29.0469 26.6396 28.7578 25.3423 28.2109L24.7228 27.957L24.0746 31.3398C25.0806 31.8281 26.9273 32.2344 28.8316 32.2344C32.9163 32.2344 35.6493 30.1602 35.6781 26.9766C35.7069 25.1602 34.6146 23.8242 32.3366 22.7891C30.9529 22.043 30.1194 21.5547 30.1194 20.8086C30.1481 20.1211 30.9529 19.4336 32.5656 19.4336C33.9204 19.4336 34.9263 19.7227 35.7599 20.043L36.1896 20.2734L36.8379 16.9492H36.2866Z" fill="white" />
                    <path d="M41.25 16.6016H38.383C37.5494 16.6016 36.9011 16.8906 36.5289 17.8086L31.4303 31.3984H35.5059L36.296 29.0469H40.8599L41.3536 31.3984H45L41.25 16.6016ZM37.348 25.957C37.638 25.2109 38.8962 21.7383 38.8962 21.7383C38.8674 21.7969 39.2109 20.8789 39.4115 20.2734L39.7262 21.5508C39.7262 21.5508 40.5022 25.3516 40.6453 25.957H37.348Z" fill="white" />
                    <path d="M15.1406 16.6016L11.2692 26.7461L10.9258 25.3516C10.236 23.2773 8.16145 20.9727 5.8125 19.7227L9.36987 31.3984H13.474L19.9333 16.6016H15.1406Z" fill="white" />
                    <path d="M8.67516 16.6016H2.72688L2.67812 16.8906C7.12828 18.0234 10.0347 21.3906 11.1558 25.3516L9.94232 17.8086C9.74167 16.8906 9.28991 16.6016 8.67516 16.6016Z" fill="#FAA61A" />
                  </svg>
                </div>
              </label>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <label className="flex items-center space-x-3 cursor-pointer p-4">
                <input type="radio" name="payment" className="form-radio h-5 w-5 text-blue-600" />
                <div>
                  <span className="text-gray-800 font-semibold">UPI</span>
                  <p className="text-gray-500 text-sm">Pay directly from your bank account</p>
                </div>
                <div className="ml-auto flex space-x-2">
                  <svg className="w-8 h-5" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="48" height="48" rx="4" fill="white" />
                    <path d="M14.9741 9.36099L24.0097 22.2942L33.0007 9.36099H14.9741Z" fill="#097939" />
                    <path d="M34.7037 38.6471L25.6682 25.7139L16.6772 38.6471H34.7037Z" fill="#ED752E" />
                  </svg>
                </div>
              </label>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
              <label className="flex items-center space-x-3 cursor-pointer p-4">
                <input type="radio" name="payment" className="form-radio h-5 w-5 text-blue-600" />
                <div>
                  <span className="text-gray-800 font-semibold">Net Banking</span>
                  <p className="text-gray-500 text-sm">Use your online banking credentials</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        
        <button
          onClick={handlePayment}
          disabled={loading || timeLeft === 0}
          className={`w-full ${
            timeLeft === 0 
              ? 'bg-gray-400 cursor-not-allowed' 
              : loading ? 'bg-blue-600' : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:-translate-y-0.5 animate-pulse'
          } text-white text-lg font-bold py-4 px-4 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-300 transition duration-150 ease-in-out shadow-lg transform`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.824 3-2.647z"></path>
              </svg>
              Processing Payment...
            </span>
          ) : timeLeft === 0 ? (
            'Session Expired'
          ) : (
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Complete Payment - ₹{gstAmount}
            </span>
          )}
        </button>
        
        <div className="mt-6 text-center">
          {timeLeft !== null && timeLeft < 60 && (
            <p className="text-red-600 text-sm font-medium mb-2">
              Your session is about to expire! Complete your payment quickly.
            </p>
          )}
          <p className="text-gray-600 text-sm flex items-center justify-center">
            <svg className="w-4 h-4 mr-1 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
            Secure Payment | 256-bit SSL Encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

// Main component with Suspense
export default function Payment() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-4 rounded-lg bg-white shadow-md">
        <p className="text-lg font-bold">Loading payment details...</p>
      </div>
    </div>}>
      <PaymentContent />
    </Suspense>
  );
} 