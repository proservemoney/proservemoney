import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { compare } from 'bcryptjs';
import { generateVerificationCode, generateExpirationDate } from '@/lib/token';
import { sendVerificationCodeEmail } from '@/lib/email';
import { sendVerificationCodeSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId, password, method } = await request.json();
    
    // Validate input
    if (!userId || !password || !method) {
      return NextResponse.json(
        { success: false, message: 'User ID, password, and method are required' },
        { status: 400 }
      );
    }
    
    // Check method value
    if (method !== 'sms' && method !== 'email') {
      return NextResponse.json(
        { success: false, message: 'Invalid verification method. Must be "sms" or "email"' },
        { status: 400 }
      );
    }
    
    // Find the user
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify password
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Verify that the user has the necessary contact info
    if (method === 'sms' && (!user.phone || !user.phoneVerified)) {
      return NextResponse.json(
        { success: false, message: 'You need a verified phone number to use SMS verification' },
        { status: 400 }
      );
    }
    
    if (method === 'email' && !user.emailVerified) {
      return NextResponse.json(
        { success: false, message: 'You need a verified email to use email verification' },
        { status: 400 }
      );
    }
    
    // Enable 2FA and set method
    user.twoFactorEnabled = true;
    user.twoFactorMethod = method;
    
    // Generate a verification code immediately to verify the setup
    const verificationCode = generateVerificationCode(6);
    const expirationDate = generateExpirationDate(10); // 10 minutes from now
    
    // Save the verification code to the user
    user.twoFactorCode = verificationCode;
    user.twoFactorCodeExpires = expirationDate;
    
    // Log before saving
    console.log('Enabling 2FA for user:', {
      userId: user._id.toString(),
      email: user.email,
      method,
      beforeSave: {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorMethod: user.twoFactorMethod,
        codeGenerated: verificationCode
      }
    });
    
    // Save the user
    await user.save();
    
    // Verify the save was successful by fetching the user again
    const updatedUser = await User.findById(userId);
    
    console.log('2FA save verification:', {
      userId: updatedUser._id.toString(),
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod
    });
    
    // Send the verification code to the user immediately
    let maskedDestination = '';
    
    try {
      if (method === 'email') {
        await sendVerificationCodeEmail(user.email, verificationCode, user.name, '2FA Setup Verification');
        maskedDestination = user.email.replace(/(.{2})(.*)(?=@)/, (_, start, rest) => start + rest.replace(/./g, '*'));
      } else if (method === 'sms') {
        await sendVerificationCodeSMS(user.phone, verificationCode);
        maskedDestination = user.phone.replace(/(\d{2})(\d+)(\d{2})/, (_, start, middle, end) => 
          start + middle.replace(/\d/g, '*') + end);
      }
      
      console.log(`2FA setup code sent via ${method} to: ${maskedDestination}`);
    } catch (sendError) {
      console.error(`Error sending 2FA setup code via ${method}:`, sendError);
      // Even if sending fails, 2FA is still enabled - user can request a new code when logging in
    }
    
    // Log the action for security audit
    console.log(`2FA enabled for user ${userId} via ${method}`);
    
    // Return a successful response with the updated 2FA status
    return NextResponse.json({
      success: true, 
      message: 'Two-Factor Authentication enabled successfully',
      twoFactorEnabled: updatedUser.twoFactorEnabled,
      twoFactorMethod: updatedUser.twoFactorMethod,
      destination: maskedDestination,
      setupPending: true // Flag to indicate setup verification is pending
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error enabling 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred while enabling Two-Factor Authentication' },
      { status: 500 }
    );
  }
} 