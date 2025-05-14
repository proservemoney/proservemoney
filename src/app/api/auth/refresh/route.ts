import { NextRequest, NextResponse } from 'next/server';
import { refreshUserTokens } from '@/lib/token-utils';

// Support for both POST and GET (from middleware redirects)
export async function GET(request: NextRequest) {
  return handleTokenRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleTokenRefresh(request);
}

async function handleTokenRefresh(request: NextRequest) {
  try {
    // Extract refresh token from cookies
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    // If no refresh token found, return error
    if (!refreshToken) {
      // Check if there's a redirect URL in the query parameters
      const url = new URL(request.url);
      const redirectTo = url.searchParams.get('redirect');
      
      // If there's a redirect parameter, redirect to login
      if (redirectTo) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', redirectTo);
        return NextResponse.redirect(loginUrl);
      }
      
      // Return a properly formatted JSON error response
      return NextResponse.json(
        { message: 'Refresh token required', success: false },
        { status: 401 }
      );
    }
    
    // Get IP address from request
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    
    // Get user agent from request
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    
    // Refresh tokens
    const newTokens = await refreshUserTokens(refreshToken, ipAddress, userAgent);
    
    // Check for redirect parameter
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirect');
    
    // If token refresh failed, return error or redirect to login
    if (!newTokens) {
      // If there's a redirect parameter, redirect to login
      if (redirectTo) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', redirectTo);
        return NextResponse.redirect(loginUrl);
      }
      
      // Create a properly formatted JSON response
      const response = NextResponse.json(
        { message: 'Invalid refresh token or session', success: false },
        { status: 401 }
      );
      
      // Clear cookies by setting them with past expiry
      response.headers.append('Set-Cookie', 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
      response.headers.append('Set-Cookie', 'expireToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
      response.headers.append('Set-Cookie', 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax');
      
      return response;
    }
    
    // Extract userId from existing cookie
    const userId = request.cookies.get('userId')?.value;
    
    // Create cookies for new tokens with proper security flags
    // Determine if we should use Secure flag based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const secureFlag = isProduction ? '; Secure' : '';
    
    // Set cookie expiry times to match the token expiry times
    const refreshTokenCookie = `refreshToken=${newTokens.refreshToken}; path=/; max-age=${60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
    const expireTokenCookie = `expireToken=${newTokens.expireToken}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
    
    // If there's a redirect parameter, redirect to that URL
    if (redirectTo) {
      const response = NextResponse.redirect(new URL(redirectTo, request.url));
      
      // Set new cookies
      response.headers.append('Set-Cookie', refreshTokenCookie);
      response.headers.append('Set-Cookie', expireTokenCookie);
      
      // Set userId cookie if we have it
      if (userId) {
        response.headers.append('Set-Cookie', `userId=${userId}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax${secureFlag}`);
      }
      
      return response;
    }
    
    // If no redirect, create a JSON response with token info
    const response = NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        refreshTokenExpiry: newTokens.refreshTokenExpiresAt,
        sessionExpiry: newTokens.expireTokenExpiresAt
      },
      { status: 200 }
    );
    
    // Set new cookies
    response.headers.append('Set-Cookie', refreshTokenCookie);
    response.headers.append('Set-Cookie', expireTokenCookie);
    
    // Set userId cookie if we have it
    if (userId) {
      response.headers.append('Set-Cookie', `userId=${userId}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax${secureFlag}`);
    }
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    
    // Check for redirect parameter
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirect');
    
    // If there's a redirect parameter, redirect to login
    if (redirectTo) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', redirectTo);
      loginUrl.searchParams.set('error', 'refresh_failed');
      return NextResponse.redirect(loginUrl);
    }
    
    return NextResponse.json(
      { 
        success: false,
        message: 'An error occurred during token refresh' 
      },
      { status: 500 }
    );
  }
}