import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReferralLink from '@/models/ReferralLink';

export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  try {
    await connectDB();
    const { shortId } = params;

    // Find the referral link
    const referralLink = await ReferralLink.findOne({ shortId });
    
    if (!referralLink) {
      return NextResponse.redirect(new URL('/signup', request.url));
    }
    
    // Increment click count
    referralLink.clicks += 1;
    await referralLink.save();
    
    // Construct redirect URL with all tracking parameters
    const redirectUrl = new URL('/signup', request.url);
    redirectUrl.searchParams.set('ref', referralLink.referralCode);
    redirectUrl.searchParams.set('utm_campaign', referralLink.campaign);
    redirectUrl.searchParams.set('utm_medium', referralLink.medium);
    redirectUrl.searchParams.set('utm_source', referralLink.source);
    
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error tracking referral click:', error);
    return NextResponse.redirect(new URL('/signup', request.url));
  }
} 