import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { generateVerificationCode, generateExpirationDate } from '@/lib/token';
import { sendVerificationCodeEmail } from '@/lib/email';
import { sendVerificationCodeSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId } = await request.json();
    
    // Validate input
    if (!userId) {
      console.error('Missing userId in 2FA code request');
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    console.log('Processing 2FA code request for user:', userId);
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found for 2FA code request:', userId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('User 2FA status:', {
      userId: user._id.toString(),
      email: user.email,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorMethod: user.twoFactorMethod
    });
    
    // Check if 2FA is enabled for the user
    if (!user.twoFactorEnabled) {
      console.error('2FA not enabled for user:', userId);
      return NextResponse.json(
        { success: false, message: 'Two-Factor Authentication is not enabled for this user' },
        { status: 400 }
      );
    }
    
    // Generate a verification code
    const verificationCode = generateVerificationCode(6);
    
    // Set expiration time (10 minutes from now)
    const expirationDate = generateExpirationDate(10);
    
    // Update user with the verification code and expiration
    user.twoFactorCode = verificationCode;
    user.twoFactorCodeExpires = expirationDate;
    
    console.log('Saving 2FA code for user:', {
      userId: user._id.toString(),
      code: verificationCode,
      expires: expirationDate
    });
    
    await user.save();
    
    // Determine which method to use for sending the code
    const method = user.twoFactorMethod || 'sms';
    
    console.log('Using 2FA method:', method, 'for user:', userId);
    
    // Send the verification code
    if (method === 'email') {
      if (!user.emailVerified) {
        console.error('Email not verified for 2FA code request:', userId);
        return NextResponse.json(
          { success: false, message: 'Email is not verified' },
          { status: 400 }
        );
      }
      
      await sendVerificationCodeEmail(user.email, verificationCode, user.name, 'Login Verification');
      
      const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, function(_, start, rest) {
        return start + rest.replace(/./g, '*');
      });
      
      console.log('2FA code sent via email to:', maskedEmail);
      
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        method: 'email',
        email: maskedEmail
      });
    } else if (method === 'sms') {
      if (!user.phone || !user.phoneVerified) {
        console.error('Phone not verified for 2FA code request:', userId);
        return NextResponse.json(
          { success: false, message: 'Phone is not verified' },
          { status: 400 }
        );
      }
      
      await sendVerificationCodeSMS(user.phone, verificationCode);
      
      const maskedPhone = user.phone.replace(/(\d{2})(\d+)(\d{2})/, function(_, start, middle, end) {
        return start + middle.replace(/\d/g, '*') + end;
      });
      
      console.log('2FA code sent via SMS to:', maskedPhone);
      
      return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully',
        method: 'sms',
        phone: maskedPhone
      });
    } else {
      console.error('Invalid 2FA method for user:', userId, 'method:', method);
      return NextResponse.json(
        { success: false, message: 'Invalid two-factor authentication method' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error sending 2FA code:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred while sending the verification code' },
      { status: 500 }
    );
  }
} 