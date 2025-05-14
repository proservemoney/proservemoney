import connectDB from './db';
import ReferralCodeUsage from '@/models/ReferralCodeUsage';
import User from '@/models/User';

/**
 * Every user should have a unique referralCode that they can share
 */
export const generateReferralCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  return code;
};

/**
 * Validate if a referral code exists and is valid
 * @param referralCode The code to validate
 * @returns boolean indicating if code is valid
 */
export const validateReferralCode = async (referralCode: string): Promise<boolean> => {
  if (!referralCode || referralCode.length < 4) {
    return false;
  }
  
  await connectDB();
  const user = await User.findOne({ referralCode });
  return !!user;
};

/**
 * Assign a unique referral code to a user
 * @param userId The user ID to assign the code to
 * @returns The generated referral code
 */
export const assignReferralCode = async (userId: string): Promise<string> => {
  await connectDB();
  
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  if (user.referralCode) {
    return user.referralCode;
  }
  
  // Generate a unique referral code
  let referralCode = generateReferralCode();
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!isUnique && attempts < maxAttempts) {
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    } else {
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique referral code after multiple attempts');
      }
      referralCode = generateReferralCode();
    }
  }
  
  // Update the user with the new code
  user.referralCode = referralCode;
  await user.save();
  
  return referralCode;
};

/**
 * Record when a referral code is used during signup
 * @param referralCode The code being used
 * @param userId The user ID using the code
 */
export const recordReferralCodeUsage = async (referralCode: string, userId: string): Promise<void> => {
  await connectDB();
  const usage = new ReferralCodeUsage({
    referralCode,
    userId,
  });
  
  try {
    await usage.save();
    console.log(`Recorded usage of referral code ${referralCode} by user ${userId}`);
  } catch (error) {
    console.error('Error recording referral code usage:', error);
    // Don't throw, as this is not critical for the signup process
  }
}; 