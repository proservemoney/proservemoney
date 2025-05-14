import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyOTP } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId, code } = await request.json();
    
    // Validate input
    if (!userId || !code) {
      return NextResponse.json(
        { success: false, message: 'User ID and verification code are required' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // If already verified, just return success
    if (user.phoneVerified) {
      return NextResponse.json(
        { success: true, message: 'Phone is already verified' },
        { status: 200 }
      );
    }
    
    // Verify the OTP code
    try {
      const isValid = await verifyOTP(user.phone, code);
      
      if (!isValid) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired verification code' },
          { status: 400 }
        );
      }
      
      // Update user's phone verification status
      user.phoneVerified = true;
      await user.save();
      
      return NextResponse.json(
        { success: true, message: 'Phone verified successfully' },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Error verifying phone:', error);
      
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to verify phone' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in verify-phone-code API:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred during phone verification' },
      { status: 500 }
    );
  }
} 