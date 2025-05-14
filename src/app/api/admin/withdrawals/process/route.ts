import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Withdrawal from '@/models/Withdrawal';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Verify user is an admin
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        message: 'Access denied' 
      }, { status: 403 });
    }

    // Connect to the database
    await connectDB();
    
    // Get request data
    const requestData = await req.json();
    const { 
      withdrawalId, 
      action, 
      adminMessage 
    } = requestData;
    
    // Validate request data
    if (!withdrawalId || !action) {
      return NextResponse.json({
        success: false,
        message: 'Withdrawal ID and action are required'
      }, { status: 400 });
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid action. Must be either "approve" or "reject"'
      }, { status: 400 });
    }
    
    // Find the withdrawal request
    const withdrawal = await Withdrawal.findById(withdrawalId);
    
    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        message: 'Withdrawal request not found'
      }, { status: 404 });
    }
    
    // Check if the withdrawal request is already processed
    if (withdrawal.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: `This withdrawal request has already been ${withdrawal.status}`
      }, { status: 400 });
    }
    
    const now = new Date();
    
    // Update the withdrawal status
    withdrawal.status = action === 'approve' ? 'approved' : 'rejected';
    withdrawal.processedAt = now;
    withdrawal.updatedAt = now;
    withdrawal.adminMessage = adminMessage || '';
    
    // Set specific fields based on action
    if (action === 'approve') {
      withdrawal.approvedAt = now;
      // You would typically add transaction ID logic here for approved withdrawals
      // withdrawal.transactionId = generateTransactionId();
    } else {
      withdrawal.rejectedAt = now;
      withdrawal.rejectionReason = adminMessage || 'Rejected by admin';
      
      // If rejecting, refund the amount to the user's wallet
      const user = await User.findById(withdrawal.userId);
      
      if (!user) {
        return NextResponse.json({
          success: false,
          message: 'User not found'
        }, { status: 404 });
      }
      
      user.wallet = (user.wallet || 0) + withdrawal.amount;
      await user.save();
    }
    
    // Save the updated withdrawal request
    await withdrawal.save();
    
    return NextResponse.json({
      success: true,
      message: `Withdrawal request has been ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      withdrawal
    });

  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to process withdrawal request'
    }, { status: 500 });
  }
} 