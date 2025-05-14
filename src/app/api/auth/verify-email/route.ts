import { NextRequest, NextResponse } from 'next/server';
import { verifyEmail, isEmailValid } from '@/lib/email-verification';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Verify email using multiple services
    const verificationResults = await verifyEmail(email);
    const isValidEmail = isEmailValid(verificationResults);

    return NextResponse.json({
      isValid: isValidEmail,
      details: verificationResults.map(result => ({
        service: result.service,
        status: result.details?.status,
        reason: result.details?.reason,
        score: result.details?.score
      }))
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
} 