'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { isValidEmail } from '@/lib/email-verification';

// Country code data
const countryCodes = [
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
];

// Content component with searchParams
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    referralCode: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [validatingReferralCode, setValidatingReferralCode] = useState(false);
  
  // Country code dropdown
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(countryCodes[0]);
  
  // OTP verification
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isIndianPhone, setIsIndianPhone] = useState<boolean | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // OTP modal and timer
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResendOtp, setCanResendOtp] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = Array(6).fill(0).map(() => React.createRef<HTMLInputElement>());

  // Check for referral code in URL parameters
  useEffect(() => {
    // Check for referral code in URL query parameters
    const refFromURL = searchParams.get('ref');
    
    if (refFromURL) {
      setFormData(prev => ({
        ...prev,
        referralCode: refFromURL
      }));
      
      // Validate the referral code from URL
      validateReferralCode(refFromURL);
    }
  }, [searchParams]);

  // Timer effect for OTP resend
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    
    if (isOtpSent && otpTimer > 0 && !canResendOtp) {
      timerId = setInterval(() => {
        setOtpTimer(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            setCanResendOtp(true);
            clearInterval(timerId);
            return 0;
          }
          return newValue;
        });
      }, 1000);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isOtpSent, otpTimer, canResendOtp]);

  // Function to validate phone number
  const validatePhone = (phone: string): boolean => {
    // Basic validation for phone numbers - at least 10 digits
    return phone === '' || /^\+?[0-9]{10,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
  };
  
  // Function to check if phone is valid for current country
  const isValidPhoneForCountry = (phone: string, country: typeof selectedCountry): boolean => {
    if (!phone) return false;
    
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // If India, must be 10 digits starting with 6-9
    if (country.code === '+91') {
      return /^[6-9]\d{9}$/.test(cleanPhone);
    }
    
    // For other countries, basic length validation
    return cleanPhone.length >= 8 && cleanPhone.length <= 12;
  };

  // Function to check if it's an Indian phone number
  const isIndianPhoneNumber = (phone: string, countryCode: string): boolean => {
    // Check if the country code is India's
    if (countryCode === '+91') {
      // Check if the phone is a valid Indian mobile number (10 digits starting with 6-9)
      return /^[6-9]\d{9}$/.test(phone.replace(/[\s\-\(\)]/g, '').replace(/^\+?91/, ''));
    }
    return false;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear errors when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }

    // Validate phone number as user types
    if (name === 'phone' && value.length > 0) {
      if (!validatePhone(value)) {
        setFieldErrors(prev => ({
          ...prev,
          phone: 'Please enter a valid phone number'
        }));
      } else {
        // Check if it's an Indian phone number
        setIsIndianPhone(isIndianPhoneNumber(value, selectedCountry.code));
      }
    }

    // Validate referral code as user types
    if (name === 'referralCode' && value.length > 3) {
      validateReferralCode(value);
    } else if (name === 'referralCode' && value.length === 0) {
      setReferralCodeValid(null);
    }
  };

  // Handle OTP input in the modal
  const handleOtpDigitChange = (index: number, value: string) => {
    if (value === '' || /^\d$/.test(value)) {
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = value;
      setOtpDigits(newOtpDigits);
      setOtpCode(newOtpDigits.join(''));
      
      // Auto focus next input if digit entered
      if (value && index < 5) {
        otpInputRefs[index + 1].current?.focus();
      }
    }
  };
  
  // Handle backspace in OTP input
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs[index + 1].current?.focus();
    }
  };

  // Handle pasting OTP
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Check if pasted content is a 6-digit number
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      setOtpCode(pastedData);
      
      // Focus the last input after successful paste
      otpInputRefs[5].current?.focus();
    }
  };

  // Handle country selection
  const handleCountrySelect = (country: typeof selectedCountry) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    
    // Update phone validation when country changes
    if (formData.phone.length > 0) {
      setIsIndianPhone(isIndianPhoneNumber(formData.phone, country.code));
    }
  };

  // Function to handle OTP input change
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    // Only allow numeric values and limit to 6 digits
    if (value === '' || /^\d{0,6}$/.test(value)) {
      setOtpCode(value);
    }
  };

  // Function to handle sending OTP
  const handleSendOtp = async () => {
    if (!formData.phone) {
      setFieldErrors(prev => ({
        ...prev,
        phone: 'Please enter a phone number'
      }));
      return;
    }

    if (!isValidPhoneForCountry(formData.phone, selectedCountry)) {
      setFieldErrors(prev => ({
        ...prev,
        phone: `Please enter a valid phone number for ${selectedCountry.name}`
      }));
      return;
    }

    try {
      setSendingOtp(true);
      // Format the phone number to include the country code
      const formattedPhone = selectedCountry.code + formData.phone.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');
      
      // Clear any existing errors
      setError('');
      setFieldErrors(prev => {
        const newErrors = {...prev};
        delete newErrors.phone;
        return newErrors;
      });
      
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field) {
          setFieldErrors(prev => ({
            ...prev,
            [data.field]: data.error || `Error with this ${data.field}`
          }));
        } else {
          throw new Error(data.error || 'Failed to send OTP');
        }
      } else {
        setIsOtpSent(true);
        setShowOtpModal(true);
        setOtpTimer(60);
        setCanResendOtp(false);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpCode('');
        
        // Show success message
        setMessage('OTP sent successfully! Please check your phone.');
        setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Function to verify OTP
  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter a valid 6-digit OTP code');
      return;
    }

    try {
      setIsVerifyingOtp(true);
      setError(''); // Clear any existing errors
      
      // Format the phone number to include the country code
      const formattedPhone = selectedCountry.code + formData.phone.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '');
      
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
          otp: otpCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.field === 'otp' && data.status === 'invalid') {
          throw new Error('Invalid OTP. Please check and try again.');
        } else {
          throw new Error(data.error || 'Verification failed. Please try again.');
        }
      }

      // Update states for successful verification
      setIsPhoneVerified(true);
      setShowOtpModal(false); // Close the OTP modal
      
      // Clear the OTP fields
      setOtpCode('');
      setOtpDigits(['', '', '', '', '', '']);
      
      // Show verification success message
      setMessage('Phone number verified successfully!');
      setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Function to handle OTP resend
  const handleResendOtp = () => {
    if (canResendOtp) {
      setOtpTimer(60);
      setCanResendOtp(false);
      handleSendOtp();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    // Reset referral code validation state when submitting form
    setReferralCodeValid(null);
    
    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (!isValidEmail(formData.email)) {
      setFieldErrors({email: 'Please enter a valid email address'});
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setFieldErrors({confirmPassword: 'Passwords do not match'});
      return;
    }

    // Validate phone number for Indian users
    if (selectedCountry.code === '+91') {
      // Phone is required for Indian users
      if (!formData.phone) {
        setFieldErrors({phone: 'Phone number is required for Indian users'});
        return;
      }
      
      // Validate Indian phone number format
      if (!isIndianPhoneNumber(formData.phone, selectedCountry.code)) {
        setFieldErrors({phone: 'Please enter a valid Indian phone number'});
        return;
      }
      
      // Require verification for Indian phone numbers
      if (!isPhoneVerified) {
        setError('Please verify your phone number with OTP before signing up');
        return;
      }
    } 
    else if (formData.phone && !validatePhone(formData.phone)) {
      // For non-Indian users, validate phone number if provided (but not required)
      setFieldErrors({phone: 'Please enter a valid phone number'});
      return;
    }
    
    try {
      setLoading(true);
      
      // Format the phone number with country code
      const formattedPhone = formData.phone ? 
        selectedCountry.code + formData.phone.replace(/[\s\-\(\)]/g, '').replace(/^0+/, '') : 
        undefined;
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formattedPhone, // Send the formatted phone number with country code
          password: formData.password,
          referralCode: formData.referralCode || undefined,
          phoneVerified: isPhoneVerified // Send verification status
        }),
      });

      const data = await response.json();
      
      // For debugging
      console.log('Signup API response:', data);

      if (!response.ok) {
        // Handle field-specific errors
        if (data.field) {
          // This is a field-specific error (like duplicate email/phone)
          setFieldErrors({
            [data.field]: data.error || `This ${data.field} is already registered`
          });
          
          // If an account exists, show a more helpful message
          if (data.status === 'exists') {
            setError(`An account with this ${data.field} already exists. Please log in or use a different ${data.field}.`);
          }
          
          throw new Error(data.error || `This ${data.field} is already registered`);
        } else {
          throw new Error(data.message || data.error || 'Something went wrong');
        }
      }

      // Validate that user object and id exist in the response
      if (!data.user || !data.user._id) {
        console.error('Invalid user data received from API:', data);
        throw new Error('Invalid user data received from server. Please try again.');
      }
      
      // Ensure we have a valid MongoDB ObjectId (24 hex characters)
      const userId = data.user._id.toString();
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        console.error('Invalid userId format:', userId);
        throw new Error('Invalid user ID format. Please try again.');
      }

      // Log the userId being used for redirection
      console.log('Redirecting to details page with userId:', userId);

      // Redirect to details page after successful signup
      router.push(`/signup/details?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(data.user.email)}`);
    } catch (err: unknown) {
      const error = err as Error;
      if (!Object.keys(fieldErrors).length) {
        setError(error.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to validate referral code
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 4) return;
    
    try {
      setValidatingReferralCode(true);
      const response = await fetch('/api/validate-referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode: code }),
      });
      
      const data = await response.json();
      setReferralCodeValid(data.valid);
    } catch (err) {
      console.error('Error validating referral code:', err);
      setReferralCodeValid(false);
    } finally {
      setValidatingReferralCode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 relative overflow-hidden bg-cover bg-center bg-no-repeat" 
      style={{ 
        backgroundImage: 'url("https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80")', 
        backgroundSize: 'cover'
      }}
    >
      {/* Background overlay for readability - more blue tones */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-800/85 to-blue-600/85 z-0"></div>
      
      {/* Background decorative elements - adjusted for blue theme */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 mix-blend-overlay">
        {/* Circular light patterns with blue tones */}
        <div className="absolute top-10 right-10 w-72 h-72 rounded-full bg-gradient-to-r from-blue-200 to-blue-400 opacity-30 blur-xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-blue-300 opacity-30 blur-xl"></div>
        
        {/* Network-like pattern suggesting connections */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="network" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="2" fill="white" />
                <circle cx="0" cy="0" r="2" fill="white" />
                <circle cx="100" cy="0" r="2" fill="white" />
                <circle cx="0" cy="100" r="2" fill="white" />
                <circle cx="100" cy="100" r="2" fill="white" />
                <line x1="50" y1="50" x2="0" y2="0" stroke="white" strokeWidth="0.5" />
                <line x1="50" y1="50" x2="100" y2="0" stroke="white" strokeWidth="0.5" />
                <line x1="50" y1="50" x2="0" y2="100" stroke="white" strokeWidth="0.5" />
                <line x1="50" y1="50" x2="100" y2="100" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#network)" />
          </svg>
        </div>
      </div>
      
      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={() => setShowOtpModal(false)}></div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md z-10 relative mx-4"
          >
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">OTP Verification</h3>
              <p className="text-gray-600 mt-1">
                We've sent a 6-digit code to {selectedCountry.code} {formData.phone}
              </p>
            </div>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}
            
            {message && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r">
                <p className="text-green-600 text-sm">{message}</p>
              </div>
            )}
            
            {/* OTP Input Fields */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Verification Code
              </label>
              <div className="flex justify-between gap-2">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={otpInputRefs[index]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                ))}
              </div>
            </div>
            
            {/* Verify Button */}
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={isVerifyingOtp || otpCode.length !== 6}
              className={`w-full py-3 px-4 rounded-xl shadow-md text-white font-medium transition-colors duration-200 ${
                isVerifyingOtp || otpCode.length !== 6
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isVerifyingOtp ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                'Verify'
              )}
            </button>
            
            {/* Resend Code */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResendOtp}
                  className={`font-medium ${
                    canResendOtp
                      ? 'text-blue-600 hover:text-blue-800'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canResendOtp ? 'Resend OTP' : `Resend in ${otpTimer}s`}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
      
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
            Create account
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.9 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-gray-700 mt-2 text-base font-medium"
          >
            Join our network and start your journey to success
          </motion.p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r"
          >
            <p className="text-red-500 flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>
                {error}
                {error.includes('already exists') && (
                  <span className="block mt-1">
                    <Link href="/login" className="text-blue-600 underline font-medium">
                      Go to login page
                    </Link>
                  </span>
                )}
              </span>
            </p>
          </motion.div>
        )}
        
        {message && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r"
          >
            <p className="text-green-700 flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              {message}
            </p>
          </motion.div>
        )}
        
        <form className="space-y-6 relative z-30" onSubmit={handleSubmit}>
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="name" className="block text-base font-semibold text-gray-900 mb-1">
                Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base"
                  placeholder="Adam Watkins"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="email" className="block text-base font-semibold text-gray-900 mb-1">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                  placeholder="yours@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="phone" className="block text-base font-semibold text-gray-900 mb-1">
                Phone number
                {selectedCountry.code === '+91' && <span className="text-red-500 ml-1">*</span>}
              </label>
              <div className="relative">
                <div className="flex">
                  {/* Country code dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="appearance-none h-full flex items-center pl-3 pr-2 py-3 border border-gray-300 rounded-l-xl bg-gray-50 text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out"
                    >
                      <span className="mr-1">{selectedCountry.flag}</span>
                      <span>{selectedCountry.code}</span>
                      <svg className="ml-1 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {showCountryDropdown && (
                      <div className="absolute z-50 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        {countryCodes.map((country) => (
                          <button
                            key={`${country.name}-${country.code}`}
                            type="button"
                            className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            onClick={() => handleCountrySelect(country)}
                          >
                            <span className="mr-2">{country.flag}</span>
                            <span>{country.name}</span>
                            <span className="ml-auto text-gray-500">{country.code}</span>
                          </button>
                        ))}
                </div>
                    )}
                  </div>
                  
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                    className={`appearance-none block w-full pl-4 pr-3 py-3 border border-l-0 ${
                      fieldErrors.phone ? 'border-red-500' : isPhoneVerified ? 'border-green-500' : 'border-gray-300'
                    } rounded-r-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                    placeholder="9999999999"
                  value={formData.phone}
                  onChange={handleChange}
                    disabled={isPhoneVerified}
                  />
                  
                  {/* Show Send OTP button when valid phone number entered and not verified */}
                  {formData.phone && 
                   isValidPhoneForCountry(formData.phone, selectedCountry) && 
                   !isPhoneVerified && 
                   !isOtpSent && (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp}
                      className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {sendingOtp ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : "Get OTP"}
                    </button>
                  )}
                  
                  {/* For already sent OTP but not verified */}
                  {isOtpSent && !isPhoneVerified && (
                    <button
                      type="button"
                      onClick={() => setShowOtpModal(true)}
                      className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      Enter OTP
                    </button>
                  )}
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>
                )}
                {formData.phone && !isIndianPhone && formData.phone.length > 0 && selectedCountry.code === '+91' && (
                  <p className="mt-1 text-xs text-amber-600">Please enter a valid Indian phone number for verification</p>
                )}
                {isPhoneVerified && (
                  <p className="mt-1 text-xs text-green-600 flex items-center">
                    <svg className="h-4 w-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Phone number verified
                  </p>
                )}
                {selectedCountry.code === '+91' && !isPhoneVerified && formData.phone && (
                  <p className="mt-1 text-xs text-gray-600">Indian phone numbers require verification</p>
                )}
              </div>
            </motion.div>
            
            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="password" className="block text-base font-semibold text-gray-900 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full pl-10 pr-10 py-3 border ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.password && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
                )}
                
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {showPassword ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    )}
                  </svg>
                </button>
              </div>
            </motion.div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="confirmPassword" className="block text-base font-semibold text-gray-900 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`appearance-none block w-full pl-10 pr-3 py-3 border ${
                    fieldErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  } rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                {fieldErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.3 }}
              style={{ zIndex: 30 }}
            >
              <label htmlFor="referralCode" className="block text-base font-semibold text-gray-900 mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="referralCode"
                  name="referralCode"
                  type="text"
                  className={`appearance-none block w-full pl-10 pr-10 py-3 border ${
                    referralCodeValid === true ? 'border-green-500' : 
                    referralCodeValid === false ? 'border-red-300' : 
                    'border-gray-300'
                  } rounded-xl shadow-sm placeholder-gray-500 bg-white text-gray-900 font-medium focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-base`}
                  placeholder="Enter referral code (if you have one)"
                  value={formData.referralCode}
                  onChange={handleChange}
                />
                {validatingReferralCode && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
                {!validatingReferralCode && referralCodeValid === true && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                )}
                {!validatingReferralCode && referralCodeValid === false && formData.referralCode.length > 0 && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-600 font-medium">Enter if someone referred you</p>
              {referralCodeValid === true && (
                <p className="mt-1 text-sm text-green-600 font-medium">Valid referral code ✓</p>
              )}
              {referralCodeValid === false && formData.referralCode.length > 0 && (
                <p className="mt-1 text-sm text-red-600 font-medium">Invalid referral code</p>
              )}
            </motion.div>
          </div>

          <motion.div 
            className="flex items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.3 }}
          >
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition duration-150 ease-in-out"
              checked={rememberMe}
              onChange={() => setRememberMe(!rememberMe)}
            />
            <label htmlFor="remember-me" className="ml-2 block text-base text-gray-800">
              Remember me
            </label>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.3 }}
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
                  Creating account...
                </span>
              ) : (
                'Sign up'
              )}
            </button>
          </motion.div>
        </form>

        <motion.div 
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.3 }}
        >
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-700 font-medium">Or continue with</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-0 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex justify-center items-center w-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#EA4335">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"></path>
                </svg>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-0 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex justify-center items-center w-full">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M13.958 10.09c0 1.232.029 2.395-.591 3.552-.502.902-1.3 1.454-2.186 1.454-1.214 0-1.922-.924-1.922-2.292 0-2.692 2.415-3.182 4.7-3.182v.468h-.001zm3.186 7.705c-.21.188-.512.188-.747.071-1.05-.872-1.236-1.303-1.816-2.153-1.736 1.77-2.962 2.292-5.204 2.292-2.654 0-4.719-1.644-4.719-4.935 0-2.566 1.387-4.309 3.375-5.164 1.718-.761 4.115-.897 5.952-1.105v-.468c0-.761.06-1.105-.591-1.105-1.387 0-2.962 1.032-2.962 3.252 0 .42-.471.46-.83.46-.425 0-.566-.272-.566-.667V8.792c0-.379.094-.667.377-.897.998-.803 2.62-1.136 4.177-1.136 1.66 0 3.485.47 3.485 2.619v4.112c0 .948.519 1.366.519 2.049 0 .261-.107.41-.334.41h.002l-.12.003zM21.294 20H2.705C1.426 20 .5 19.05.5 17.743V6.257C.5 4.95 1.427 4 2.705 4h18.59C22.573 4 23.5 4.95 23.5 6.257v11.486c0 1.308-.926 2.257-2.206 2.257z" fill="#FF9900"/>
                </svg>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-0 border border-gray-300 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 transition duration-150 ease-in-out"
            >
              <div className="flex justify-center items-center w-full">
                <svg width="20" height="20" viewBox="0 0 23 23" fill="none">
                  <path d="M11 11H0V0h11v11z" fill="#F25022"></path>
                  <path d="M23 11H12V0h11v11z" fill="#7FBA00"></path>
                  <path d="M11 23H0V12h11v11z" fill="#00A4EF"></path>
                  <path d="M23 23H12V12h11v11z" fill="#FFB900"></path>
                </svg>
              </div>
            </motion.button>
          </div>
        </motion.div>

        <motion.div 
          className="mt-6 text-center text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.3 }}
        >
          <p className="text-gray-700 text-base">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-700 hover:text-blue-600 transition duration-150 ease-in-out">
              log in
            </Link>
          </p>
        </motion.div>

        <motion.div 
          className="mt-5 text-center text-xs text-gray-600"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.3 }}
        >
          <p>
            By clicking &quot;continue&quot;, you agree to our{' '}
            <a href="#" className="font-medium text-blue-700 hover:text-blue-600 hover:underline transition duration-150 ease-in-out">
              Terms and Conditions
            </a>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Main component with Suspense
export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-4 rounded-lg bg-white shadow-md">
        <p className="text-lg font-bold">Loading signup form...</p>
      </div>
    </div>}>
      <SignupContent />
    </Suspense>
  );
} 