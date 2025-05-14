'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import Image from 'next/image';

export default function ProfilePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'payment'>('profile');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    referralCode: '',
    joinDate: '',
    avatar: '',
    photoUrl: '',
    plan: '',
    planAmount: 0,
    emailVerified: false,
    address: {
      address: '',
      city: '',
      state: '',
      pincode: '',
      country: ''
    },
    phoneVerified: false
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Email verification states
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerificationError, setEmailVerificationError] = useState('');
  const [emailVerificationSuccess, setEmailVerificationSuccess] = useState('');
  
  // Additional states for phone verification
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [showPhoneVerificationModal, setShowPhoneVerificationModal] = useState(false);
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [phoneVerificationError, setPhoneVerificationError] = useState('');
  const [phoneVerificationSuccess, setPhoneVerificationSuccess] = useState('');
  
  // State for 2FA
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorSuccess, setTwoFactorSuccess] = useState('');
  const [enablingTwoFactor, setEnablingTwoFactor] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState<'sms' | 'email'>('sms');
  
  // Add state for 2FA setup verification
  const [showTwoFactorSetupModal, setShowTwoFactorSetupModal] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [verifyingTwoFactorSetup, setVerifyingTwoFactorSetup] = useState(false);
  const [twoFactorSetupError, setTwoFactorSetupError] = useState('');
  const [twoFactorSetupDestination, setTwoFactorSetupDestination] = useState('');
  const [twoFactorSetupSending, setTwoFactorSetupSending] = useState(false);
  
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
  
  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          console.error('No user ID found');
          setLoading(false);
          return;
        }
        
        // Fetch user data
        const response = await fetch(`/api/user/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        const userData = data.user || {}; // Get user data from response
        
        console.log('User data from API:', userData); // For debugging
        
        // Format date carefully, handling invalid dates
        let formattedDate = 'Not available';
        if (userData.createdAt) {
          try {
            const date = new Date(userData.createdAt);
            if (!isNaN(date.getTime())) {
              formattedDate = date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            }
          } catch (error) {
            console.error('Error formatting date:', error);
          }
        }
        
        // Format user data
        setUserProfile({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          country: userData.previousRegData?.address?.country || 'India',
          referralCode: userData.referralCode || '',
          joinDate: formattedDate,
          avatar: userData.name ? userData.name.charAt(0).toUpperCase() : '',
          photoUrl: userData.photoUrl || '',
          plan: userData.plan || 'free',
          planAmount: userData.planAmount || 0,
          emailVerified: userData.emailVerified || false,
          address: userData.previousRegData?.address || {
            address: '',
            city: '',
            state: '',
            pincode: '',
            country: 'India'
          },
          phoneVerified: userData.phoneVerified || false
        });
        
        // Set 2FA status - log values for debugging
        console.log('2FA status from API:', {
          enabled: userData.twoFactorEnabled,
          method: userData.twoFactorMethod
        });
        
        setTwoFactorEnabled(userData.twoFactorEnabled || false);
        setPreferredMethod(userData.twoFactorMethod || 'sms');
        
        // Set photo preview if user has a photo
        if (userData.photoUrl) {
          setPhotoPreview(userData.photoUrl);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const updatedProfile = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      address: {
        address: formData.get('address') || userProfile.address.address,
        city: formData.get('city') || userProfile.address.city,
        state: formData.get('state') || userProfile.address.state,
        pincode: formData.get('pincode') || userProfile.address.pincode,
        country: formData.get('country') || userProfile.address.country
      }
    };
    
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await fetch(`/api/user/${userId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedProfile),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update profile');
      }
      
      const result = await response.json();
      
      if (result.success) {
        alert('Profile updated successfully!');
        // Update local state with the new values
        setUserProfile(prev => ({
          ...prev,
          name: updatedProfile.name as string || prev.name,
          phone: updatedProfile.phone as string || prev.phone,
          address: updatedProfile.address
        }));
      } else {
        throw new Error(result.message || 'Profile update failed');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(`Failed to update profile: ${error.message}`);
    }
  };
  
  // Handle file selection for photo upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Handle photo upload
  const handlePhotoUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      alert('Please select an image to upload');
      return;
    }
    
    const file = fileInputRef.current.files[0];
    
    try {
      setUploading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Add userId to formData to ensure correct user is updated
      const userId = localStorage.getItem('userId');
      if (userId) {
        formData.append('userId', userId);
      }
      
      // Log for debugging
      console.log('Uploading photo for user:', userId);
      
      const response = await fetch('/api/user/photo-upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Photo upload error:', errorText);
        throw new Error(`Failed to upload photo: ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update the user profile with the new photo URL but preserve all other data
        setUserProfile(prev => ({
          ...prev,
          photoUrl: result.photoUrl
        }));
        setPhotoPreview(result.photoUrl);
        
        // Update user profile with photoUrl through the API
        const updateResponse = await fetch(`/api/user/${userId}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ photoUrl: result.photoUrl }),
        });
        
        if (!updateResponse.ok) {
          console.error('Failed to update profile with new photo URL');
        } else {
          // Set a flag in localStorage to indicate the photo was updated
          localStorage.setItem('photoUpdated', 'true');
          
          // Force a full navigation to refresh the page and all images
          window.location.href = '/dashboard';
        }
        
        alert('Profile photo updated successfully!');
      } else {
        throw new Error(result.message || 'Failed to upload photo');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      alert(`Failed to upload photo: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle password form changes
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password update
  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validate passwords
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    
    try {
      setChangingPassword(true);
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await fetch(`/api/user/${userId}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPasswordSuccess('Password updated successfully');
        // Clear form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setPasswordError(result.message || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'An error occurred');
    } finally {
      setChangingPassword(false);
    }
  };

  // Function to request a verification code
  const handleSendVerificationCode = async () => {
    try {
      setSendingEmailCode(true);
      setEmailVerificationError('');
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await fetch('/api/user/send-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send verification code');
      }
      
      // Show verification modal
      setShowVerificationModal(true);
      setEmailVerificationSuccess(`Verification code sent to ${result.email}`);
      
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      setEmailVerificationError(error.message || 'An error occurred');
    } finally {
      setSendingEmailCode(false);
    }
  };
  
  // Function to verify the email
  const handleVerifyEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setVerifyingEmail(true);
      setEmailVerificationError('');
      
      if (!verificationCode || verificationCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit verification code');
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await fetch('/api/user/verify-email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          code: verificationCode
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify email');
      }
      
      // Update user profile
      setUserProfile(prev => ({
        ...prev,
        emailVerified: true
      }));
      
      // Show success message and close modal
      setEmailVerificationSuccess('Email verified successfully!');
      setShowVerificationModal(false);
      setVerificationCode('');
      
      setTimeout(() => {
        setEmailVerificationSuccess('');
      }, 5000);
      
    } catch (error: any) {
      console.error('Error verifying email:', error);
      setEmailVerificationError(error.message || 'An error occurred');
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Function to handle phone verification
  const handleSendPhoneVerificationCode = async () => {
    try {
      setSendingPhoneCode(true);
      setPhoneVerificationError('');
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      if (!userProfile.phone) {
        throw new Error('Please enter a phone number first');
      }
      
      const response = await fetch('/api/user/send-phone-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          phone: userProfile.phone 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to send verification code');
      }
      
      // Show verification modal
      setShowPhoneVerificationModal(true);
      setPhoneVerificationSuccess(`Verification code sent to ${userProfile.phone}`);
      
    } catch (error: any) {
      console.error('Error sending phone verification code:', error);
      setPhoneVerificationError(error.message || 'An error occurred');
    } finally {
      setSendingPhoneCode(false);
    }
  };
  
  // Function to verify the phone
  const handleVerifyPhone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setVerifyingPhone(true);
      setPhoneVerificationError('');
      
      if (!phoneVerificationCode || phoneVerificationCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit verification code');
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const response = await fetch('/api/user/verify-phone-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          code: phoneVerificationCode
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to verify phone');
      }
      
      // Update user profile
      setUserProfile(prev => ({
        ...prev,
        phoneVerified: true
      }));
      
      // Show success message and close modal
      setPhoneVerificationSuccess('Phone verified successfully!');
      setShowPhoneVerificationModal(false);
      setPhoneVerificationCode('');
      
      setTimeout(() => {
        setPhoneVerificationSuccess('');
      }, 5000);
      
    } catch (error: any) {
      console.error('Error verifying phone:', error);
      setPhoneVerificationError(error.message || 'An error occurred');
    } finally {
      setVerifyingPhone(false);
    }
  };

  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle Two-Factor Authentication toggle
  const handleTwoFactorToggle = () => {
    if (twoFactorEnabled) {
      // If 2FA is already enabled, confirm before disabling
      if (confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) {
        disableTwoFactor();
      }
    } else {
      // If 2FA is disabled, show the confirmation modal
      setShowTwoFactorModal(true);
      setTwoFactorPassword('');
      setTwoFactorError('');
    }
  };

  // Enable Two-Factor Authentication
  const enableTwoFactor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setEnablingTwoFactor(true);
      setTwoFactorError('');
      
      // Validate password
      if (!twoFactorPassword) {
        throw new Error('Please enter your password to enable Two-Factor Authentication');
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Check if user has verified email/phone based on preferred method
      if (preferredMethod === 'email' && !userProfile.emailVerified) {
        throw new Error('You need to verify your email before enabling Two-Factor Authentication with email');
      } else if (preferredMethod === 'sms' && !userProfile.phoneVerified) {
        throw new Error('You need to verify your phone before enabling Two-Factor Authentication with SMS');
      }
      
      console.log('Enabling 2FA with method:', preferredMethod);
      
      // Verify password and enable 2FA
      const response = await fetch('/api/user/enable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          password: twoFactorPassword,
          method: preferredMethod
        }),
      });
      
      const result = await response.json();
      console.log('2FA enable response:', result);
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to enable Two-Factor Authentication');
      }
      
      // Update local state
      setTwoFactorEnabled(true);
      setTwoFactorSuccess('Two-Factor Authentication has been enabled successfully');
      
      // Close password modal
      setShowTwoFactorModal(false);
      setTwoFactorPassword('');
      
      // If setup verification is required, show the setup verification modal
      if (result.setupPending && result.destination) {
        setTwoFactorSetupDestination(result.destination);
        setShowTwoFactorSetupModal(true);
        setTwoFactorSetupCode('');
        setTwoFactorSetupError('');
      }
      
    } catch (error: any) {
      console.error('Error enabling 2FA:', error);
      setTwoFactorError(error.message || 'An error occurred');
    } finally {
      setEnablingTwoFactor(false);
    }
  };
  
  // Disable Two-Factor Authentication
  const disableTwoFactor = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Ask for password confirmation
      const password = prompt('Please enter your password to disable Two-Factor Authentication');
      
      // Check if password was provided
      if (!password) {
        return; // User cancelled or submitted empty password
      }
      
      // Disable 2FA
      const response = await fetch('/api/user/disable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId,
          password
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to disable Two-Factor Authentication');
      }
      
      // Update local state
      setTwoFactorEnabled(false);
      alert('Two-Factor Authentication has been disabled');
      
    } catch (error: any) {
      console.error('Error disabling 2FA:', error);
      alert(error.message || 'Failed to disable Two-Factor Authentication');
    }
  };

  // Verify 2FA setup code
  const verifyTwoFactorSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setVerifyingTwoFactorSetup(true);
      setTwoFactorSetupError('');
      
      // Validate the code
      if (!twoFactorSetupCode || twoFactorSetupCode.length !== 6) {
        throw new Error('Please enter a valid 6-digit verification code');
      }
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Verify the 2FA setup code
      const response = await fetch('/api/auth/verify-2fa-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          code: twoFactorSetupCode
        }),
      });
      
      const data = await response.json();
      console.log('2FA setup verification response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify setup code');
      }
      
      // Close setup modal
      setShowTwoFactorSetupModal(false);
      setTwoFactorSetupCode('');
      
      // Show success notification
      alert('Two-Factor Authentication has been successfully set up and verified!');
      
    } catch (error: any) {
      console.error('Error verifying 2FA setup:', error);
      setTwoFactorSetupError(error.message || 'Failed to verify setup code');
    } finally {
      setVerifyingTwoFactorSetup(false);
    }
  };
  
  // Resend 2FA setup code
  const resendTwoFactorSetupCode = async () => {
    try {
      setTwoFactorSetupSending(true);
      setTwoFactorSetupError('');
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      // Send a new 2FA code
      const response = await fetch('/api/auth/send-2fa-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId
        }),
      });
      
      const data = await response.json();
      console.log('2FA code resend response:', data);
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      
      // Update destination if provided in response
      if ((preferredMethod === 'email' && data.email) || (preferredMethod === 'sms' && data.phone)) {
        setTwoFactorSetupDestination(preferredMethod === 'email' ? data.email : data.phone);
      }
      
      alert('A new verification code has been sent');
      
    } catch (error: any) {
      console.error('Error sending 2FA setup code:', error);
      setTwoFactorSetupError(error.message || 'Failed to send verification code');
    } finally {
      setTwoFactorSetupSending(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout darkMode={darkMode}>
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Loading profile data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout darkMode={darkMode} onDarkModeChange={handleDarkModeChange}>
      <div className="mt-16">
        <h1 className="text-2xl font-bold mb-6 dashboard-heading">Profile & Settings</h1>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-4 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-6 py-4 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('payment')}
                className={`px-6 py-4 font-medium text-sm ${
                  activeTab === 'payment'
                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Withdrawal Methods
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center">
                    {/* Profile Photo */}
                    <div className="w-32 h-32 rounded-full overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      {photoPreview || userProfile.photoUrl ? (
                        <Image 
                          src={photoPreview || userProfile.photoUrl}
                          alt={userProfile.name}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                          unoptimized={(photoPreview && photoPreview.startsWith('data:')) || 
                                      (userProfile.photoUrl && userProfile.photoUrl.startsWith('/uploads/'))}
                        />
                      ) : (
                        <span className="text-white text-4xl font-bold">
                          {userProfile.avatar || '?'}
                        </span>
                      )}
                    </div>
                    
                    {/* Hidden file input */}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />
                    
                    {/* Photo upload controls */}
                    <div className="mt-4 flex space-x-2">
                      <button 
                        onClick={triggerFileInput}
                        className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300"
                        disabled={uploading}
                      >
                        Select Photo
                      </button>
                      
                      {photoPreview !== userProfile.photoUrl && (
                        <button 
                          onClick={handlePhotoUpload}
                          className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md disabled:opacity-50"
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </button>
                      )}
                    </div>
                    
                    {/* Basic Profile Info */}
                    <div className="mt-6 text-center">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{userProfile.name}</h2>
                      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        Joined on {userProfile.joinDate}
                      </div>
                      {/* Display user plan and amount */}
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Current Plan</h3>
                        <div className="flex justify-center items-center mt-1">
                          <span className="text-lg font-semibold text-blue-700 dark:text-blue-400 capitalize">
                            {userProfile.plan || 'Free'}
                          </span>
                          {userProfile.planAmount > 0 && (
                            <span className="ml-2 text-sm text-blue-600 dark:text-blue-300">
                              ₹{userProfile.planAmount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="md:col-span-2">
                  <form onSubmit={handleProfileUpdate}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={userProfile.name}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Your full name"
                        />
                      </div>
                      
                      {/* Email field moved to Personal Information */}
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={userProfile.email}
                            readOnly
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                            placeholder="Your email address"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {userProfile.emailVerified ? (
                              <svg 
                                className="h-5 w-5 text-green-500" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                                title="Email verified"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendVerificationCode}
                                disabled={sendingEmailCode}
                                className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none text-sm"
                                title="Verify email"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center">
                          <span className={`text-xs ${userProfile.emailVerified ? 'text-green-600' : 'text-red-600'}`}>
                            {userProfile.emailVerified ? 'Verified' : 'Not verified'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Phone field in the next row */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={userProfile.phone}
                            onChange={handleInputChange}
                            className="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Your phone number"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {userProfile.phone && (
                              <svg 
                                className="h-5 w-5 text-green-500" 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                                title="Phone verified"
                              >
                                <path 
                                  fillRule="evenodd" 
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                                  clipRule="evenodd" 
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="mt-1 flex items-center">
                          <span className="text-xs text-green-600">
                            {userProfile.phone ? 'Phone number added' : 'No phone number entered'}
                          </span>
                          {phoneVerificationSuccess && (
                            <span className="ml-2 text-xs text-green-600">{phoneVerificationSuccess}</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="referralCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Referral Code
                        </label>
                        <input
                          type="text"
                          id="referralCode"
                          name="referralCode"
                          value={userProfile.referralCode}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    </div>
                    
                    {/* Address Information Section */}
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 mt-8">Address Information</h3>
                    <div className="grid grid-cols-1 gap-4 mb-6">
                      <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Street Address
                        </label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          defaultValue={userProfile.address.address}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          id="city"
                          name="city"
                          defaultValue={userProfile.address.city}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          State/Province
                        </label>
                        <input
                          type="text"
                          id="state"
                          name="state"
                          defaultValue={userProfile.address.state}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                      <div>
                        <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Postal Code
                        </label>
                        <input
                          type="text"
                          id="pincode"
                          name="pincode"
                          defaultValue={userProfile.address.pincode}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          State
                        </label>
                        <select
                          id="country"
                          name="country"
                          defaultValue={userProfile.address.country || "India"}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="India">India</option>
                          <option value="Andhra Pradesh">Andhra Pradesh</option>
                          <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                          <option value="Assam">Assam</option>
                          <option value="Bihar">Bihar</option>
                          <option value="Chhattisgarh">Chhattisgarh</option>
                          <option value="Goa">Goa</option>
                          <option value="Gujarat">Gujarat</option>
                          <option value="Haryana">Haryana</option>
                          <option value="Himachal Pradesh">Himachal Pradesh</option>
                          <option value="Jharkhand">Jharkhand</option>
                          <option value="Karnataka">Karnataka</option>
                          <option value="Kerala">Kerala</option>
                          <option value="Madhya Pradesh">Madhya Pradesh</option>
                          <option value="Maharashtra">Maharashtra</option>
                          <option value="Manipur">Manipur</option>
                          <option value="Meghalaya">Meghalaya</option>
                          <option value="Mizoram">Mizoram</option>
                          <option value="Nagaland">Nagaland</option>
                          <option value="Odisha">Odisha</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Rajasthan">Rajasthan</option>
                          <option value="Sikkim">Sikkim</option>
                          <option value="Tamil Nadu">Tamil Nadu</option>
                          <option value="Telangana">Telangana</option>
                          <option value="Tripura">Tripura</option>
                          <option value="Uttar Pradesh">Uttar Pradesh</option>
                          <option value="Uttarakhand">Uttarakhand</option>
                          <option value="West Bengal">West Bengal</option>
                          <option value="Delhi">Delhi</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-6">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-md shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            
            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-bold mb-6 dashboard-heading">Account Security</h2>
                
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Change Password</h3>
                    {passwordError && (
                      <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 text-green-700">
                        {passwordSuccess}
                      </div>
                    )}
                    <form className="space-y-4" onSubmit={handlePasswordUpdate}>
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="currentPassword"
                          name="currentPassword"
                          value={passwordForm.currentPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {changingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">
                          Add an extra layer of security to your account
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          We'll send a code to your {twoFactorEnabled ? (preferredMethod === 'sms' ? 'phone' : 'email') : 'phone or email'} each time you sign in
                        </p>
                        {twoFactorEnabled && (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <svg className="mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                                <circle cx="4" cy="4" r="3" />
                              </svg>
                              Enabled via {preferredMethod === 'sms' ? 'SMS' : 'Email'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <label className="inline-flex relative items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={twoFactorEnabled}
                            onChange={handleTwoFactorToggle}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Session History</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">Current Session</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Windows • Chrome • India</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Started: Today</p>
                        </div>
                        <div className="flex items-center">
                          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                          <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Withdrawal Methods Tab */}
            {activeTab === 'payment' && (
              <div>
                <h2 className="text-xl font-bold mb-6 dashboard-heading">Withdrawal Methods</h2>
                
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Your Withdrawal Methods</h3>
                  
                  <div className="text-center py-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-2">No withdrawal methods added yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">Add a withdrawal method to receive your earnings</p>
                  </div>
                  
                  <button className="mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                    + Add New Withdrawal Method
                  </button>
                </div>
                
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium mb-4 text-gray-800 dark:text-gray-200">Supported Withdrawal Methods</h3>
                  
                  <div className="space-y-4">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold mr-3">
                          Bank
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">Bank Account (NEFT/IMPS)</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Standard bank transfer to your account</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-12 h-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold mr-3">
                          UPI
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-200">UPI</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Instant transfer to your UPI ID</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email verification modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Verify Your Email Address
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        We've sent a verification code to your email. Enter the 6-digit code below to verify your email address.
                      </p>
                      
                      {emailVerificationError && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400">
                          {emailVerificationError}
                        </div>
                      )}
                      
                      {emailVerificationSuccess && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-400">
                          {emailVerificationSuccess}
                        </div>
                      )}
                      
                      <form onSubmit={handleVerifyEmail} className="mt-4">
                        <div className="mb-4">
                          <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Verification Code
                          </label>
                          <input
                            type="text"
                            id="verification-code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                          />
                        </div>
                        
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={verifyingEmail || verificationCode.length !== 6}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {verifyingEmail ? 'Verifying...' : 'Verify Email'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowVerificationModal(false);
                              setVerificationCode('');
                              setEmailVerificationError('');
                            }}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                      
                      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        Didn't receive the code?{' '}
                        <button
                          type="button"
                          onClick={handleSendVerificationCode}
                          disabled={sendingEmailCode}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline focus:outline-none"
                        >
                          {sendingEmailCode ? 'Sending...' : 'Resend code'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Phone verification modal */}
      {showPhoneVerificationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4-4z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Verify Your Phone Number
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        We've sent a verification code to your phone. Enter the 6-digit code below to verify your phone number.
                      </p>
                      
                      {phoneVerificationError && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200">
                          {phoneVerificationError}
                        </div>
                      )}
                      
                      {phoneVerificationSuccess && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-200">
                          {phoneVerificationSuccess}
                        </div>
                      )}
                      
                      <form onSubmit={handleVerifyPhone} className="mt-4">
                        <div className="mb-4">
                          <label htmlFor="phone-verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Verification Code
                          </label>
                          <input
                            type="text"
                            id="phone-verification-code"
                            value={phoneVerificationCode}
                            onChange={(e) => setPhoneVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                          />
                        </div>
                        
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={verifyingPhone || phoneVerificationCode.length !== 6}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {verifyingPhone ? 'Verifying...' : 'Verify Phone'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPhoneVerificationModal(false);
                              setPhoneVerificationCode('');
                              setPhoneVerificationError('');
                            }}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                      
                      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
                        Didn't receive the code?{' '}
                        <button
                          type="button"
                          onClick={handleSendPhoneVerificationCode}
                          disabled={sendingPhoneCode}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline focus:outline-none"
                        >
                          {sendingPhoneCode ? 'Sending...' : 'Resend code'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication Setup Modal */}
      {showTwoFactorModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Enable Two-Factor Authentication
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Two-factor authentication adds an extra layer of security to your account. Each time you sign in, you'll need to provide a verification code.
                      </p>
                      
                      {twoFactorError && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400">
                          {twoFactorError}
                        </div>
                      )}
                      
                      {twoFactorSuccess && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 text-green-700 dark:text-green-400">
                          {twoFactorSuccess}
                        </div>
                      )}
                      
                      <form onSubmit={enableTwoFactor} className="mt-4">
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Verification Method
                          </label>
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center">
                              <input
                                id="method-sms"
                                name="method"
                                type="radio"
                                value="sms"
                                checked={preferredMethod === 'sms'}
                                onChange={() => setPreferredMethod('sms')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                disabled={!userProfile.phoneVerified}
                              />
                              <label htmlFor="method-sms" className="ml-3">
                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMS ({userProfile.phone || 'No phone number'})</span>
                                {!userProfile.phoneVerified && (
                                  <span className="block text-xs text-red-500">Phone not verified</span>
                                )}
                              </label>
                            </div>
                            
                            <div className="flex items-center">
                              <input
                                id="method-email"
                                name="method"
                                type="radio"
                                value="email"
                                checked={preferredMethod === 'email'}
                                onChange={() => setPreferredMethod('email')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                disabled={!userProfile.emailVerified}
                              />
                              <label htmlFor="method-email" className="ml-3">
                                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email ({userProfile.email})</span>
                                {!userProfile.emailVerified && (
                                  <span className="block text-xs text-red-500">Email not verified</span>
                                )}
                              </label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Confirm Password
                          </label>
                          <input
                            type="password"
                            id="password-confirm"
                            value={twoFactorPassword}
                            onChange={(e) => setTwoFactorPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="Enter your current password"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            For your security, please enter your password to enable Two-Factor Authentication.
                          </p>
                        </div>
                        
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={enablingTwoFactor || 
                                    !twoFactorPassword || 
                                    (preferredMethod === 'sms' && !userProfile.phoneVerified) || 
                                    (preferredMethod === 'email' && !userProfile.emailVerified)}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                          >
                            {enablingTwoFactor ? 'Enabling...' : 'Enable 2FA'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowTwoFactorModal(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Verification Modal */}
      {showTwoFactorSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <div className="absolute top-3 right-3">
              <button 
                type="button" 
                onClick={() => {
                  if (confirm('Are you sure you want to skip verification? You will need to verify the next time you log in.')) {
                    setShowTwoFactorSetupModal(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Verify Two-Factor Authentication</h3>
            
            <div className="bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border-l-4 border-blue-500 p-4 rounded-lg text-blue-800 dark:text-blue-200 mb-4">
              <div className="flex">
                <svg className="h-6 w-6 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium">Complete Your Setup</p>
                  <p className="mt-1 text-sm">
                    To complete the setup, please enter the verification code sent to your {preferredMethod === 'email' ? 'email' : 'phone'}.
                  </p>
                  {twoFactorSetupDestination && (
                    <p className="mt-1 text-sm font-medium">
                      {preferredMethod === 'email' 
                        ? `Email: ${twoFactorSetupDestination}`
                        : `Phone: ${twoFactorSetupDestination}`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {twoFactorSetupError && (
              <div className="bg-red-50 dark:bg-red-900 dark:bg-opacity-20 border-l-4 border-red-500 p-4 rounded-lg mb-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-500 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-700 dark:text-red-200">{twoFactorSetupError}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={verifyTwoFactorSetup} className="space-y-4">
              <div>
                <label htmlFor="setup-verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Verification Code
                </label>
                <input
                  type="text"
                  id="setup-verification-code"
                  value={twoFactorSetupCode}
                  onChange={(e) => setTwoFactorSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={verifyingTwoFactorSetup}
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
                  disabled={verifyingTwoFactorSetup || twoFactorSetupCode.length !== 6}
                >
                  {verifyingTwoFactorSetup ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </div>
              
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={resendTwoFactorSetupCode}
                  disabled={twoFactorSetupSending}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  {twoFactorSetupSending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resending...
                    </span>
                  ) : (
                    'Resend verification code'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 