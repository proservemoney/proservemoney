import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Earning from '@/models/Earning';
// import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Get the ranking type from query params
    const { searchParams } = new URL(req.url);
    const rankingType = searchParams.get('type') || 'direct'; // default to direct referrals
    
    // Temporarily skip authentication for development
    // const authResult = await verifyAuth();
    // if (!authResult.success) {
    //   return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    // }
    
    // Connect to database
    await connectDB();
    
    let leaderboard = [];
    
    if (rankingType === 'direct') {
      // First ranking type: Users with highest number of direct referrals
      const users = await User.find({
        status: 'active',
        paymentCompleted: true
      })
      .sort({ referralCount: -1 })
      .limit(10)
      .select('name referralCount totalEarnings referralCode photoUrl');
      
      // Get the level 2 and level 3 counts for each user
      const usersWithExtendedData = await Promise.all(users.map(async (user) => {
        // Find all users who have this user as their direct referrer
        const directReferrals = await User.find({ 
          referralBy: user.referralCode,
          status: 'active',
          paymentCompleted: true
        }).select('_id referralCode');
        
        // Get IDs of direct referrals
        const directReferralIds = directReferrals.map(ref => ref._id.toString());
        const directReferralCodes = directReferrals.map(ref => ref.referralCode);
        
        // Find level 2 referrals (users referred by user's direct referrals)
        const level2Referrals = await User.countDocuments({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        // Find level 3 referrals (users referred by level 2 referrals)
        const level2ReferralUsers = await User.find({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        }).select('referralCode');
        
        const level2ReferralCodes = level2ReferralUsers.map(ref => ref.referralCode);
        
        const level3Referrals = await User.countDocuments({
          referralBy: { $in: level2ReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        // Get child referrals for visualization (direct referrals with their own referrals)
        const childReferrals = await Promise.all(directReferrals.slice(0, 5).map(async (ref) => {
          const childUser = await User.findById(ref._id).select('name referralCount totalEarnings photoUrl');
          const grandchildren = await User.find({ 
            referralBy: ref.referralCode,
            status: 'active',
            paymentCompleted: true
          }).select('name referralCount totalEarnings photoUrl').limit(5);
          
          return {
            userId: ref._id.toString(),
            name: childUser.name,
            referrals: childUser.referralCount,
            earnings: childUser.totalEarnings,
            photoUrl: childUser.photoUrl,
            children: grandchildren.map(gc => ({
              userId: gc._id.toString(),
              name: gc.name,
              referrals: gc.referralCount,
              earnings: gc.totalEarnings,
              photoUrl: gc.photoUrl
            }))
          };
        }));
        
        return {
          userId: user._id.toString(),
          name: user.name,
          referrals: user.referralCount,
          earnings: user.totalEarnings,
          photoUrl: user.photoUrl,
          level2Count: level2Referrals,
          level3Count: level3Referrals,
          childReferrals: childReferrals,
          rank: determineRank(user.referralCount),
        };
      }));
      
      leaderboard = usersWithExtendedData;
      
    } else if (rankingType === 'multilevel') {
      // Second ranking type: Users with highest number of referrals up to 10 levels
      // First get all users
      const users = await User.find({
        status: 'active',
        paymentCompleted: true
      }).select('_id name referralCount totalEarnings referralAncestors photoUrl referralCode');
      
      // Calculate total referrals including multilevel (up to 10 levels)
      const usersWithMultilevelReferrals = await Promise.all(users.map(async user => {
        // Count referrals by level (up to level 10)
        const multilevelReferralCount = user.referralAncestors
          .filter(ancestor => ancestor.level <= 10)
          .length;
        
        // Get level 2 and level 3 counts
        const directReferrals = await User.find({ 
          referralBy: user.referralCode,
          status: 'active',
          paymentCompleted: true
        }).select('_id referralCode');
        
        const directReferralCodes = directReferrals.map(ref => ref.referralCode);
        
        const level2Referrals = await User.countDocuments({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        const level2ReferralUsers = await User.find({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        }).select('referralCode');
        
        const level2ReferralCodes = level2ReferralUsers.map(ref => ref.referralCode);
        
        const level3Referrals = await User.countDocuments({
          referralBy: { $in: level2ReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        // Get child referrals for visualization (up to 5)
        const childReferrals = await Promise.all(directReferrals.slice(0, 5).map(async (ref) => {
          const childUser = await User.findById(ref._id).select('name referralCount totalEarnings photoUrl');
          const grandchildren = await User.find({ 
            referralBy: ref.referralCode,
            status: 'active',
            paymentCompleted: true
          }).select('name referralCount totalEarnings photoUrl').limit(5);
          
          return {
            userId: ref._id.toString(),
            name: childUser.name,
            referrals: childUser.referralCount,
            earnings: childUser.totalEarnings,
            photoUrl: childUser.photoUrl,
            children: grandchildren.map(gc => ({
              userId: gc._id.toString(),
              name: gc.name,
              referrals: gc.referralCount,
              earnings: gc.totalEarnings,
              photoUrl: gc.photoUrl
            }))
          };
        }));
        
        return {
          userId: user._id.toString(),
          name: user.name,
          referrals: user.referralCount, // Direct referrals
          multilevelReferrals: multilevelReferralCount + user.referralCount, // Including direct
          earnings: user.totalEarnings,
          photoUrl: user.photoUrl,
          level2Count: level2Referrals,
          level3Count: level3Referrals,
          childReferrals: childReferrals
        };
      }));
      
      // Sort by multilevel referral count and take top 10
      const sortedUsers = usersWithMultilevelReferrals
        .sort((a, b) => b.multilevelReferrals - a.multilevelReferrals)
        .slice(0, 10);
      
      leaderboard = sortedUsers.map((user, index) => ({
        id: index + 1,
        userId: user.userId,
        name: user.name,
        referrals: user.multilevelReferrals,
        directReferrals: user.referrals,
        earnings: user.earnings,
        photoUrl: user.photoUrl,
        level2Count: user.level2Count,
        level3Count: user.level3Count,
        childReferrals: user.childReferrals,
        rank: determineRank(user.referrals), // Rank based on direct referrals
      }));
      
    } else if (rankingType === 'earnings') {
      // Third ranking type: Users with highest total earnings
      const users = await User.find({
        status: 'active',
        paymentCompleted: true
      })
      .sort({ totalEarnings: -1 })
      .limit(10)
      .select('name referralCount totalEarnings photoUrl referralCode');
      
      // Get the level 2 and level 3 counts for each user
      const usersWithExtendedData = await Promise.all(users.map(async (user) => {
        // Find all users who have this user as their direct referrer
        const directReferrals = await User.find({ 
          referralBy: user.referralCode,
          status: 'active',
          paymentCompleted: true
        }).select('_id referralCode');
        
        const directReferralCodes = directReferrals.map(ref => ref.referralCode);
        
        // Find level 2 referrals (users referred by user's direct referrals)
        const level2Referrals = await User.countDocuments({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        // Find level 3 referrals (users referred by level 2 referrals)
        const level2ReferralUsers = await User.find({
          referralBy: { $in: directReferralCodes },
          status: 'active',
          paymentCompleted: true
        }).select('referralCode');
        
        const level2ReferralCodes = level2ReferralUsers.map(ref => ref.referralCode);
        
        const level3Referrals = await User.countDocuments({
          referralBy: { $in: level2ReferralCodes },
          status: 'active',
          paymentCompleted: true
        });
        
        // Get child referrals for visualization (up to 5)
        const childReferrals = await Promise.all(directReferrals.slice(0, 5).map(async (ref) => {
          const childUser = await User.findById(ref._id).select('name referralCount totalEarnings photoUrl');
          const grandchildren = await User.find({ 
            referralBy: ref.referralCode,
            status: 'active',
            paymentCompleted: true
          }).select('name referralCount totalEarnings photoUrl').limit(5);
          
          return {
            userId: ref._id.toString(),
            name: childUser.name,
            referrals: childUser.referralCount,
            earnings: childUser.totalEarnings,
            photoUrl: childUser.photoUrl,
            children: grandchildren.map(gc => ({
              userId: gc._id.toString(),
              name: gc.name,
              referrals: gc.referralCount,
              earnings: gc.totalEarnings,
              photoUrl: gc.photoUrl
            }))
          };
        }));
        
        return {
          userId: user._id.toString(),
          name: user.name,
          referrals: user.referralCount,
          earnings: user.totalEarnings,
          photoUrl: user.photoUrl,
          level2Count: level2Referrals,
          level3Count: level3Referrals,
          childReferrals: childReferrals,
          rank: determineRank(user.referralCount),
        };
      }));
      
      leaderboard = usersWithExtendedData;
    }
    
    return NextResponse.json({
      success: true,
      leaderboard,
      rankingType
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaderboard data' },
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