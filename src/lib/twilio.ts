// Twilio implementation for OTP verification
import { Twilio } from 'twilio';

// Initialize Twilio client
const isDevelopment = process.env.NODE_ENV === 'development';
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN 
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID

// Initialize Twilio client
let twilioClient: Twilio | null = null;

try {
  twilioClient = new Twilio(accountSid, authToken);
} catch (error) {
  console.error('Failed to initialize Twilio client:', error);
}

// Store OTPs in memory for development
const otpStore: Record<string, { otp: string; expiry: number }> = {};

// Check if a phone number is Indian (+91)
export const isIndianPhoneNumber = (phoneNumber: string): boolean => {
  // Remove any spaces, dashes, or parentheses
  const cleanedNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Check if it starts with +91 or 91 followed by 10 digits
  return /^(\+?91)?[6-9]\d{9}$/.test(cleanedNumber);
};

// Format phone number to E.164 format (+91XXXXXXXXXX)
export const formatIndianPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters except '+'
  const digits = phoneNumber.replace(/[^\d+]/g, '');
  
  // If already in correct format with +91, return as is
  if (/^\+91\d{10}$/.test(digits)) {
    return digits;
  }
  
  // If starts with 91 and has 10 digits after, add the +
  if (/^91\d{10}$/.test(digits)) {
    return '+' + digits;
  }
  
  // If just 10 digits, add +91
  if (/^\d{10}$/.test(digits) && /^[6-9]/.test(digits)) {
    return '+91' + digits;
  }
  
  throw new Error('Invalid Indian phone number format');
};

// Generate a random 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS
export const sendOTP = async (phoneNumber: string): Promise<boolean> => {
  try {
    // Format phone number to E.164 format
    const formattedNumber = formatIndianPhoneNumber(phoneNumber);
    
    if (isDevelopment && !twilioClient) {
      // In development without Twilio credentials, generate a mock OTP and store it
      const otp = generateOTP();
      
      // Store the OTP with a 10-minute expiry
      otpStore[formattedNumber] = {
        otp,
        expiry: Date.now() + 10 * 60 * 1000 // 10 minutes
      };
      
      // Log the OTP for testing purposes
      console.log(`[MOCK] OTP sent to ${formattedNumber}: ${otp}`);
      
      return true;
    } else {
      // In production or dev with Twilio credentials, use real Twilio
      if (!twilioClient) {
        throw new Error('Twilio client not initialized');
      }
      
      const verification = await twilioClient.verify.v2.services(verifyServiceSid)
        .verifications
        .create({ to: formattedNumber, channel: 'sms' });
      
      console.log(`Verification SID: ${verification.sid} sent to ${formattedNumber}`);
      return verification.status === 'pending';
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

// Verify OTP code
export const verifyOTP = async (phoneNumber: string, otp: string): Promise<boolean> => {
  try {
    // Format phone number to E.164 format
    const formattedNumber = formatIndianPhoneNumber(phoneNumber);
    
    if (isDevelopment && !twilioClient) {
      // In development without Twilio credentials, check against our stored OTPs
      const storedData = otpStore[formattedNumber];
      
      if (!storedData) {
        console.log(`[MOCK] No OTP found for ${formattedNumber}`);
        return false;
      }
      
      if (Date.now() > storedData.expiry) {
        console.log(`[MOCK] OTP for ${formattedNumber} has expired`);
        delete otpStore[formattedNumber]; // Clean up expired OTP
        return false;
      }
      
      const isValid = storedData.otp === otp;
      console.log(`[MOCK] OTP verification for ${formattedNumber}: ${isValid ? 'SUCCESS' : 'FAILED'}`);
      
      if (isValid) {
        delete otpStore[formattedNumber]; // Clean up used OTP
      }
      
      return isValid;
    } else {
      // In production or dev with Twilio credentials, use real Twilio
      if (!twilioClient) {
        throw new Error('Twilio client not initialized');
      }
      
      const verificationCheck = await twilioClient.verify.v2.services(verifyServiceSid)
        .verificationChecks
        .create({ to: formattedNumber, code: otp });
      
      return verificationCheck.status === 'approved';
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}; 