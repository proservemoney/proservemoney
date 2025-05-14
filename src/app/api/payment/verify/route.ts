import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens, TEST_MODE, PAYMENT_TOKEN_EXPIRY } from '../process/route';
import connectDB from '@/lib/db';
import PaymentToken from '@/models/PaymentToken';

/**
 * API endpoint to verify a payment token
 * 
 * This endpoint:
 * 1. Checks if the token exists
 * 2. Verifies the token belongs to the correct user
 * 3. Checks if the token has expired (older than 30 minutes)
 * 4. If TEST_MODE is enabled, all verifications are bypassed
 */
export async function POST(request: NextRequest) {
  try {
    // Clean up expired tokens first
    await cleanupExpiredTokens();
    
    const body = await request.json();
    const { token, userId } = body;
    
    console.log('Payment verification request:', { token: token ? 'provided' : 'missing', userId });
    
    // Validate required fields
    if (!token || !userId) {
      console.error('Missing required fields for payment verification:', { token: !!token, userId: !!userId });
      return NextResponse.json(
        { message: 'Payment token and userId are required', expired: false },
        { status: 400 }
      );
    }
    
    // If test mode is enabled, always return success
    if (TEST_MODE) {
      console.log('=====> TEST MODE ENABLED: Payment verification bypassed <=====');
      const now = Date.now();
      const tokenExpiry = now + PAYMENT_TOKEN_EXPIRY;
      return NextResponse.json({
        success: true,
        message: 'Valid payment token (test mode)',
        remainingTime: PAYMENT_TOKEN_EXPIRY / 1000,
        expiresAt: tokenExpiry
      });
    }
    
    // Connect to database
    await connectDB();
    
    // Check if token exists in database
    const paymentData = await PaymentToken.findOne({ token });
    if (!paymentData) {
      console.error('Token not found in database:', token);
      return NextResponse.json(
        { message: 'Invalid payment token - token not found in database', expired: true },
        { status: 400 }
      );
    }
    
    console.log('Payment token found:', { 
      tokenUser: paymentData.userId, 
      requestUser: userId,
      expiresAt: new Date(paymentData.expiresAt).toISOString(),
      status: paymentData.status
    });
    
    // Verify token belongs to the correct user - compare as strings to be more forgiving
    if (paymentData.userId.toString() !== userId.toString()) {
      console.error('Token does not match user:', { 
        tokenUserId: paymentData.userId, 
        requestUserId: userId,
        tokenUserType: typeof paymentData.userId,
        requestUserType: typeof userId
      });
      return NextResponse.json(
        { message: 'Unauthorized payment token - token belongs to a different user', expired: false },
        { status: 403 }
      );
    }
    
    // Check if token has expired (older than 30 minutes)
    const now = Date.now();
    const tokenExpiry = paymentData.expiresAt;
    
    console.log('Token expiration check:', {
      now: new Date(now).toISOString(),
      expiresAt: new Date(tokenExpiry).toISOString(),
      remainingMs: tokenExpiry - now,
      remainingSec: (tokenExpiry - now) / 1000
    });
    
    if (now > tokenExpiry) {
      console.log(`Token ${token} has expired`);
      
      // Delete the expired token
      await PaymentToken.findByIdAndDelete(paymentData._id);
      
      return NextResponse.json(
        { message: 'Payment session has expired. Please try again.', expired: true },
        { status: 400 }
      );
    }
    
    // Token is valid, calculate remaining time
    const remainingMs = tokenExpiry - now;
    
    return NextResponse.json({
      success: true,
      message: 'Valid payment token',
      remainingTime: Math.floor(remainingMs / 1000), // Convert to seconds
      expiresAt: tokenExpiry
    });
    
  } catch (error) {
    console.error('Error verifying payment token:', error);
    return NextResponse.json(
      { message: 'Error verifying payment: ' + (error instanceof Error ? error.message : 'Unknown error'), expired: false },
      { status: 500 }
    );
  }
} 