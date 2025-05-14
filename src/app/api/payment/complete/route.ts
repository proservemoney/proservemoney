import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    // Parse the request body
    const { 
      userId, 
      planId, 
      planAmount, 
      paymentId, 
      paymentMethod,
      gstAmount
    } = await request.json();
    
    console.log(`Processing payment completion for user: ${userId}, plan: ${planId}, amount: ${planAmount}`);
    
    if (!userId || !planId || !planAmount) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 });
    }
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json({ 
        success: false, 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // Update user's plan details
    user.plan = planId;
    user.planAmount = planAmount;
    user.paymentCompleted = true;
    user.paymentDate = new Date();
    
    // Update payment info
    user.paymentInfo = {
      amount: planAmount,
      currency: 'INR',
      last4: paymentId.slice(-4), // Just use last 4 chars of payment ID for demo
      paymentMethod: paymentMethod || 'card',
      paymentDate: new Date()
    };
    
    await user.save();
    console.log(`Updated plan for user ${userId} to ${planId}`);
    
    // Process referral commissions using the centralized commission service
    try {
      const { processCommissions } = await import('@/lib/commission-service');
      const planType = planId === 'premium' ? 'premium' : 'basic';
      
      console.log(`Processing commissions for user ${userId} with plan ${planType}`);
      const commissionResult = await processCommissions(userId, planType);
      
      if (commissionResult.success) {
        console.log(`Successfully processed commissions for user ${userId}:`);
        console.log(`- Total commissions paid: ₹${commissionResult.totalCommissions}`);
        console.log(`- Commission details: ${JSON.stringify(commissionResult.commissionDetails)}`);
      } else {
        console.error(`Failed to process commissions for user ${userId}: ${commissionResult.error}`);
      }
    } catch (commissionError) {
      console.error('Error processing commissions during payment completion:', commissionError);
      // Continue with payment completion even if commission processing fails
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment completed and plan updated successfully',
      planId,
      planAmount,
      commissions: user.referralAncestors ? user.referralAncestors.length : 0
    });
    
  } catch (error: any) {
    console.error('Payment completion error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to process payment completion',
      error: error.message
    }, { status: 500 });
  }
}