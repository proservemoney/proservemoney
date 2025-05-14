import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, message: 'User ID and verification code are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user's email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: 'Email is already verified' }
      );
    }

    // Check if verification code exists and is not expired
    if (!user.emailVerificationCode || !user.emailVerificationExpires) {
      return NextResponse.json(
        { success: false, message: 'No verification code found. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if verification code is expired
    const now = new Date();
    if (now > user.emailVerificationExpires) {
      return NextResponse.json(
        { success: false, message: 'Verification code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Check if verification code matches
    if (user.emailVerificationCode !== code) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // Mark email as verified and clear verification code data
    user.emailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying email code:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify email' },
      { status: 500 }
    );
  }
} 