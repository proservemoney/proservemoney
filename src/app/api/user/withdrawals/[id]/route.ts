import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Withdrawal from '@/models/Withdrawal';
import WalletTransaction from '@/models/WalletTransaction';
import mongoose from 'mongoose';
import { logUserActivity } from '@/lib/activity-logger';

/**
 * Get user withdrawals
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await connectDB();
    
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }
    
    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Get withdrawals for the user
    const withdrawals = await Withdrawal.find({ userId: id }).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      withdrawals
    });
    
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * Create a new withdrawal request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await mongoose.startSession();
  
  try {
    await connectDB();
    session.startTransaction();
    
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findById(id).session(session);
    if (!user) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Get data from the request
    const data = await request.json();
    const { amount, method, accountDetails, description } = data;
    
    // Validate amount
    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, message: 'Invalid withdrawal amount' }, { status: 400 });
    }
    
    // Validate method
    if (!method) {
      await session.abortTransaction();
      return NextResponse.json({ success: false, message: 'Withdrawal method is required' }, { status: 400 });
    }
    
    // Check if user has wallet
    if (!user.wallet) {
      user.wallet = { balance: 0, currency: 'INR', lastUpdated: new Date() };
    }
    
    // Check if user has enough balance
    if (user.wallet.balance < amount) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient balance',
        availableBalance: user.wallet.balance || 0
      }, { status: 400 });
    }
    
    // Create withdrawal record
    const withdrawal = await Withdrawal.create([{
      userId: id,
      amount,
      method,
      accountDetails: accountDetails || '',
      description: description || `Withdrawal request via ${method}`,
      status: 'pending',
      createdAt: new Date()
    }], { session });
    
    // Create wallet transaction
    const walletTx = new WalletTransaction({
      userId: user._id,
      amount: -amount, // Negative amount for withdrawals
      transactionType: 'withdrawal',
      referenceId: withdrawal[0]._id.toString(),
      status: 'pending',
      description: `Withdrawal request via ${method}`,
      createdAt: new Date()
    });
    
    await walletTx.save({ session });
    
    // Update user's wallet balance
    user.wallet.balance -= amount;
    user.wallet.lastUpdated = new Date();
    await user.save({ session });
    
    // Commit the transaction
    await session.commitTransaction();
    
    // Add activity logging
    await logUserActivity({
      userId: id,
      type: 'PAYMENT_INITIATED',
      description: `Requested withdrawal of ₹${amount} via ${method}`,
      request,
      meta: {
        amount,
        method,
        withdrawalId: withdrawal[0]._id.toString()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal: withdrawal[0]
    });
    
  } catch (error: any) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    // End the session
    session.endSession();
  }
}

/**
 * Admin endpoint to update withdrawal status
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await mongoose.startSession();
  
  try {
    await connectDB();
    session.startTransaction();
    
    const { id } = await params;
    const { status, notes } = await request.json();
    
    // Validate status
    if (!status || !['processed', 'rejected'].includes(status)) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid status. Use "processed" or "rejected"'
      }, { status: 400 });
    }
    
    // Find the withdrawal
    const withdrawal = await Withdrawal.findById(id).session(session);
    if (!withdrawal || withdrawal.status !== 'pending') {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Withdrawal not found or already processed'
      }, { status: 404 });
    }
    
    // Update withdrawal status
    withdrawal.status = status;
    withdrawal.processedAt = new Date();
    withdrawal.notes = notes || '';
    await withdrawal.save({ session });
    
    // Find the corresponding wallet transaction
    const walletTx = await WalletTransaction.findOne({
      transactionType: 'withdrawal',
      referenceId: id
    }).session(session);
    
    if (walletTx) {
      if (status === 'rejected') {
        // Refund to user's wallet if rejected
        const user = await User.findById(withdrawal.userId).session(session);
        if (user) {
          if (!user.wallet) {
            user.wallet = { balance: 0, currency: 'INR', lastUpdated: new Date() };
          }
          
          user.wallet.balance += Math.abs(walletTx.amount);
          user.wallet.lastUpdated = new Date();
          await user.save({ session });
          
          // Create refund transaction
          const refundTx = new WalletTransaction({
            userId: user._id,
            amount: Math.abs(walletTx.amount), // Positive amount for refund
            transactionType: 'deposit',
            referenceId: `refund_${id}`,
            status: 'completed',
            description: `Refund of rejected withdrawal: ${notes || 'No reason provided'}`,
            createdAt: new Date()
          });
          
          await refundTx.save({ session });
        }
        
        walletTx.status = 'failed';
        await walletTx.save({ session });
        
      } else if (status === 'processed') {
        walletTx.status = 'completed';
        await walletTx.save({ session });
      }
    }
    
    await session.commitTransaction();
    
    // Log activity
    await logUserActivity({
      userId: withdrawal.userId.toString(),
      type: status === 'processed' ? 'PAYMENT_COMPLETED' : 'PROFILE_UPDATE',
      description: `Withdrawal ${status}: ₹${withdrawal.amount}`,
      meta: {
        withdrawalId: id,
        amount: withdrawal.amount,
        status,
        notes
      }
    });
    
    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      withdrawal
    });
    
  } catch (error: any) {
    await session.abortTransaction();
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  } finally {
    session.endSession();
  }
} 