import { NextRequest, NextResponse } from 'next/server';
import { generateVerificationCode, generateExpirationDate } from '@/lib/token';
import { sendVerificationCodeEmail } from '@/lib/email';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
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
        { success: false, message: 'Email is already verified' },
        { status: 400 }
      );
    }

    // Generate a verification code
    const verificationCode = generateVerificationCode(6);
    
    // Set expiration time (30 minutes from now)
    const expirationDate = generateExpirationDate(30);

    // Update user with the verification code and expiration
    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = expirationDate;
    await user.save();

    // Send the verification code email
    await sendVerificationCodeEmail(user.email, verificationCode, user.name);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      email: user.email.replace(/(.{2})(.*)(?=@)/, function(_, start, rest) {
        return start + rest.replace(/./g, '*');
      })
    });
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send verification code' },
      { status: 500 }
    );
  }
} 