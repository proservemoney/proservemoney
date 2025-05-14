import { NextRequest, NextResponse } from 'next/server';
import { invalidateToken } from '@/lib/token-utils';

export async function POST(request: NextRequest) {
  try {
    // Extract refresh token from cookies
    const refreshToken = request.cookies.get('refreshToken')?.value;
    const expireToken = request.cookies.get('expireToken')?.value;
    
    // If no tokens found, user might already be logged out
    if (!refreshToken && !expireToken) {
      console.log('No tokens found during logout - user might already be logged out');
      // Still clear cookies in response
      const response = NextResponse.json(
        { message: 'Logged out successfully' },
        { status: 200 }
      );
      
      // Clear cookies by setting them with past expiry
      response.headers.append('Set-Cookie', 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
      response.headers.append('Set-Cookie', 'expireToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
      response.headers.append('Set-Cookie', 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax');
      
      return response;
    }
    
    // Invalidate tokens in database
    if (refreshToken) {
      await invalidateToken(refreshToken);
    }
    
    if (expireToken) {
      await invalidateToken(expireToken);
    }
    
    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Clear cookies by setting them with past expiry
    response.headers.append('Set-Cookie', 'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
    response.headers.append('Set-Cookie', 'expireToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly');
    response.headers.append('Set-Cookie', 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
} 