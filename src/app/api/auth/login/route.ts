import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateAuthTokens } from '@/lib/token-utils';
import { logUserActivity } from '@/lib/activity-logger';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Please provide all required fields' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Log debug information for 2FA status
    console.log('User 2FA status:', {
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod
    });
    
    // Check if payment is required for this user
    if (user.status === 'pending' && !user.paymentCompleted) {
      // User needs to complete payment
      // Extract any address data if available
      let addressData = null;
      let planData = null;
      if (user.previousRegData && user.previousRegData.address) {
        addressData = user.previousRegData.address;
      }
      if (user.previousRegData && user.previousRegData.plan) {
        planData = user.previousRegData.plan;
      }
      
      return NextResponse.json({
        message: 'Payment required',
        userId: user._id,
        addressData,
        planData
      }, { status: 402 });
    }
    
    // Check if 2FA is enabled for this user
    if (user.twoFactorEnabled) {
      console.log('2FA is enabled for user, requiring verification');
      // Return a response indicating 2FA is required
      return NextResponse.json({
        message: 'Two-factor authentication required',
        requiresTwoFactor: true,
        userId: user._id,
        twoFactorMethod: user.twoFactorMethod || 'sms'
      }, { status: 200 });
    }
    
    console.log('2FA not enabled for user, proceeding with normal login');
    
    // Get IP address for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // Get user agent for logging
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    try {
      // Generate auth tokens
      const { refreshToken, expireToken } = await generateAuthTokens(user._id.toString(), ipAddress, userAgent);
      
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
      
      const expireTokenCookie = `expireToken=${expireToken}; path=/; max-age=${12 * 60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
      const refreshTokenCookie = `refreshToken=${refreshToken}; path=/; max-age=${60 * 60}; SameSite=Lax; HttpOnly${secureFlag}`;
      const userIdCookie = `userId=${userIdStr}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax${secureFlag}`;
      
      // Create response
      const response = NextResponse.json(
        { 
          message: 'Login successful', 
          user: userData
        },
        { status: 200 }
      );
      
      // Add cookies to response
      response.headers.append('Set-Cookie', expireTokenCookie);
      response.headers.append('Set-Cookie', refreshTokenCookie);
      response.headers.append('Set-Cookie', userIdCookie);
      
      // After successful login, add activity logging before returning the response
      await logUserActivity({
        userId: userIdStr,
        type: 'LOGIN',
        description: 'User logged in',
        request,
        meta: {
          ipAddress,
          userAgent
        }
      });
      
      return response;
    } catch (tokenError) {
      console.error('Login API - Token generation error:', tokenError);
      
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
          message: 'Login successful (limited session)', 
          user: userData,
          tokenError: 'Authentication tokens could not be generated. Some features may be limited.'
        },
        { status: 200 }
      );
      
      response.headers.append('Set-Cookie', userIdCookie);
      
      return response;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Login error:', error);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}