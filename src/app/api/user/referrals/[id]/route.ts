import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Earning from '@/models/Earning';
import { generateReferralCode } from '@/lib/referral-code';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Get the id safely from context
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    await connectDB();
    
    // Find the user with populated referral data
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Ensure user has a referral code
    if (!user.referralCode) {
      const newReferralCode = generateReferralCode();
      user.referralCode = newReferralCode;
      await user.save();
    }
    
    // Get full referral data with additional details
    // Fetch all users who were referred by this user
    const allReferrals = await User.find({ referredBy: user._id })
      .select('name email createdAt photoUrl status referralCode hasPaid paymentCompleted plan');
    
    // Process referrals to set proper status based on payment
    const referrals = allReferrals.map(ref => {
      // Convert Mongoose document to plain object
      const refObj = ref.toObject();

      // Explicitly add the plan field to the object
      refObj.plan = ref.plan;
      
      // Set status based on payment
      if (!ref.hasPaid && !ref.paymentCompleted) {
        refObj.status = 'pending';
      } else if (ref.hasPaid || ref.paymentCompleted) {
        refObj.status = 'active';
      } else {
        refObj.status = ref.status || 'pending';
      }
      
      return refObj;
    });
    
    // Get earnings from referrals
    const earnings = await Earning.find({ 
      userId: id,
      source: { $in: ['referral', 'commission'] }
    }).populate('referralId', 'name email');
    
    // Get referral links clicks from analytics (mock data for now)
    // In real app, this would be fetched from a separate analytics table
    const mockClicks = Math.max(referrals.length * 3, 10); // At least some clicks for calculation
    
    // Count only paid referrals for conversion rate
    const paidReferrals = referrals.filter(ref => ref.status === 'active');
    
    // Calculate conversion rate using paid referrals divided by total referrals
    let conversionRate = 0;
    // If there are total referrals, calculate the percentage of paid ones
    if (referrals.length > 0) {
      conversionRate = Math.min(100, Math.round((paidReferrals.length / referrals.length) * 100));
    }
    
    // Group referrals by status for conversion funnel
    const referralsByStatus = referrals.reduce((acc: any, ref) => {
      const status = ref.status;
      if (!acc[status]) {
        acc[status] = 0;
      }
      acc[status]++;
      return acc;
    }, {});
    
    // Group referrals by month for chart
    const referralsByMonth: Record<string, number> = {};
    const currentDate = new Date();
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthYearKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      referralsByMonth[monthYearKey] = 0;
    }
    
    // Fill in actual referral data (only count paid referrals)
    paidReferrals.forEach(ref => {
      const date = new Date(ref.createdAt);
      const monthYearKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (referralsByMonth[monthYearKey] !== undefined) {
        referralsByMonth[monthYearKey]++;
      }
    });
    
    // Get who referred the current user
    const referrer = user.referredBy ? 
      await User.findById(user.referredBy).select('_id name email') : 
      null;
    
    // Generate referral links
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (request ? `${request.nextUrl.protocol}//${request.headers.get('host')}` : 'http://localhost:3000');
    const signupLink = `${baseUrl}/signup?ref=${user.referralCode}`;
    
    return NextResponse.json({
      success: true,
      referrals,
      referralCount: referrals.length,
      paidReferralCount: paidReferrals.length,
      earnings,
      totalEarnings: earnings.reduce((sum, earning) => sum + earning.amount, 0),
      referrer,
      conversionRate,
      referralsByStatus,
      referralsByMonth,
      clicks: mockClicks,
      referralCode: user.referralCode,
      signupLink
    });
  } catch (error: any) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral data', message: error.message },
      { status: 500 }
    );
  }
}