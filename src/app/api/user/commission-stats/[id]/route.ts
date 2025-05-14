import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import { getUserCommissionStats } from '@/lib/commission-service';

/**
 * Get user commission statistics including referrals and earnings
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

    // Get user ID from params - await it properly
    const { id } = await params;
    const userId = id;
    
    // Check authorization - users can only view their own stats unless admin
    if (authCheck.userId !== userId && !authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized to view these statistics' },
        { status: 403 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get user commission stats
    const stats = await getUserCommissionStats(userId);
    
    return NextResponse.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching commission stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch commission statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 