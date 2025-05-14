import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Earning from '@/models/Earning';
import User from '@/models/User';

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
    
    // Find user to validate
    const user = await User.findById(id);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get all earnings for the user
    const earnings = await Earning.find({ userId: id })
      .populate('referralId', 'name email');
    
    // Group earnings by source for chart data
    const earningsBySource = earnings.reduce((acc: any, earning) => {
      if (!acc[earning.source]) {
        acc[earning.source] = 0;
      }
      acc[earning.source] += earning.amount;
      return acc;
    }, {});
    
    // Group earnings by month for trend analysis
    const earningsByMonth: Record<string, number> = {};
    const currentDate = new Date();
    
    // Initialize last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(currentDate.getMonth() - i);
      const monthYearKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      earningsByMonth[monthYearKey] = 0;
    }
    
    // Fill in actual earnings data
    earnings.forEach(earning => {
      const date = new Date(earning.createdAt);
      const monthYearKey = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      
      if (earningsByMonth[monthYearKey] !== undefined) {
        earningsByMonth[monthYearKey] += earning.amount;
      }
    });
    
    // Calculate level-specific earnings for multi-level commission data
    const earningsByLevel = earnings.reduce((acc: any, earning) => {
      if (earning.level) {
        if (!acc[`level${earning.level}`]) {
          acc[`level${earning.level}`] = 0;
        }
        acc[`level${earning.level}`] += earning.amount;
      }
      return acc;
    }, {});
    
    // Get detailed referral earnings data
    const referralEarnings = earnings.filter(e => e.source === 'referral' || e.source === 'commission')
      .map(e => ({
        id: e._id,
        amount: e.amount,
        currency: e.currency,
        source: e.source,
        level: e.level || 1,
        description: e.description,
        status: e.status,
        createdAt: e.createdAt,
        referral: e.referralId ? {
          id: e.referralId._id,
          name: e.referralId.name,
          email: e.referralId.email
        } : null
      }));
    
    // Calculate total earnings
    const totalEarnings = earnings.reduce((sum, earning) => sum + earning.amount, 0);
    
    // Calculate total referral earnings
    const totalReferralEarnings = earnings
      .filter(e => e.source === 'referral' || e.source === 'commission')
      .reduce((sum, earning) => sum + earning.amount, 0);
    
    return NextResponse.json({
      success: true,
      earnings: referralEarnings,
      earningsBySource,
      earningsByMonth,
      earningsByLevel,
      totalEarnings,
      totalReferralEarnings,
      hasEarnings: earnings.length > 0
    });
    
  } catch (error: any) {
    console.error('Error fetching earnings data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data', message: error.message },
      { status: 500 }
    );
  }
} 