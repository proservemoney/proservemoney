/**
 * Utility functions for authentication
 * 
 * Note: These functions are maintained for backward compatibility with existing code.
 * New code should use NextAuth.js session management directly.
 */
import { signOut } from 'next-auth/react';

/**
 * Sets authentication data (userId) in localStorage for backward compatibility
 * @param userId User ID to store
 */
export function setAuthData(userId: string): void {
  if (!userId) {
    console.error('Cannot set authentication data: userId is empty');
    return;
  }
  
  try {
    // Set in localStorage for client-side access (for backward compatibility)
    localStorage.setItem('userId', userId);
    console.log('userId stored in localStorage for backward compatibility:', userId);
  } catch (error) {
    console.error('Error setting authentication data:', error);
  }
}

/**
 * Clears all authentication data and signs out the user using NextAuth
 */
export function clearAuthData(): void {
  try {
    // Clear from localStorage (for backward compatibility)
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('refreshTokenExpiry');
    
    // Clear any global variable fallback
    if ((window as any).userAuthId) {
      delete (window as any).userAuthId;
    }
    
    // Use NextAuth signOut to properly clear the session
    signOut({ redirect: false }).then(() => {
      console.log('NextAuth session signed out successfully');
    });
    
    console.log('Client-side authentication data cleared successfully');
  } catch (error) {
    console.error('Error clearing authentication data:', error);
  }
}

/**
 * Checks if the user is authenticated client-side (for backward compatibility)
 * 
 * Note: This function is maintained for backward compatibility.
 * New code should use NextAuth's useSession() hook or getSession() function.
 * 
 * @returns boolean indicating if user is authenticated based on localStorage
 */
export function isAuthenticated(): boolean {
  try {
    // For backward compatibility, check if userId exists in localStorage
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Check if we have expiry information
      const sessionExpiry = getSessionExpiry();
      const refreshTokenExpiry = getRefreshTokenExpiry();
      
      if (sessionExpiry || refreshTokenExpiry) {
        const now = new Date();
        
        // If session is still valid, user is authenticated
        if (sessionExpiry && sessionExpiry > now) {
          console.log('User authenticated via valid session');
          return true;
        }
        
        // If session expired but refresh token is valid, try to refresh
        if (refreshTokenExpiry && refreshTokenExpiry > now) {
          console.log('Session expired but refresh token valid - attempting refresh');
          // Call refresh endpoint (non-blocking)
          refreshSession().catch(err => console.error('Error refreshing session:', err));
          // Return true for now, refresh will handle redirects if needed
          return true;
        }
        
        console.log('Refresh token expired or not available');
        return false;
      }
      
      // If we don't have expiry info but have userId, cautiously return true
      // This might happen if the page is loaded for the first time
      console.log('User has userId but no expiry info - assuming authenticated');
      return true;
    }
    
    // Check global variable last resort
    if ((window as any).userAuthId) {
      console.log('User authenticated via global variable, syncing to localStorage');
      const globalId = (window as any).userAuthId;
      localStorage.setItem('userId', globalId);
      return true;
    }
    
    console.log('User not authenticated');
    return false;
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return false;
  }
}

/**
 * Gets the current user ID
 * @returns the user ID or null if not authenticated
 */
export function getUserId(): string | null {
  try {
    // Check localStorage first
    const userId = localStorage.getItem('userId');
    if (userId) return userId;
    
    // Check global variable last resort
    if ((window as any).userAuthId) {
      return (window as any).userAuthId;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

/**
 * Store session expiry time in localStorage
 * @param expiryDate Session expiry date
 */
export function setSessionExpiry(expiryDate: Date): void {
  try {
    localStorage.setItem('sessionExpiry', expiryDate.toISOString());
  } catch (error) {
    console.error('Error setting session expiry:', error);
  }
}

/**
 * Store refresh token expiry time in localStorage
 * @param expiryDate Refresh token expiry date
 */
export function setRefreshTokenExpiry(expiryDate: Date): void {
  try {
    localStorage.setItem('refreshTokenExpiry', expiryDate.toISOString());
  } catch (error) {
    console.error('Error setting refresh token expiry:', error);
  }
}

/**
 * Get session expiry time from localStorage
 * @returns Session expiry date or null if not set
 */
export function getSessionExpiry(): Date | null {
  try {
    const expiryStr = localStorage.getItem('sessionExpiry');
    return expiryStr ? new Date(expiryStr) : null;
  } catch (error) {
    console.error('Error getting session expiry:', error);
    return null;
  }
}

/**
 * Get refresh token expiry time from localStorage
 * @returns Refresh token expiry date or null if not set
 */
export function getRefreshTokenExpiry(): Date | null {
  try {
    const expiryStr = localStorage.getItem('refreshTokenExpiry');
    return expiryStr ? new Date(expiryStr) : null;
  } catch (error) {
    console.error('Error getting refresh token expiry:', error);
    return null;
  }
}

/**
 * Refresh the session by calling the refresh token API
 * @returns Promise resolving to a boolean indicating success
 */
export async function refreshSession(): Promise<boolean> {
  try {
    console.log('Attempting to refresh session');
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to refresh session:', response.status);
      // Clear local storage if refresh failed
      clearAuthData();
      return false;
    }
    
    const data = await response.json();
    
    // Update expiry information in localStorage
    if (data.refreshTokenExpiry) {
      setRefreshTokenExpiry(new Date(data.refreshTokenExpiry));
    }
    
    if (data.sessionExpiry) {
      setSessionExpiry(new Date(data.sessionExpiry));
    }
    
    console.log('Session refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}

/**
 * Log out the user by calling the logout API
 * Also clears local storage
 * @returns Promise resolving to a boolean indicating success
 */
export async function logout(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Clear client-side data regardless of server response
    clearAuthData();
    
    if (!response.ok) {
      console.error('Error during server-side logout:', response.status);
      return false;
    }
    
    console.log('Logged out successfully');
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear client-side data even if server request fails
    clearAuthData();
    return false;
  }
}