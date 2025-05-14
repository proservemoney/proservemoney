import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { sendOTP } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId } = await request.json();
    
    // Validate input
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
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
    
    // Check if user has a phone number
    if (!user.phone) {
      return NextResponse.json(
        { success: false, message: 'No phone number associated with this account' },
        { status: 400 }
      );
    }
    
    // If already verified, just return success
    if (user.phoneVerified) {
      return NextResponse.json(
        { success: true, message: 'Phone is already verified' },
        { status: 200 }
      );
    }
    
    try {
      // Send OTP via Twilio
      await sendOTP(user.phone);
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Verification code sent successfully',
          phone: user.phone
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Error sending phone verification code:', error);
      
      return NextResponse.json(
        { success: false, message: error.message || 'Failed to send verification code' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in send-phone-verification API:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred while sending verification code' },
      { status: 500 }
    );
  }
} 