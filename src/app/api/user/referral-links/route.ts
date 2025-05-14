import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReferralLink from '@/models/ReferralLink';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { nanoid } from 'nanoid';
import { cookies } from 'next/headers';

// GET endpoint to retrieve all referral links for a user
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();
    
    const referralLinks = await ReferralLink.find({ 
      userId: authResult.userId 
    }).sort({ createdAt: -1 });

    return NextResponse.json({ 
      success: true, 
      referralLinks 
    });
  } catch (error) {
    console.error('Error retrieving referral links:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to retrieve referral links' 
    }, { status: 500 });
  }
}

// POST endpoint to create a new referral link
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth();
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    await connectDB();
    
    // Get the user to access their referral code
    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }

    const data = await request.json();
    const { campaign, medium, source } = data;

    // Generate a unique short ID
    const shortId = nanoid(8);

    // Create the referral link
    const newReferralLink = await ReferralLink.create({
      userId: authResult.userId,
      referralCode: user.referralCode,
      shortId,
      campaign: campaign || 'default',
      medium: medium || 'custom',
      source: source || 'direct',
      clicks: 0,
      conversions: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return NextResponse.json({ 
      success: true, 
      referralLink: newReferralLink 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating referral link:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create referral link' 
    }, { status: 500 });
  }
} 