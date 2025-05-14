import { NextRequest, NextResponse } from 'next/server';
import { edgeVerifyToken, edgeCheckIP } from './lib/edge-compatible';

// Define which routes should be protected
const protectedRoutes = ['/dashboard', '/dashboard/profile', '/dashboard/wallet', '/dashboard/history', '/dashboard/referral', '/dashboard/ranking', '/dashboard/settings'];

export function middleware(request: NextRequest) {
  // Check if the requested path is a protected route
  const path = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => 
    path === route || path.startsWith(route + '/')
  );

  // Special case: if requesting the refresh token endpoint, we bypass other checks
  if (path === '/api/auth/refresh') {
    return NextResponse.next();
  }

  // Handle protected routes
  if (isProtectedRoute) {
    console.log('Checking auth for protected route:', path);
    
    // Get all authentication tokens
    const userId = request.cookies.get('userId')?.value;
    const expireToken = request.cookies.get('expireToken')?.value;
    const refreshToken = request.cookies.get('refreshToken')?.value;

    // If no auth tokens exist, redirect to login
    if (!userId) {
      console.log('No userId found, redirecting to login');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', path);
      return NextResponse.redirect(loginUrl);
    }

    // If we have a userId but missing other tokens, try to use the refresh endpoint
    if (!expireToken) {
      if (refreshToken) {
        console.log('Missing expireToken but have refreshToken, redirecting to refresh');
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        refreshUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(refreshUrl);
      } else {
        console.log('No tokens found, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', path);
        return NextResponse.redirect(loginUrl);
      }
    }

    try {
      // Attempt to verify expire token - no DB access here, only basic checks
      const decoded = edgeVerifyToken(expireToken);
      
      // If token verification fails but we have a refresh token, try to refresh
      if (!decoded && refreshToken) {
        console.log('Token verification failed, redirecting to refresh endpoint');
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        refreshUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(refreshUrl);
      }
      
      // If token verification fails and we don't have a refresh token, redirect to login
      if (!decoded && !refreshToken) {
        console.log('Token verification failed and no refresh token, redirecting to login');
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', path);
        return NextResponse.redirect(loginUrl);
      }
      
      // If token verification succeeded, perform additional checks
      if (decoded) {
        // Get IP address for simple validation
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

        // Simple IP check without database access - only if we have IP in token
        if (decoded.ip) {
          const ipValid = edgeCheckIP(decoded, ipAddress);
          if (!ipValid) {
            console.log('IP address mismatch in middleware');
            // IP mismatch but we have refresh token - try refreshing first
            if (refreshToken) {
              const refreshUrl = new URL('/api/auth/refresh', request.url);
              refreshUrl.searchParams.set('redirect', path);
              return NextResponse.redirect(refreshUrl);
            }
            // No refresh token, redirect to login
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('from', path);
            loginUrl.searchParams.set('reason', 'security');
            return NextResponse.redirect(loginUrl);
          }
        }
        
        // Check userId matches
        if (decoded.userId && decoded.userId !== userId) {
          console.log('User ID mismatch in token');
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('from', path);
          loginUrl.searchParams.set('reason', 'security');
          return NextResponse.redirect(loginUrl);
        }
      }
    } catch (error) {
      // If any error occurs during verification, fallback to forcing a refresh
      console.error('Error during middleware token verification:', error);
      if (refreshToken) {
        const refreshUrl = new URL('/api/auth/refresh', request.url);
        refreshUrl.searchParams.set('redirect', path);
        return NextResponse.redirect(refreshUrl);
      } else {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('from', path);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // Continue with the request if authentication passes or route is not protected
  return NextResponse.next();
}

// Configure middleware to run only on specified paths
export const config = {
  matcher: [
    /*
     * Match all dashboard routes:
     * - /dashboard
     * - /dashboard/profile
     * - /dashboard/wallet
     * etc.
     */
    '/dashboard',
    '/dashboard/:path*',
    /*
     * Match API routes for auth that need middleware processing
     */
    '/api/auth/refresh'
  ],
}; 