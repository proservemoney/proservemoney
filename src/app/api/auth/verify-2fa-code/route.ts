import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateAuthTokens } from '@/lib/token-utils';
import { logUserActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId, code } = await request.json();
    
    // Validate input
    if (!userId || !code) {
      console.error('Missing userId or code in 2FA verification request');
      return NextResponse.json(
        { success: false, message: 'User ID and verification code are required' },
        { status: 400 }
      );
    }
    
    console.log('Processing 2FA verification for user:', userId, 'with code:', code);
    
    // Find the user with 2FA code fields
    const user = await User.findById(userId).select('+twoFactorCode +twoFactorCodeExpires');
    if (!user) {
      console.error('User not found for 2FA verification:', userId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('User 2FA verification status:', {
      userId: user._id.toString(),
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      hasCode: !!user.twoFactorCode,
      codeExpires: user.twoFactorCodeExpires
    });
    
    // Check if 2FA is enabled for the user
    if (!user.twoFactorEnabled) {
      console.error('2FA not enabled for user:', userId);
      return NextResponse.json(
        { success: false, message: 'Two-Factor Authentication is not enabled for this user' },
        { status: 400 }
      );
    }
    
    // Check if verification code exists and is not expired
    if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
      console.error('No 2FA code found for user:', userId);
      return NextResponse.json(
        { success: false, message: 'No verification code found. Please request a new code.' },
        { status: 400 }
      );
    }
    
    // Check if verification code is expired
    const now = new Date();
    if (now > user.twoFactorCodeExpires) {
      console.error('2FA code expired for user:', userId);
      return NextResponse.json(
        { success: false, message: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }
    
    // Check if verification code matches
    if (user.twoFactorCode !== code) {
      console.error('Invalid 2FA code provided for user:', userId, 'Expected:', user.twoFactorCode, 'Received:', code);
      return NextResponse.json(
        { success: false, message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }
    
    console.log('2FA code verified successfully for user:', userId);
    
    // Clear verification code data to prevent reuse
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save();
    
    // Get IP address for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Get user agent for logging
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // Generate auth tokens
      const { accessToken, refreshToken } = await generateAuthTokens(user._id.toString());
      
      // Create user data for response
      const userIdStr = user._id.toString();
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      };
      
      // Set cookies with proper security flags
      // Determine if we should use Secure flag based on environment
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? '; Secure' : '';
      
      const accessTokenCookie = `accessToken=${accessToken}; path=/; max-age=${60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
      const refreshTokenCookie = `refreshToken=${refreshToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
      const userIdCookie = `userId=${userIdStr}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
      
      // Create response
      const response = NextResponse.json(
        { 
          success: true,
          message: 'Two-factor authentication verified successfully',
          user: userData
        },
        { status: 200 }
      );
      
      // Add cookies to response
      response.headers.append('Set-Cookie', accessTokenCookie);
      response.headers.append('Set-Cookie', refreshTokenCookie);
      response.headers.append('Set-Cookie', userIdCookie);
      
      // Log activity
      await logUserActivity({
        userId: userIdStr,
        type: 'LOGIN',
        description: 'User completed two-factor authentication',
        request,
        meta: {
          ipAddress,
          userAgent
        }
      });
      
      console.log('Login completed successfully after 2FA for user:', userId);
      
      return response;
    } catch (tokenError) {
      console.error('2FA Verification API - Token generation error:', tokenError);
      
      // Return a simplified response without tokens if token generation fails
      const userIdStr = user._id.toString();
      const userData = {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status
      };
      
      // Set a simple cookie with just the userId for basic authentication
      // Determine if we should use Secure flag based on environment
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? '; Secure' : '';
      
      const userIdCookie = `userId=${userIdStr}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax${secureFlag}`;
      
      const response = NextResponse.json(
        { 
          success: true,
          message: '2FA verified successfully (limited session)', 
          user: userData,
          tokenError: 'Authentication tokens could not be generated. Some features may be limited.'
        },
        { status: 200 }
      );
      
      response.headers.append('Set-Cookie', userIdCookie);
      
      return response;
    }
  } catch (error: any) {
    console.error('Error verifying 2FA code:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred while verifying the code' },
      { status: 500 }
    );
  }
}