/**
 * Edge-compatible utility functions
 * 
 * These functions are designed to work in Edge runtime (like middleware)
 * where full Node.js APIs like MongoDB connections are not available.
 */

// Simplified token verification for Edge - no crypto dependency
/**
 * Very basic token verification - simply checks for existence and basic format
 * This does NOT validate the signature but simply does structural validation
 * @param token JWT token to verify
 * @returns Simple decoded token or null if basic format is invalid
 */
export function edgeVerifyToken(token: string) {
  try {
    // Simple token format check
    if (!token || typeof token !== 'string') {
      return null;
    }

    // Split into parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Try to decode the payload (middle part)
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      
      // Check for token expiration
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return null; // Token expired
      }
      
      return payload;
    } catch (e) {
      return null;
    }
  } catch (error) {
    console.error('Edge token verification failed:', error);
    return null;
  }
}

/**
 * Check IP address against token in Edge runtime
 * @param token Decoded token
 * @param ipAddress IP address to check
 * @returns Whether IP matches the token
 */
export function edgeCheckIP(token: any, ipAddress: string): boolean {
  try {
    if (!token || typeof token !== 'object' || !token.ip) {
      return false;
    }
    
    return token.ip === ipAddress;
  } catch (error) {
    console.error('Error checking IP in Edge runtime:', error);
    return false;
  }
}

/**
 * Simple device info extraction in Edge runtime
 * @param userAgent User agent string
 * @returns Device info as string
 */
export function edgeGetDeviceInfo(userAgent: string): string {
  try {
    // Simple device detection
    const deviceInfo = {
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    };
    
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
    console.error('Error getting device info in Edge runtime:', error);
    return JSON.stringify({
      browser: 'Unknown',
      os: 'Unknown',
      device: 'Unknown'
    });
  }
} 