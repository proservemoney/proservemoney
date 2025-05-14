import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Commission from '@/models/Commission';
import { verifyAuth } from '@/lib/auth';
import { processCommissions } from '@/lib/commission-service';

/**
 * Admin endpoint to process missing commissions for users who have paid
 * but whose referrers haven't received commissions
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Parse request body for specific user processing
    const { userId } = await request.json();
    
    // If userId provided, process just for that user
    if (userId) {
      const user = await User.findById(userId);
      
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      
      // Process only if user has paid and has a valid plan
      if (!user.hasPaid || !['basic', 'premium'].includes(user.plan)) {
        return NextResponse.json(
          { success: false, message: 'User has not paid or has no valid plan' },
          { status: 400 }
        );
      }
      
      // Check if commissions were already processed
      const existingCommissions = await Commission.find({ fromUserId: user._id });
      
      if (existingCommissions.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            message: 'Commissions already processed for this user',
            commissions: existingCommissions
          },
          { status: 409 }
        );
      }
      
      // Process commissions for this user
      const result = await processCommissions(userId, user.plan as 'basic' | 'premium');
      
      return NextResponse.json({
        success: true,
        message: `Processed commissions for user: ${user.name}`,
        result
      });
    }
    
    // If no userId, find all users with hasPaid=true but no commissions
    const paidUsers = await User.find({ 
      hasPaid: true,
      plan: { $in: ['basic', 'premium'] }
    });
    
    const results: any[] = [];
    
    // Process each user
    for (const user of paidUsers) {
      // Check if commissions were already processed
      const existingCommissions = await Commission.find({ fromUserId: user._id });
      
      if (existingCommissions.length === 0 && user.referralAncestors && user.referralAncestors.length > 0) {
        // Process commissions for this user
        const result = await processCommissions(user._id.toString(), user.plan as 'basic' | 'premium');
        
        results.push({
          userId: user._id,
          name: user.name,
          planType: user.plan,
          result
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed missing commissions for ${results.length} users`,
      results
    });
  } catch (error) {
    console.error('Error processing missing commissions:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process missing commissions',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 