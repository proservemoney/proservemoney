import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AuthToken from '@/models/AuthToken';
import connectDB from '@/lib/db';

// Set token expiration times
export const REFRESH_TOKEN_EXPIRY = 60 * 60; // 1 hour in seconds
export const EXPIRE_TOKEN_EXPIRY = 12 * 60 * 60; // 12 hours in seconds

// JWT secret - ideally should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'proservemoney-default-jwt-secret-key-replace-in-production';

/**
 * Get basic device info from user agent string
 * @param userAgent User agent string from request headers
 * @returns Object containing device info
 */
export function getDeviceInfo(userAgent: string): string {
  try {
    // Simple device detection without ua-parser-js
    // This is a simplified implementation for basic device detection
    const deviceInfo = {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };
    
    // Handle undefined or empty user agent
    if (!userAgent || userAgent === 'Unknown') {
      return JSON.stringify(deviceInfo);
    }
    
    // Detect OS
    if (userAgent.includes('Windows')) {
      deviceInfo.os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      deviceInfo.os = 'Mac OS';
    } else if (userAgent.includes('Android')) {
      deviceInfo.os = 'Android';
    } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      deviceInfo.os = 'iOS';
    } else if (userAgent.includes('Linux')) {
      deviceInfo.os = 'Linux';
    }
    
    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      deviceInfo.browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo.browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      deviceInfo.browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      deviceInfo.browser = 'Edge';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
      deviceInfo.browser = 'Internet Explorer';
    }
    
    // Detect device type
    if (userAgent.includes('Mobile')) {
      deviceInfo.device = 'Mobile';
    } else if (userAgent.includes('Tablet')) {
      deviceInfo.device = 'Tablet';
    } else {
      deviceInfo.device = 'Desktop';
    }
    
    return JSON.stringify(deviceInfo);
  } catch (error) {
    console.error('Error parsing user agent:', error);
    // Return a fallback device info if parsing fails
    return JSON.stringify({
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    });
  }
}

/**
 * Verify a JWT token - Safe for middleware (no DB access)
 * @param token JWT token to verify
 * @returns Decoded token payload or null if invalid
 */
export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Simple IP check for tokens in middleware (no DB access)
 * @param token Decoded token object
 * @param ipAddress Current IP address 
 * @returns Whether the IP matches
 */
export function checkTokenIP(token: any, ipAddress: string): boolean {
  try {
    if (!token || typeof token !== 'object' || !token.ip) {
      return false;
    }
    
    return token.ip === ipAddress;
  } catch (error) {
    console.error('Error checking token IP:', error);
    return false;
  }
}

// =========================================================================
// SERVER-ONLY FUNCTIONS BELOW - DO NOT USE IN MIDDLEWARE
// These functions require database access and won't work in Edge runtime
// =========================================================================

/**
 * Generate refresh and expire tokens for user authentication
 * @param userId User ID to include in the token
 * @param ipAddress User's IP address
 * @param userAgent User's browser/device user agent
 * @returns Object containing the generated tokens and expiry times
 */
export async function generateAuthTokens(userId: string, ipAddress: string, userAgent: string) {
  try {
    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required for token generation');
    }
    
    // Use safe defaults for IP and user agent if they're not provided
    const safeIpAddress = ipAddress || '127.0.0.1';
    const safeUserAgent = userAgent || 'Unknown';
    
    await connectDB();
    
    const deviceInfo = getDeviceInfo(safeUserAgent);
    
    let refreshToken, expireToken;
    
    try {
      // Generate refresh token (JWT with 1 hour expiry)
      refreshToken = jwt.sign(
        { 
          userId, 
          type: 'refresh',
          ip: safeIpAddress,
          deviceInfo 
        }, 
        JWT_SECRET, 
        { expiresIn: REFRESH_TOKEN_EXPIRY }
      );
    } catch (jwtError) {
      console.error('Error generating refresh token:', jwtError);
      throw new Error('Failed to generate refresh token');
    }
    
    try {
      // Generate expire token (JWT with 12 hours expiry)
      expireToken = jwt.sign(
        { 
          userId, 
          type: 'expire',
          ip: safeIpAddress,
          deviceInfo 
        }, 
        JWT_SECRET, 
        { expiresIn: EXPIRE_TOKEN_EXPIRY }
      );
    } catch (jwtError) {
      console.error('Error generating expire token:', jwtError);
      throw new Error('Failed to generate expire token');
    }
    
    // Calculate expiry dates
    const now = new Date();
    const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY * 1000);
    const expireTokenExpiresAt = new Date(now.getTime() + EXPIRE_TOKEN_EXPIRY * 1000);
    
    // Save tokens to database
    const authToken = new AuthToken({
      userId,
      refreshToken,
      expireToken,
      ipAddress: safeIpAddress,
      userAgent: safeUserAgent,
      deviceInfo,
      refreshTokenExpiresAt,
      expireTokenExpiresAt,
      isValid: true
    });
    
    await authToken.save();
    
    return {
      refreshToken,
      expireToken,
      refreshTokenExpiresAt,
      expireTokenExpiresAt
    };
  } catch (error) {
    console.error('Error generating auth tokens:', error);
    throw error;
  }
}

/**
 * Validate whether a token is valid based on IP and device info
 * @param token Token to validate
 * @param ipAddress Current IP address
 * @param userAgent Current user agent
 * @returns Boolean indicating if token is valid
 */
export async function validateTokenEnvironment(tokenId: string, ipAddress: string, userAgent: string) {
  try {
    await connectDB();
    
    // Find token in database
    const storedToken = await AuthToken.findOne({
      $or: [
        { refreshToken: tokenId },
        { expireToken: tokenId }
      ],
      isValid: true
    });
    
    if (!storedToken) {
      console.error('Token not found in database');
      return false;
    }
    
    // Check if IP matches
    if (storedToken.ipAddress !== ipAddress) {
      console.error('IP address mismatch');
      return false;
    }
    
    // Get device info for current request
    const currentDeviceInfo = getDeviceInfo(userAgent);
    
    // Check if device info matches (allowing for minor variations by comparing parsed objects)
    const storedDeviceObj = JSON.parse(storedToken.deviceInfo);
    const currentDeviceObj = JSON.parse(currentDeviceInfo);
    
    // Compare OS and browser for device validation
    // We're being lenient here by only checking the name, not the version
    if (
      storedDeviceObj.browser !== 'Unknown' && 
      currentDeviceObj.browser !== 'Unknown' &&
      storedDeviceObj.browser !== currentDeviceObj.browser
    ) {
      console.error('Browser mismatch');
      return false;
    }
    
    if (
      storedDeviceObj.os !== 'Unknown' && 
      currentDeviceObj.os !== 'Unknown' &&
      storedDeviceObj.os !== currentDeviceObj.os
    ) {
      console.error('OS mismatch');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token environment:', error);
    return false;
  }
}

/**
 * Invalidate all tokens for a user
 * @param userId User ID to invalidate tokens for
 */
export async function invalidateAllUserTokens(userId: string) {
  try {
    await connectDB();
    
    // Mark all tokens for this user as invalid
    await AuthToken.updateMany(
      { userId },
      { $set: { isValid: false } }
    );
    
    console.log(`Invalidated all tokens for user ${userId}`);
  } catch (error) {
    console.error('Error invalidating user tokens:', error);
    throw error;
  }
}

/**
 * Invalidate a specific token
 * @param tokenId Token to invalidate
 */
export async function invalidateToken(tokenId: string) {
  try {
    await connectDB();
    
    // Mark token as invalid
    await AuthToken.updateOne(
      { 
        $or: [
          { refreshToken: tokenId },
          { expireToken: tokenId }
        ]
      },
      { $set: { isValid: false } }
    );
    
    console.log(`Invalidated token ${tokenId}`);
  } catch (error) {
    console.error('Error invalidating token:', error);
    throw error;
  }
}

/**
 * Refresh a user's tokens
 * @param refreshToken Current refresh token
 * @param ipAddress User's IP address
 * @param userAgent User's browser/device user agent
 * @returns New tokens if successful, null if refresh failed
 */
export async function refreshUserTokens(refreshToken: string, ipAddress: string, userAgent: string) {
  try {
    // First verify the token is valid
    const decoded = verifyToken(refreshToken);
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      console.error('Invalid refresh token');
      return null;
    }
    
    // Then validate environment
    const isEnvironmentValid = await validateTokenEnvironment(refreshToken, ipAddress, userAgent);
    if (!isEnvironmentValid) {
      console.error('Token environment validation failed');
      return null;
    }
    
    await connectDB();
    
    // Find token in database
    const storedToken = await AuthToken.findOne({ refreshToken, isValid: true });
    if (!storedToken) {
      console.error('Refresh token not found or invalid');
      return null;
    }
    
    // Check if refresh token is expired
    if (new Date() > storedToken.refreshTokenExpiresAt) {
      console.error('Refresh token expired');
      return null;
    }
    
    // Invalidate the current token
    storedToken.isValid = false;
    await storedToken.save();
    
    // Generate new tokens
    const userId = storedToken.userId;
    const newTokens = await generateAuthTokens(userId, ipAddress, userAgent);
    
    return newTokens;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    return null;
  }
} 