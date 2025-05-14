import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Extract user ID from params (properly handled as async)
    const { id: userId } = await params;
    
    console.log(`Fetching user with ID: ${userId}`);
    
    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }
    
    // Fetch user from the database
    const user = await User.findById(userId)
      .select('-password') // Exclude password
      .lean(); // Convert to plain object
    
    // If user not found
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    console.log('User data retrieved successfully:', {
      id: user._id,
      name: user.name,
      email: user.email,
      hasPhone: !!user.phone,
      hasAddress: !!user.previousRegData?.address
    });
    
    // Return user data
    return NextResponse.json({ 
      success: true, 
      user: {
        ...user,
        // Make sure phone is included explicitly
        phone: user.phone || '',
      }
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch user data' }, { status: 500 });
  }
} 