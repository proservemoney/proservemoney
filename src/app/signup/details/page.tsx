'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Content component with searchParams
function SignupDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');

  const [formData, setFormData] = useState({
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    planSelected: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeVerified, setPincodeVerified] = useState(false);
  
  // Create an interface for the pincode data response
  interface PincodeData {
    office?: string;
    district?: string;
    state?: string;
    pincode?: string;
  }
  
  const [pincodeData, setPincodeData] = useState<PincodeData | null>(null);

  // Payment plan options
  const plans = [
    { id: 'basic', name: 'Basic Plan', price: 799, gstPrice: 943 },
    { id: 'premium', name: 'Premium Plan', price: 2499, gstPrice: 2949 }
  ];

  useEffect(() => {
    // Log userId for debugging
    console.log('Details page received userId:', userId);
    
    // Validate userId format
    if (userId) {
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.error('Invalid userId format in details page:', userId);
        setError('Invalid user ID format. Please try signing up again.');
        setTimeout(() => {
          router.push('/signup');
        }, 2000);
        return;
      }
    } else {
      // Redirect if no userId is provided
      console.error('No userId provided to details page');
      router.push('/signup');
    }
  }, [userId, router]);

  useEffect(() => {
    if (!userId || !email) {
      setError('Missing required information');
      return;
    }

    // Check if we have prefilled data from a continued registration
    const continueRegistration = searchParams.get('continueRegistration');
    if (continueRegistration === 'true') {
      // Pre-fill address fields from URL parameters
      const addressFromUrl = searchParams.get('address');
      const cityFromUrl = searchParams.get('city');
      const stateFromUrl = searchParams.get('state');
      const pincodeFromUrl = searchParams.get('pincode');
      const countryFromUrl = searchParams.get('country');
      const planIdFromUrl = searchParams.get('planId');
      
      // Create a new form data object rather than using existing state
      const newFormData = {
        address: addressFromUrl || '',
        city: cityFromUrl || '',
        state: stateFromUrl || '',
        pincode: pincodeFromUrl || '',
        country: countryFromUrl || 'India',
        planSelected: planIdFromUrl || ''
      };
      
      setFormData(newFormData);
      
      // If pincode is provided and country is India, verify it
      if (pincodeFromUrl && newFormData.country === 'India') {
        verifyPincode(pincodeFromUrl);
      }
    }
  }, [userId, email, searchParams]);  // Remove formData from dependencies

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Reset pincode verification if country changes
    if (name === 'country' && value !== 'India') {
      setPincodeVerified(false);
      setPincodeData(null);
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    
    // Auto-verify pincode when it's changed and country is India
    if (name === 'pincode' && formData.country === 'India' && value.length === 6) {
      verifyPincode(value);
    }
  };
  
  // Function to verify pincode using Vigowebs Indian Pincode API
  const verifyPincode = async (pincode: string) => {
    if (!pincode || pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      setPincodeVerified(false);
      setPincodeData(null);
      return;
    }
    
    try {
      setPincodeLoading(true);
      console.log('Verifying pincode:', pincode);
      
      // Call the Vigowebs Indian Pincode API
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();
      console.log('API response:', data);
      
      // The API returns an array with one object that contains status and PostOffice array
      if (response.ok && data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        console.log('Post office data:', postOffice);
        
        // Create a properly structured data object
        const locationData = {
          office: postOffice.Name,
          district: postOffice.District,
          state: postOffice.State,
          pincode: postOffice.Pincode
        };
        
        setPincodeData(locationData);
        setPincodeVerified(true);
        
        // Auto-fill city and state from API response
        setFormData(prev => ({
          ...prev,
          city: locationData.district || prev.city,
          state: locationData.state || prev.state
        }));
        
        console.log('Pincode verified successfully');
      } else {
        console.log('Invalid pincode or API error:', data);
        setPincodeVerified(false);
        setPincodeData(null);
      }
    } catch (err) {
      console.error('Error verifying pincode:', err);
      setPincodeVerified(false);
      setPincodeData(null);
    } finally {
      setPincodeLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setFormData((prev) => ({
      ...prev,
      planSelected: planId
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    console.log('Form submission with userId:', userId);
    
    // Double check userId is valid before submitting
    if (!userId || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Invalid userId on form submission:', userId);
      setError('Invalid user ID. Please try signing up again.');
      setTimeout(() => {
        router.push('/signup');
      }, 2000);
      return;
    }
    
    // Validation
    if (!formData.address || !formData.city || !formData.state || !formData.pincode) {
      setError('All address fields are required');
      return;
    }

    if (!formData.planSelected) {
      setError('Please select a payment plan');
      return;
    }
    
    // Additional validation for Indian pincodes
    if (formData.country === 'India' && !pincodeVerified) {
      setError('Please enter a valid Indian pincode');
      return;
    }
    
    try {
      setLoading(true);
      
      // Find the selected plan
      const selectedPlan = plans.find(plan => plan.id === formData.planSelected);
      
      if (!selectedPlan) {
        throw new Error('Invalid plan selected');
      }
      
      // Redirect to payment page with all necessary parameters
      const queryParams = new URLSearchParams({
        userId: userId.toString(),
        email: email || '',
        amount: selectedPlan.price.toString(),
        gstAmount: selectedPlan.gstPrice.toString(),
        planId: selectedPlan.id,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country
      });
      
      console.log('Redirecting to payment page with params:', queryParams.toString());
      
      // Navigate to payment page with all details
      router.push(`/payment?${queryParams.toString()}`);
      
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Form submission error:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white bg-opacity-100 p-10 rounded-xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.3)] z-20 border border-blue-200"
      >
        <div className="mb-8 text-center">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent"
          >
            Almost there!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-700 mt-2 text-base font-medium"
          >
            Complete your details to continue
          </motion.p>
          {email && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-blue-700 mt-1 text-sm"
            >
              for: {email}
            </motion.p>
          )}
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r"
          >
            <p className="text-red-500 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          </motion.div>
        )}
        
        <form className="space-y-6 relative z-30" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <h3 className="text-lg font-bold text-gray-900">Address Information</h3>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="address" className="block text-base font-semibold text-gray-900 mb-1">
                Address
              </label>
              <div className="relative">
                <textarea
                  id="address"
                  name="address"
                  rows={2}
                  className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base"
                  placeholder="Enter your full address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>
            </motion.div>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                style={{ zIndex: 30 }}
              >
                <label htmlFor="country" className="block text-base font-semibold text-gray-900 mb-1">
                  Country
                </label>
                <div className="relative">
                  <select
                    id="country"
                    name="country"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base"
                    value={formData.country}
                    onChange={handleChange}
                  >
                    <option value="India">India</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                style={{ zIndex: 30 }}
              >
                <label htmlFor="pincode" className="block text-base font-semibold text-gray-900 mb-1">
                  Pincode
                </label>
                <div className="relative">
                  <input
                    id="pincode"
                    name="pincode"
                    type="text"
                    maxLength={6}
                    className={`appearance-none block w-full px-3 py-3 border ${formData.country === 'India' && formData.pincode.length === 6 ? (pincodeVerified ? 'border-green-500 bg-green-50' : 'border-red-300 bg-red-50') : 'border-gray-300'} rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                    placeholder="123456"
                    value={formData.pincode}
                    onChange={handleChange}
                    required
                  />
                  {pincodeLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  {!pincodeLoading && formData.country === 'India' && formData.pincode.length === 6 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {pincodeVerified ? (
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                      ) : (
                        <button 
                          type="button" 
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => verifyPincode(formData.pincode)}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {formData.country === 'India' && formData.pincode.length === 6 && !pincodeVerified && !pincodeLoading && (
                  <div className="mt-1 text-sm">
                    <p className="text-red-500">Couldn&apos;t verify pincode automatically.</p>
                    <button 
                      type="button" 
                      className="text-blue-600 hover:text-blue-800 font-medium mt-1"
                      onClick={() => {
                        // Manual verification bypass
                        setPincodeVerified(true);
                        setPincodeData({
                          office: 'Manual entry',
                          district: formData.city,
                          state: formData.state,
                          pincode: formData.pincode
                        });
                      }}
                    >
                      Continue with manual entry
                    </button>
                  </div>
                )}
                {formData.country === 'India' && formData.pincode.length === 6 && pincodeVerified && pincodeData && (
                  <p className="mt-1 text-sm text-green-600">
                    {pincodeData.office || pincodeData.district}, {pincodeData.state}
                  </p>
                )}
              </motion.div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                style={{ zIndex: 30 }}
              >
                <label htmlFor="city" className="block text-base font-semibold text-gray-900 mb-1">
                  City
                </label>
                <div className="relative">
                  <input
                    id="city"
                    name="city"
                    type="text"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base"
                    placeholder="Your city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                    readOnly={formData.country === 'India' && pincodeVerified}
                  />
                  {formData.country === 'India' && pincodeVerified && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                style={{ zIndex: 30 }}
              >
                <label htmlFor="state" className="block text-base font-semibold text-gray-900 mb-1">
                  State
                </label>
                <div className="relative">
                  <input
                    id="state"
                    name="state"
                    type="text"
                    className="appearance-none block w-full px-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base"
                    placeholder="Your state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    readOnly={formData.country === 'India' && pincodeVerified}
                  />
                  {formData.country === 'India' && pincodeVerified && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                      </svg>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
            
            {/* Plan Selection */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-3">Choose a Plan</h3>
              
              <div className="space-y-4">
                {plans.map(plan => (
                  <motion.div 
                    key={plan.id}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                  >
                    <div 
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${formData.planSelected === plan.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-300 hover:border-blue-300'}`}
                      onClick={() => handlePlanSelect(plan.id)}
                    >
                      <div className="flex justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">{plan.name}</h4>
                          <p className="text-sm text-gray-600">Best for new users</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600 text-lg">₹{plan.price}</div>
                          <div className="text-xs text-gray-500 font-medium">+ 18% GST</div>
                          <div className="text-sm font-semibold text-gray-700">₹{plan.gstPrice} total</div>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center">
                        <div className={`h-5 w-5 rounded-full border-2 ${formData.planSelected === plan.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'} flex items-center justify-center`}>
                          {formData.planSelected === plan.id && (
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">
                          {formData.planSelected === plan.id ? 'Selected' : 'Select this plan'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.3 }}
          >
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 ease-in-out transform hover:-translate-y-0.5"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
}

// Main component with Suspense
export default function SignupDetails() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-4 rounded-lg bg-white shadow-md">
        <p className="text-lg font-bold">Loading signup details form...</p>
      </div>
    </div>}>
      <SignupDetailsContent />
    </Suspense>
  );
} 