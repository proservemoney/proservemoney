import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Commission from '@/models/Commission';
import Earning from '@/models/Earning';
import { verifyAuth } from '@/lib/auth';
import { getCommissionRate, PLANS } from '@/config/referralConfig';

/**
 * Endpoint to check referral status and potential commission earnings
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get user ID from params
    const { id } = await params;
    
    // Check authorization - users can only view their own details unless admin
    if (authCheck.userId !== id && !authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to view this information' },
        { status: 403 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get user data
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get user's referral ancestors
    const referralAncestors = user.referralAncestors || [];
    
    // Get user's direct referrals
    const directReferrals = await User.find({ referredBy: user._id })
      .select('_id name email createdAt status planType hasPaid');
    
    // Get commission records
    const commissions = await Commission.find({ userId: id });
    
    // Get earning records
    const earnings = await Earning.find({ userId: id, source: 'commission' });
    
    // Calculate potential earnings from each level
    const potentialEarnings = {
      basic: {} as Record<number, number>,
      premium: {} as Record<number, number>
    };
    
    // Calculate for each level 1-10
    for (let level = 1; level <= 10; level++) {
      const basicRate = getCommissionRate('basic', level);
      const premiumRate = getCommissionRate('premium', level);
      
      potentialEarnings.basic[level] = (PLANS.BASIC.amount * basicRate) / 100;
      potentialEarnings.premium[level] = (PLANS.PREMIUM.amount * premiumRate) / 100;
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        usedReferralCode: user.usedReferralCode,
        referralCount: user.referralCount
      },
      referralAncestors: referralAncestors.map(ancestor => ({
        level: ancestor.level,
        userId: ancestor.userId
      })),
      directReferrals: directReferrals.map(ref => ({
        id: ref._id,
        name: ref.name,
        email: ref.email,
        createdAt: ref.createdAt,
        status: ref.status,
        planType: ref.planType,
        hasPaid: ref.hasPaid
      })),
      commissions: commissions.map(comm => ({
        id: comm._id,
        fromUserId: comm.fromUserId,
        amount: comm.amount,
        level: comm.level,
        percentage: comm.percentage,
        planType: comm.planType,
        status: comm.status,
        createdAt: comm.createdAt
      })),
      earnings: earnings.map(earn => ({
        id: earn._id,
        amount: earn.amount,
        source: earn.source,
        referralId: earn.referralId,
        level: earn.level,
        status: earn.status,
        createdAt: earn.createdAt
      })),
      potentialEarnings
    });
  } catch (error) {
    console.error('Error fetching referral status:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch referral status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 