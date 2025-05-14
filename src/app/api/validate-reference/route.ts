import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { referenceCode } = await request.json();
    
    // Validate input
    if (!referenceCode) {
      return NextResponse.json(
        { valid: false, message: 'Missing reference code' },
        { status: 400 }
      );
    }

    // Check if reference code exists
    const existingUser = await User.findOne({ referenceCode });

    return NextResponse.json({
      valid: !!existingUser,
      message: existingUser ? 'Valid reference code' : 'Invalid reference code'
    });
    
  } catch (error: unknown) {
    console.error('Reference code validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { valid: false, message: 'Validation failed: ' + errorMessage },
      { status: 500 }
    );
  }
} 