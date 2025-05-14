import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
// import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Temporarily skip authentication for development
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    // }
    
    // For testing, use a hardcoded user ID or get from query params
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || '6803fff22d0a4b9285841743'; // Use a real user ID from your database for testing
    
    // Connect to database
    await connectDB();
    
    // Get the current user
    const currentUser = await User.findById(userId).select('name referralCount totalEarnings referralAncestors');
    
    if (!currentUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Get position in direct referrals ranking
    const directReferralsPosition = await User.countDocuments({
      referralCount: { $gt: currentUser.referralCount },
      status: 'active',
      paymentCompleted: true
    }) + 1;
    
    // Calculate total multilevel referrals for the current user (up to level 10)
    const multilevelReferralCount = currentUser.referralAncestors
      .filter(ancestor => ancestor.level <= 10)
      .length + currentUser.referralCount;
    
    // Get all users to calculate multilevel ranking
    const allUsers = await User.find({
      status: 'active',
      paymentCompleted: true
    }).select('referralCount referralAncestors');
    
    // Calculate position in multilevel ranking
    const usersWithHigherMultilevelCount = allUsers.filter(user => {
      const userMultilevelCount = user.referralAncestors
        .filter(ancestor => ancestor.level <= 10)
        .length + user.referralCount;
      
      return userMultilevelCount > multilevelReferralCount;
    });
    
    const multilevelPosition = usersWithHigherMultilevelCount.length + 1;
    
    // Get position in earnings ranking
    const earningsPosition = await User.countDocuments({
      totalEarnings: { $gt: currentUser.totalEarnings },
      status: 'active',
      paymentCompleted: true
    }) + 1;
    
    return NextResponse.json({
      success: true,
      userId: currentUser._id,
      name: currentUser.name,
      rankings: {
        direct: {
          position: directReferralsPosition,
          value: currentUser.referralCount,
          title: 'Direct Referrals'
        },
        multilevel: {
          position: multilevelPosition,
          value: multilevelReferralCount,
          title: 'Multilevel Referrals'
        },
        earnings: {
          position: earningsPosition,
          value: currentUser.totalEarnings,
          title: 'Total Earnings'
        }
      },
      rank: determineRank(currentUser.referralCount)
    });
    
  } catch (error) {
    console.error('Error fetching user ranking position:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user ranking position' },
      { status: 500 }
    );
  }
}

// Helper function to determine rank based on referral count
function determineRank(referralCount: number): string {
  if (referralCount >= 50) return 'Diamond';
  if (referralCount >= 30) return 'Platinum';
  if (referralCount >= 20) return 'Gold';
  if (referralCount >= 10) return 'Silver';
  return 'Bronze';
} 