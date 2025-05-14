import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Withdrawal from '@/models/Withdrawal';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Get details of a specific withdrawal
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    const id = params.id;
    
    // Find the withdrawal
    const withdrawal = await Withdrawal.findById(id);
    
    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        message: 'Withdrawal not found'
      }, { status: 404 });
    }
    
    // Get user info
    const user = await User.findById(withdrawal.userId).select('name email phone');
    
    // Format account details if available
    let parsedAccountDetails = {};
    if (withdrawal.accountDetails) {
      try {
        parsedAccountDetails = JSON.parse(withdrawal.accountDetails);
      } catch (error) {
        console.error('Error parsing account details:', error);
      }
    }
    
    return NextResponse.json({
      success: true,
      withdrawal: {
        ...withdrawal.toObject(),
        accountDetails: parsedAccountDetails,
        user
      }
    });
  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch withdrawal details'
    }, { status: 500 });
  }
}

// Update withdrawal status (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await mongoose.startSession();
  
  try {
    await connectDB();
    session.startTransaction();
    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'Withdrawal ID is required' }, { status: 400 });
    }
    
    // Get data from request
    const data = await request.json();
    const { status, adminMessage } = data;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Valid status (approved/rejected) is required' 
      }, { status: 400 });
    }
    
    // Find withdrawal
    const withdrawal = await Withdrawal.findById(id).session(session);
    
    if (!withdrawal) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, message: 'Withdrawal not found' }, { status: 404 });
    }
    
    if (withdrawal.status !== 'pending') {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: `Withdrawal has already been ${withdrawal.status}` 
      }, { status: 400 });
    }
    
    // Update withdrawal status
    withdrawal.status = status;
    
    if (adminMessage) {
      withdrawal.adminMessage = adminMessage;
    }
    
    await withdrawal.save({ session });
    
    // If rejected, refund the user's balance
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.userId).session(session);
      
      if (user && user.wallet) {
        user.wallet.balance += withdrawal.amount;
        await user.save({ session });
      }
    }
    
    // Commit transaction
    await session.commitTransaction();
    
    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });
    
  } catch (error: any) {
    // Abort transaction on error
    await session.abortTransaction();
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    // End session
    session.endSession();
  }
} 