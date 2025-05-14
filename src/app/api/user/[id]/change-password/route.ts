import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('Change password API called');
  
  try {
    // Verify authentication
    const authResult = await verifyAuth();
    if (!authResult.success) {
      console.error('Authentication failed:', authResult);
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user ID from params
    const userId = params.id;
    
    // Check authorization - users can only change their own password
    if (authResult.userId !== userId) {
      console.error('Authorization failed: User attempting to change different user password');
      return NextResponse.json(
        { success: false, message: 'Unauthorized to change this password' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const { currentPassword, newPassword } = await request.json();
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Password strength validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Fetch user with password field explicitly selected
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Add a check to ensure password exists
    if (!user.password) {
      console.error('User found but password field is missing');
      return NextResponse.json(
        { success: false, message: 'Cannot verify password. Please contact support.' },
        { status: 500 }
      );
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 400 }
      );
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in database
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
    
  } catch (error: any) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to change password' },
      { status: 500 }
    );
  }
} 