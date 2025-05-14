import crypto from 'crypto';

/**
 * Generate a random token for email verification
 * @returns A random string to use as token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric verification code
 * @param length The length of the verification code (default: 6)
 * @returns A random numeric code
 */
export function generateVerificationCode(length = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Generate an expiration date for verification codes
 * @param minutes Minutes from now when the code will expire (default: 30)
 * @returns Date object representing the expiration time
 */
export function generateExpirationDate(minutes = 30): Date {
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
} 