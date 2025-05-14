import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Get the 20 oldest active members (sorted by createdAt)
    const oldestMembers = await User.find({
      status: 'active',
      paymentCompleted: true
    })
    .sort({ createdAt: 1 }) // Sort by creation date (oldest first)
    .limit(20)
    .select('name createdAt referralCount totalEarnings');
    
    const formattedMembers = oldestMembers.map((user, index) => ({
      id: index + 1,
      userId: user._id.toString(),
      name: user.name,
      joinDate: user.createdAt,
      referrals: user.referralCount,
      earnings: user.totalEarnings,
      memberSince: formatTimeSince(user.createdAt)
    }));
    
    return NextResponse.json({
      success: true,
      oldestMembers: formattedMembers
    });
    
  } catch (error) {
    console.error('Error fetching oldest members:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch oldest members' },
      { status: 500 }
    );
  }
}

// Helper function to format time since joining
function formatTimeSince(date: Date): string {
  const now = new Date();
  const joinDate = new Date(date);
  
  const yearDiff = now.getFullYear() - joinDate.getFullYear();
  const monthDiff = now.getMonth() - joinDate.getMonth();
  
  if (yearDiff > 0) {
    return `${yearDiff} year${yearDiff === 1 ? '' : 's'}`;
  } else if (monthDiff > 0) {
    return `${monthDiff} month${monthDiff === 1 ? '' : 's'}`;
  } else {
    const dayDiff = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
    return `${dayDiff} day${dayDiff === 1 ? '' : 's'}`;
  }
} 