import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredTokens } from '../process/route';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PaymentToken from '@/models/PaymentToken';

// Interface for MongoDB CastError
interface MongoDBCastError extends Error {
  name: string;
  path: string;
  value: string;
  kind: string;
}

// Function to generate a random reference code (5-6 characters alphanumeric)
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 6; // Fixed length of 6 characters
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Account Activation API
 * 
 * This endpoint finalizes the payment process and activates the user account.
 * It verifies the payment token and marks it as completed, which confirms
 * the payment has been successfully processed and the account is active.
 * 
 * The token must not be expired (less than 10 minutes old) to activate the account.
 */
export async function POST(request: NextRequest) {
  try {
    // First, clean up any expired tokens
    await cleanupExpiredTokens();
    
    const { token, userId } = await request.json();
    
    // Validate required fields
    if (!token || !userId) {
      console.error('Missing required fields:', { token: !!token, userId: !!userId });
      return NextResponse.json(
        { success: false, message: 'Missing payment token or user ID' },
        { status: 400 }
      );
    }

    // Validate that userId is not undefined and is in valid MongoDB ObjectId format
    if (userId === undefined || userId === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Invalid userId format or undefined:', userId);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format or undefined' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Check if payment token exists in the database
    console.log('Looking for token in database:', token);
    const paymentData = await PaymentToken.findOne({ token });
    
    if (!paymentData) {
      console.error('Token not found in database:', token);
      return NextResponse.json(
        { success: false, message: 'Invalid or expired payment token' },
        { status: 400 }
      );
    }
    
    // Verify the token belongs to the right user
    if (paymentData.userId !== userId) {
      console.error('Token does not match user:', { tokenUserId: paymentData.userId, requestUserId: userId });
      return NextResponse.json(
        { success: false, message: 'Payment token does not match user' },
        { status: 403 }
      );
    }
    
    // Check if token is expired
    const now = Date.now();
    if (now > paymentData.expiresAt) {
      // Delete the expired token
      await PaymentToken.deleteOne({ token });
      
      console.error('Token expired:', { expiresAt: paymentData.expiresAt, now });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Payment session has expired. Please login again to complete payment.',
          expired: true
        },
        { status: 400 }
      );
    }
    
    // Check that this token hasn't already been used
    if (paymentData.status === 'completed') {
      console.log('Payment already processed for token:', token);
      return NextResponse.json(
        { success: false, message: 'Payment already processed' },
        { status: 400 }
      );
    }
    
    try {
      // Find user and update payment status
      try {
        const user = await User.findById(userId);
        
        if (!user) {
          throw new Error('User not found');
        }
        
        // Generate a reference code if the user doesn't have one yet
        if (!user.referralCode) {
          // Try to generate a unique reference code
          let referralCode;
          let isUnique = false;
          let attempts = 0;
          
          while (!isUnique && attempts < 10) {
            referralCode = generateReferralCode();
            // Check if the code already exists
            const existingUser = await User.findOne({ referralCode });
            isUnique = !existingUser;
            attempts++;
          }
          
          if (isUnique) {
            console.log('Generated referral code for user:', referralCode);
            user.referralCode = referralCode;
          } else {
            console.error('Failed to generate unique referral code after 10 attempts');
          }
        }
        
        // Update user payment information
        user.paymentCompleted = true;
        user.paymentDate = new Date();
        user.status = 'active';
        
        // Add payment information
        user.paymentInfo = {
          amount: parseFloat(paymentData.amount) || 0,
          currency: 'INR',
          last4: '1234', // Demo value - would come from actual payment gateway
          paymentMethod: 'card',
          paymentDate: new Date()
        };
        
        // Save the updated user
        await user.save();
        
        // Mark the payment as completed in the database
        paymentData.status = 'completed';
        await paymentData.save();
        
        // Process commissions for the user's referrers
        try {
          const planType = user.plan || 'basic';
          const { processCommissions } = await import('@/lib/commission-service');
          const commissionResult = await processCommissions(userId, planType as 'basic' | 'premium');
          
          if (commissionResult.success) {
            console.log(`Successfully processed commissions for user ${userId}:`);
            console.log(`- Total commissions paid: ₹${commissionResult.totalCommissions}`);
            console.log(`- Commission details: ${JSON.stringify(commissionResult.commissionDetails)}`);
          } else {
            console.error(`Failed to process commissions for user ${userId}: ${commissionResult.error}`);
          }
        } catch (commissionError) {
          console.error('Error processing commissions during account activation:', commissionError);
          // Continue with activation even if commission processing fails
        }
        
        console.log('Account successfully activated, user:', userId);
        return NextResponse.json(
          { 
            success: true, 
            message: 'Account successfully activated',
            referralCode: user.referralCode || null
          },
          { status: 200 }
        );
      } catch (dbError: unknown) {
        const castError = dbError as MongoDBCastError;
        if (castError.name === 'CastError' && castError.path === '_id') {
          return NextResponse.json(
            { success: false, message: 'Invalid user ID format' },
            { status: 400 }
          );
        }
        throw dbError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('User activation error:', errorMessage);
      
      return NextResponse.json(
        { success: false, message: 'Account activation failed: ' + errorMessage },
        { status: 500 }
      );
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Account activation error:', errorMessage);
    
    return NextResponse.json(
      { success: false, message: 'Account activation failed' },
      { status: 500 }
    );
  }
}