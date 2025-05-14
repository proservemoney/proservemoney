import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { valid: false, message: 'No referral code provided' },
        { status: 400 }
      );
    }

    // Check if referral code exists in the database
    const user = await User.findOne({ referralCode });
    const isValid = !!user;

    return NextResponse.json(
      { valid: isValid, message: isValid ? 'Valid referral code' : 'Invalid referral code' },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error validating referral code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { valid: false, message: 'Validation failed: ' + errorMessage },
      { status: 500 }
    );
  }
} 