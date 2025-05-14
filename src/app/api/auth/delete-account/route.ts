import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function DELETE(request: NextRequest) {
  try {
    // Get userId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if the user has already completed payment
    if (user.paymentCompleted) {
      return NextResponse.json(
        { message: 'Cannot delete an account that has completed payment' },
        { status: 400 }
      );
    }
    
    // Delete the user
    await User.findByIdAndDelete(userId);
    
    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    console.error('Delete account error:', errorMessage);
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
} 