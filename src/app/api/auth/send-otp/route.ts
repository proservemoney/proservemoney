import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { isIndianPhoneNumber, sendOTP } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Check if phone number is already in use
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone number already registered', 
          field: 'phone',
          status: 'exists'
        },
        { status: 400 }
      );
    }

    // Validate Indian phone number
    if (!isIndianPhoneNumber(phone)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only Indian phone numbers (+91) are supported',
          field: 'phone',
          status: 'invalid'
        },
        { status: 400 }
      );
    }

    try {
      // Send OTP via Twilio (or mock)
      await sendOTP(phone);
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'OTP sent successfully'
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      
      // Handle errors from our mock or real Twilio
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to send verification code',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General error in send-otp route:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send OTP' },
      { status: 500 }
    );
  }
} 