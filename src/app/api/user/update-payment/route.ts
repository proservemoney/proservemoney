import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Get request data
    const { userId, paymentId, paymentStatus, planId } = await request.json();
    
    if (!userId || !paymentId || !paymentStatus) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Update payment status
    user.paymentCompleted = paymentStatus === 'completed';
    
    // Update payment information if available
    if (user.paymentInfo) {
      user.paymentInfo.paymentMethod = 'card'; // Default to card
    }
    
    // Update plan if provided
    if (planId) {
      user.plan = planId;
    }
    
    // Save changes
    await user.save();
    
    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update payment status',
      error: error.message
    }, { status: 500 });
  }
} 