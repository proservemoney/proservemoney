import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { compare } from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Parse request body
    const { userId, password } = await request.json();
    
    // Validate input
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Check if password is provided
    if (!password) {
      return NextResponse.json(
        { success: false, message: 'Password is required to disable Two-Factor Authentication' },
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
    
    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorMethod = undefined;
    user.twoFactorCode = undefined;
    user.twoFactorCodeExpires = undefined;
    await user.save();
    
    // Log the action for security audit
    console.log(`2FA disabled for user ${userId}`);
    
    return NextResponse.json(
      { success: true, message: 'Two-Factor Authentication disabled successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error disabling 2FA:', error);
    
    return NextResponse.json(
      { success: false, message: 'An error occurred while disabling Two-Factor Authentication' },
      { status: 500 }
    );
  }
} 