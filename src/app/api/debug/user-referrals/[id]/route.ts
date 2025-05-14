import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Commission from '@/models/Commission';
import { verifyAuth } from '@/lib/auth';

/**
 * Debug endpoint to visualize a user's referral structure and payment statuses
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
    
    // Only admins or the user themselves can access this info
    if (authCheck.userId !== id && !authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to access this information' },
        { status: 403 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get user
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get direct referrals
    const directReferrals = await User.find({ referredBy: user._id })
      .select('_id name email referralCode hasPaid paymentCompleted planType status createdAt');
    
    // Get who referred this user
    const referrer = user.referredBy ? 
      await User.findById(user.referredBy).select('_id name email referralCode') : 
      null;
    
    // Get commissions paid to this user
    const commissionsReceived = await Commission.find({ userId: user._id })
      .select('fromUserId amount level status createdAt')
      .populate('fromUserId', 'name email');
    
    // Get commissions that this user has generated for others
    const commissionsGenerated = await Commission.find({ fromUserId: user._id })
      .select('userId amount level status createdAt')
      .populate('userId', 'name email');
    
    // Format the response
    const userInfo = {
      id: user._id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      usedReferralCode: user.usedReferralCode,
      hasPaid: user.hasPaid,
      paymentCompleted: user.paymentCompleted,
      planType: user.planType,
      status: user.status,
      createdAt: user.createdAt,
      referralCount: user.referralCount || 0,
      totalEarnings: user.totalEarnings || 0
    };
    
    return NextResponse.json({
      success: true,
      user: userInfo,
      referrer,
      directReferrals: directReferrals.map(ref => ({
        id: ref._id,
        name: ref.name,
        email: ref.email,
        referralCode: ref.referralCode,
        hasPaid: ref.hasPaid,
        paymentCompleted: ref.paymentCompleted,
        planType: ref.planType,
        status: ref.status,
        createdAt: ref.createdAt,
        paymentStatus: (ref.hasPaid || ref.paymentCompleted) ? 'completed' : 'pending'
      })),
      referralAncestors: (user.referralAncestors || []).map(ancestor => ({
        userId: ancestor.userId,
        level: ancestor.level
      })),
      commissionsReceived: commissionsReceived.map(comm => ({
        id: comm._id,
        fromUser: comm.fromUserId ? {
          id: comm.fromUserId._id,
          name: comm.fromUserId.name,
          email: comm.fromUserId.email
        } : 'Unknown',
        amount: comm.amount,
        level: comm.level,
        status: comm.status,
        createdAt: comm.createdAt
      })),
      commissionsGenerated: commissionsGenerated.map(comm => ({
        id: comm._id,
        toUser: comm.userId ? {
          id: comm.userId._id,
          name: comm.userId.name,
          email: comm.userId.email
        } : 'Unknown',
        amount: comm.amount,
        level: comm.level, 
        status: comm.status,
        createdAt: comm.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user referral debug info:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch user referral debug info',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 