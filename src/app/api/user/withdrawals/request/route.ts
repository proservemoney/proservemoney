import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Withdrawal from '@/models/Withdrawal';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  
  try {
    // Check if user is authenticated
    const authSession = await getServerSession(authOptions);
    
    if (!authSession || !authSession.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get the user ID from the session
    const userEmail = authSession.user.email;
    
    // Connect to database
    await connectDB();
    session.startTransaction();
    
    // Find user by email
    const user = await User.findOne({ email: userEmail }).session(session);
    
    if (!user) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Get request data
    const data = await req.json();
    const { amount, method, description, accountDetails } = data;
    
    // Validate amount
    if (!amount || isNaN(amount) || amount <= 0) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid withdrawal amount' 
      }, { status: 400 });
    }
    
    // Validate method
    if (!method) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Withdrawal method is required' 
      }, { status: 400 });
    }
    
    // Validate account details
    if (!accountDetails) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Account details are required for withdrawal' 
      }, { status: 400 });
    }
    
    // Check if user has enough balance
    if (!user.wallet || user.wallet.balance < amount) {
      await session.abortTransaction();
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient balance',
        availableBalance: user.wallet?.balance || 0
      }, { status: 400 });
    }
    
    // Create withdrawal request
    const withdrawalData = {
      userId: user._id,
      amount,
      method,
      description: description || `Withdrawal request via ${method}`,
      status: 'pending',
      createdAt: new Date(),
      accountDetails: JSON.stringify(accountDetails)
    };
    
    const withdrawal = await Withdrawal.create([withdrawalData], { session });
    
    // Update user's wallet balance
    if (!user.wallet) {
      user.wallet = {
        balance: 0,
        currency: 'INR',
        lastUpdated: new Date()
      };
    }
    
    user.wallet.balance -= amount;
    user.wallet.lastUpdated = new Date();
    await user.save({ session });
    
    // Commit transaction
    await session.commitTransaction();
    
    return NextResponse.json({
      success: true,
      message: 'Withdrawal request created successfully',
      withdrawal: withdrawal[0]
    });
    
  } catch (error: any) {
    // Abort transaction on error
    await session.abortTransaction();
    console.error('Error creating withdrawal request:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to create withdrawal request'
    }, { status: 500 });
  } finally {
    // End session
    session.endSession();
  }
} 