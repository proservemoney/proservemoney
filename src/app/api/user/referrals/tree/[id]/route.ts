import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Function to get referrals up to a specified level
async function getReferralTree(userId: string, maxLevel: number = 10, currentLevel: number = 1) {
  if (currentLevel > maxLevel) return null;
  
  const user = await User.findById(userId).select('name email referralCode referrals createdAt');
  
  if (!user) return null;
  
  // Format user data for response
  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    level: currentLevel,
    children: []
  };
  
  // If user has referrals and we're not at max level, get their trees
  if (user.referrals && user.referrals.length > 0 && currentLevel < maxLevel) {
    const referralPromises = user.referrals.map(refId => 
      getReferralTree(refId.toString(), maxLevel, currentLevel + 1)
    );
    
    const referralTrees = await Promise.all(referralPromises);
    
    // Filter out null values (users not found)
    userData.children = referralTrees.filter(tree => tree !== null);
  }
  
  return userData;
}

// Function to calculate statistics by level
async function getReferralStatsByLevel(userId: string, maxLevel: number = 10) {
  let stats = Array(maxLevel).fill(0).map((_, i) => ({
    level: i + 1,
    count: 0,
    users: []
  }));
  
  // Start with the user's direct referrals
  const user = await User.findById(userId).populate('referrals', 'name email createdAt');
  
  if (!user || !user.referrals) return stats;
  
  // Add level 1 referrals
  stats[0].count = user.referrals.length;
  stats[0].users = user.referrals.map((ref: any) => ({
    _id: ref._id,
    name: ref.name,
    email: ref.email,
    date: ref.createdAt
  }));
  
  // Process remaining levels
  let currentLevelIds = user.referrals.map((ref: any) => ref._id);
  
  for (let level = 1; level < maxLevel; level++) {
    if (currentLevelIds.length === 0) break;
    
    // Get all users at the next level
    const nextLevelUsers = await User.find({
      referredBy: { $in: currentLevelIds }
    }).select('_id name email createdAt referrals');
    
    stats[level].count = nextLevelUsers.length;
    stats[level].users = nextLevelUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      date: user.createdAt
    }));
    
    // Prepare for the next level
    currentLevelIds = nextLevelUsers.flatMap(user => user.referrals || []);
  }
  
  return stats;
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const levelStr = searchParams.get('levels') || '10';
    const format = searchParams.get('format') || 'tree'; // 'tree' or 'stats'
    
    // Parse levels, default to 10, max is 10
    const levels = Math.min(parseInt(levelStr, 10) || 10, 10);
    
    await connectDB();
    
    // Verify the user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    let result;
    
    // Return either hierarchical tree or level-based stats
    if (format === 'tree') {
      result = await getReferralTree(id, levels);
    } else {
      result = await getReferralStatsByLevel(id, levels);
    }
    
    // Calculate summary
    const referralCounts = await User.aggregate([
      { $match: { _id: user._id } },
      {
        $graphLookup: {
          from: 'users',
          startWith: '$referrals',
          connectFromField: 'referrals',
          connectToField: '_id',
          as: 'allReferrals',
          maxDepth: levels - 1
        }
      },
      {
        $project: {
          totalCount: { $size: '$allReferrals' },
          directCount: { $size: '$referrals' }
        }
      }
    ]);
    
    // Also get the count of active referrals (those who have paid)
    const activeReferrals = await User.countDocuments({
      referredBy: user._id,
      $or: [{ hasPaid: true }, { paymentCompleted: true }]
    });
    
    // Get total direct referrals
    const totalDirectReferrals = await User.countDocuments({
      referredBy: user._id
    });
    
    const summary = referralCounts.length > 0 
      ? {
          totalReferrals: referralCounts[0].totalCount || 0,
          directReferrals: referralCounts[0].directCount || 0,
          indirectReferrals: Math.max(0, (referralCounts[0].totalCount || 0) - (referralCounts[0].directCount || 0)),
          // Calculate conversion rate as percentage of active referrals to total referrals
          conversionRate: totalDirectReferrals > 0 
            ? Math.min(100, Math.round((activeReferrals / totalDirectReferrals) * 100))
            : 0
        }
      : { totalReferrals: 0, directReferrals: 0, indirectReferrals: 0, conversionRate: 0 };
    
    return NextResponse.json({
      success: true,
      format,
      levels,
      summary,
      data: result
    });
    
  } catch (error: any) {
    console.error('Error fetching referral tree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referral data', message: error.message },
      { status: 500 }
    );
  }
} 