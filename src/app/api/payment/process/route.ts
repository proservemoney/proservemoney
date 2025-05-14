import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectDB from '@/lib/db';
import User from '@/models/User';
import PaymentToken from '@/models/PaymentToken';

// Payment token expiration time (5 minutes in milliseconds)
export const PAYMENT_TOKEN_EXPIRY = 5 * 60 * 1000;

// Set to true to enable test mode - payment processing will be bypassed
export const TEST_MODE = true;

interface PaymentData {
  userId: string;
  email: string;
  amount: string;
  gstAmount: string;
  planId: string;
  address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  expiresAt: number; // Timestamp when the token expires
}

/**
 * Payment Processing API
 * 
 * This endpoint handles payment processing and returns a payment token
 * that is used to verify and complete the user registration process.
 * The token expires after 10 minutes.
 * 
 * In a real application, this would integrate with actual payment gateways.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const paymentData = await request.json();
    
    // Validate required fields
    if (!paymentData.userId || !paymentData.email || !paymentData.gstAmount) {
      return NextResponse.json(
        { message: 'Missing required payment information' },
        { status: 400 }
      );
    }

    // Validate that userId is in valid MongoDB ObjectId format (24 hex characters)
    if (!/^[0-9a-fA-F]{24}$/.test(paymentData.userId)) {
      console.error('Invalid userId format:', paymentData.userId);
      return NextResponse.json(
        { message: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    // Connect to the database
    await connectDB();

    // Save the user's address and plan information for future reference
    // This will allow users to continue their registration if they need to login again
    try {
      // Find the user
      const user = await User.findById(paymentData.userId);
      
      if (user) {
        // Store the address and plan data in the user's account
        user.previousRegData = {
          address: paymentData.address,
          plan: {
            planId: paymentData.planId,
            planAmount: parseFloat(paymentData.amount) || 0,
            gstAmount: parseFloat(paymentData.gstAmount) || 0
          },
          lastUpdated: new Date()
        };
        
        // Save the user
        await user.save();
      }
    } catch (error) {
      // Log the error but continue with payment processing
      console.error('Error saving user registration data:', error);
    }

    // Check if there's an existing valid pending payment token for this user
    const now = Date.now();
    const existingToken = await PaymentToken.findOne({
      userId: paymentData.userId,
      status: 'pending',
      expiresAt: { $gt: now } // Token must not be expired
    });

    if (existingToken) {
      console.log('Reusing existing pending payment token:', existingToken.token);
      
      // Update the token data if needed
      existingToken.email = paymentData.email;
      existingToken.amount = paymentData.amount;
      existingToken.gstAmount = paymentData.gstAmount;
      existingToken.planId = paymentData.planId;
      existingToken.address = paymentData.address;
      
      // Save the updated token
      await existingToken.save();
      
      // Return the existing token
      return NextResponse.json(
        { 
          success: true, 
          message: 'Existing payment token reused',
          token: existingToken.token,
          expiresAt: existingToken.expiresAt
        },
        { status: 200 }
      );
    }
    
    // No existing valid token found, create a new one
    
    // Generate a unique payment token
    const paymentToken = uuidv4();
    
    // Calculate token expiration time (10 minutes from now)
    const expiresAt = now + PAYMENT_TOKEN_EXPIRY;
    
    // Create a new payment token record in MongoDB
    const newToken = new PaymentToken({
      token: paymentToken,
      userId: paymentData.userId,
      email: paymentData.email,
      amount: paymentData.amount,
      gstAmount: paymentData.gstAmount,
      planId: paymentData.planId,
      address: paymentData.address,
      timestamp: now,
      status: 'pending',
      expiresAt
    });

    // Save the token to the database
    await newToken.save();
    console.log('Created new payment token:', paymentToken);
    
    // Return the payment token and expiration timestamp to the client
    return NextResponse.json(
      { 
        success: true, 
        message: 'Payment processed successfully',
        token: paymentToken,
        expiresAt
      },
      { status: 200 }
    );
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Payment processing error:', errorMessage);
    
    return NextResponse.json(
      { success: false, message: 'Payment processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Cleanup expired tokens - utility function to purge old tokens
 * MongoDB handles this automatically via TTL index, but we keep this for compatibility
 */
export async function cleanupExpiredTokens() {
  try {
    await connectDB();
    const now = Date.now();
    await PaymentToken.deleteMany({ expiresAt: { $lt: now } });
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
  }
} 