import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { PLANS } from '@/config/referralConfig';
import { processCommissions } from '@/lib/commission-service';
import { logUserActivity } from '@/lib/activity-logger';
import WalletTransaction from '@/models/WalletTransaction';
import mongoose from 'mongoose';

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

    // Parse request body
    const { planType, paymentId } = await request.json();
    
    // Validate plan type
    if (!planType || (planType !== 'basic' && planType !== 'premium')) {
      return NextResponse.json(
        { success: false, message: 'Invalid plan type. Choose either "basic" or "premium"' },
        { status: 400 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get user from authentication
    const userId = authCheck.userId;
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID not found in authentication' },
        { status: 400 }
      );
    }
    
    // Fetch user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Determine plan amount
    const planAmount = planType === 'basic' 
      ? PLANS.BASIC.amount 
      : PLANS.PREMIUM.amount;

    // Use a transaction to ensure everything completes or nothing does
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Update user's plan status
      user.planType = planType;
      user.hasPaid = true;
      user.paymentCompleted = true;
      user.paymentStatus = 'completed';
      user.planPurchaseDate = new Date();
      user.lastPaymentId = paymentId || null;
      
      // Set status to active now that payment is complete
      if (user.status !== 'active') {
        user.status = 'active';
      }
      
      // Initialize wallet if not exists
      if (!user.wallet) {
        user.wallet = {
          balance: 0,
          currency: 'INR',
          lastUpdated: new Date()
        };
      }
      
      // Adds payment details to metadata if not already there
      if (!user.metadata) {
        user.metadata = {};
      }
      
      // Add payment details to metadata
      user.metadata.paymentHistory = user.metadata.paymentHistory || [];
      user.metadata.paymentHistory.push({
        planType,
        amount: planAmount,
        paymentId: paymentId || 'manual',
        date: new Date()
      });
      
      await user.save({ session });
      
      // Create a wallet transaction for this purchase
      const purchaseTx = new WalletTransaction({
        userId: user._id,
        amount: -planAmount, // Negative amount for purchases
        transactionType: 'purchase',
        referenceId: paymentId || `manual_${Date.now()}`,
        status: 'completed',
        description: `Purchase of ${planType} plan for ₹${planAmount}`,
        createdAt: new Date()
      });
      
      await purchaseTx.save({ session });
      
      // Process commissions for all referrers in the chain
      const commissionResult = await processCommissions(userId, planType);
      
      if (!commissionResult.success) {
        console.error(`Failed to process commissions for user ${userId}: ${commissionResult.error}`);
        // Continue with the transaction even if commission processing fails
        // Don't throw an error here, as this would roll back the user's plan purchase
      }
      
      // Add detailed logging for commission processing
      console.log(`Commission processing summary for user ${userId}:`);
      console.log(`- Total commissions paid: ₹${commissionResult.totalCommissions}`);
      console.log(`- Company amount: ₹${commissionResult.companyAmount}`);
      console.log(`- Commission details: ${JSON.stringify(commissionResult.commissionDetails)}`);
      
      await session.commitTransaction();

      // Log the activity (outside transaction since it's non-critical)
      await logUserActivity({
        userId,
        type: 'PAYMENT_COMPLETED',
        description: `Purchased ${planType} plan for ₹${planAmount}`,
        request,
        meta: {
          planType,
          amount: planAmount,
          paymentId: paymentId || 'manual',
          commissionPaid: commissionResult.totalCommissions,
          companyRevenue: commissionResult.companyAmount
        }
      });
      
      return NextResponse.json({
        success: true,
        message: `Successfully purchased ${planType} plan`,
        plan: {
          type: planType,
          amount: planAmount,
          purchaseDate: user.planPurchaseDate
        },
        commissions: {
          totalPaid: commissionResult.totalCommissions,
          companyRevenue: commissionResult.companyAmount,
          details: commissionResult.commissionDetails
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error processing plan purchase:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to process plan purchase',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 