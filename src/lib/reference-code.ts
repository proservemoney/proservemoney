import mongoose from 'mongoose';
import User from '@/models/User';
import ReferenceCodeUsage from '@/models/ReferenceCodeUsage';

/**
 * Generates a random reference code (5-6 characters alphanumeric)
 * Every user should have a unique referenceCode that they can share
 */
export const generateReferenceCode = (): string => {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * Checks if the given reference code exists in the database
 * This is used for validating a reference code during signup
 * @param code The reference code to check
 * @param User The User model from mongoose
 * @returns boolean indicating if the code exists
 */
export const validateReferenceCode = async (referenceCode: string): Promise<boolean> => {
  if (!referenceCode || referenceCode.length !== 6) {
    return false;
  }
  
  const user = await User.findOne({ referenceCode });
  return !!user;
};

/**
 * Generates a unique reference code for a new user
 * @param User The User model from mongoose
 * @returns A unique reference code
 */
export const assignReferenceCode = async (userId: string): Promise<string> => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // If user already has a reference code, return it
  if (user.referenceCode) {
    return user.referenceCode;
  }
  
  // Generate a unique reference code
  let referenceCode = generateReferenceCode();
  let isUnique = false;
  
  // Try up to 5 times to get a unique code
  for (let i = 0; i < 5; i++) {
    // Check if code already exists
    const existingUser = await User.findOne({ referenceCode });
    
    if (!existingUser) {
      isUnique = true;
      break;
    }
    
    // Generate a new code for the next attempt
    referenceCode = generateReferenceCode();
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique reference code');
  }
  
  // Update user with the new reference code
  user.referenceCode = referenceCode;
  await user.save();
  
  return referenceCode;
};

/**
 * Records a reference code usage for tracking purposes
 * This could be extended to track rewards, etc.
 * @param referenceCode The code being used
 * @param userId The user using the code
 */
export const recordReferenceCodeUsage = async (referenceCode: string, userId: string): Promise<void> => {
  try {
    const usage = new ReferenceCodeUsage({
      referenceCode,
      userId: new mongoose.Types.ObjectId(userId),
      usedAt: new Date()
    });
    
    await usage.save();
  } catch (error) {
    console.error('Error recording reference code usage:', error);
    throw new Error('Failed to record reference code usage');
  }
}; 