import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import ReferralLink from '@/models/ReferralLink';
import { nanoid } from 'nanoid';
import { sign } from 'jsonwebtoken';

// Secret key for JWT signing (should be in env vars in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { userId, campaign, medium, source } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    if (!user.referralCode) {
      return NextResponse.json(
        { error: 'User does not have a referral code' },
        { status: 400 }
      );
    }
    
    // Create a unique short ID for this particular referral link
    const shortId = nanoid(8);
    
    // Create a JWT token with referral code and custom parameters
    const linkData = {
      referralCode: user.referralCode,
      campaign: campaign || 'default',
      medium: medium || 'custom',
      source: source || 'direct',
      shortId
    };
    
    const token = sign(
      linkData,
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '365d' }
    );
    
    // Generate base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Create standard signup link with query parameters
    const signupLink = `${baseUrl}/signup?ref=${user.referralCode}${campaign ? `&utm_campaign=${encodeURIComponent(campaign)}` : ''}${medium ? `&utm_medium=${encodeURIComponent(medium)}` : ''}${source ? `&utm_source=${encodeURIComponent(source)}` : ''}`;
    
    // Create trackable short link
    const trackableLink = `${baseUrl}/r/${shortId}`;
    
    // Save referral link in database for tracking
    const newLink = new ReferralLink({
      userId: user._id,
      referralCode: user.referralCode,
      shortId,
      campaign: campaign || 'default',
      medium: medium || 'custom',
      source: source || 'direct',
      clicks: 0,
      conversions: 0
    });
    
    await newLink.save();
    
    return NextResponse.json({
      success: true,
      userName: user.name,
      referralCode: user.referralCode,
      links: {
        signup: signupLink,
        trackable: trackableLink,
      },
      token,
      shortId,
      campaign: campaign || 'default',
      medium: medium || 'custom',
      source: source || 'direct'
    });
  } catch (error: any) {
    console.error('Error generating referral link:', error);
    return NextResponse.json(
      { error: 'Failed to generate referral link', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Find all custom referral links for this user
    const links = await ReferralLink.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);
    
    return NextResponse.json({
      success: true,
      links
    });
  } catch (error: any) {
    console.error('Error fetching referral links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral links', message: error.message },
      { status: 500 }
    );
  }
} 