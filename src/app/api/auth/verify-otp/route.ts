import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP, isIndianPhoneNumber } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    const { phone, otp } = await request.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { success: false, error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    // Validate that it's an Indian phone number
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
      // Verify OTP code
      const isValid = await verifyOTP(phone, otp);

      if (!isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid or expired OTP code',
            field: 'otp',
            status: 'invalid'
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Phone number verified successfully'
        },
        { status: 200 }
      );
    } catch (error: any) {
      console.error('Error during OTP verification:', error);
      
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'Failed to verify OTP',
          details: error.message 
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('General error in verify-otp route:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify OTP' },
      { status: 500 }
    );
  }
} 