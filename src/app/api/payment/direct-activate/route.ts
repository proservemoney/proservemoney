import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Earning from '@/models/Earning';
import mongoose from 'mongoose';
import { getCommissionRate, calculateCommission } from '@/config/referralConfig';

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
 * Process commissions for a user's referral chain
 * @param userId - The ID of the user who completed payment
 * @param packageType - 'premium' or 'basic'
 * @param packageAmount - The amount paid for the package
 */
async function processReferralCommissions(
  userId: mongoose.Types.ObjectId,
  packageType: 'premium' | 'basic',
  packageAmount: number
) {
  try {
    // Get the user with their referral ancestry
    const user = await User.findById(userId).select('referralAncestors name');
    
    if (!user || !user.referralAncestors || user.referralAncestors.length === 0) {
      console.log('No referral ancestors found for user:', userId);
      return { success: true, commissions: 0 };
    }
    
    console.log(`Processing commissions for ${user.referralAncestors.length} ancestors`);
    
    let commissionsCreated = 0;
    
    // Process commissions for each ancestor in the referral chain
    for (const ancestor of user.referralAncestors) {
      const level = ancestor.level;
      
      // Get the commission rate from the central configuration
      const commissionRate = getCommissionRate(packageType, level);
      
      if (commissionRate > 0) {
        // Calculate commission amount using the central calculation function
        const commissionAmount = calculateCommission(packageAmount, commissionRate);
        
        console.log(`Calculating commission for level ${level}: ${commissionRate}% of ${packageAmount} = ${commissionAmount}`);
        
        // Create earning record
        const earning = new Earning({
          userId: ancestor.userId,
          amount: commissionAmount,
          currency: 'INR',
          source: 'commission',
          referralId: userId,
          level: level,
          description: `Level ${level} commission from referral (${packageType} package)`,
          status: 'approved'
        });
        
        await earning.save();
        
        // Update total earnings for the referrer
        await User.findByIdAndUpdate(ancestor.userId, {
          $inc: { totalEarnings: commissionAmount }
        });
        
        commissionsCreated++;
      }
    }
    
    return { success: true, commissions: commissionsCreated };
  } catch (error) {
    console.error('Error processing referral commissions:', error);
    return { success: false, error };
  }
}

/**
 * Direct Account Activation API
 * 
 * This endpoint activates a user account directly without requiring payment token verification.
 * It saves address and payment information, marks the account as active, and processes commissions.
 */
export async function POST(request: NextRequest) {
  try {
    // Log the received request for debugging
    const requestData = await request.json();
    console.log('Direct-activate received request:', requestData);
    
    const { userId, email, address, plan } = requestData;
    
    // Validate required fields
    if (!userId || !email) {
      console.error('Missing required fields:', { userId: !!userId, email: !!email });
      return NextResponse.json(
        { success: false, message: 'Missing user ID or email' },
        { status: 400 }
      );
    }

    // Validate that userId is not undefined and is in valid MongoDB ObjectId format (24 hex characters)
    if (userId === undefined || userId === 'undefined' || !/^[0-9a-fA-F]{24}$/.test(userId)) {
      console.error('Invalid userId format or undefined:', userId);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format or undefined' },
        { status: 400 }
      );
    }
    
    // Connect to database
    console.log('Connecting to database...');
    await connectDB();
    
    try {
      // Create a proper MongoDB ObjectId from the string
      const objectId = new mongoose.Types.ObjectId(userId);
      console.log('Created ObjectId:', objectId.toString());
      
      // Find user and update payment status
      console.log('Finding user with ID:', objectId);
      const user = await User.findById(objectId);
      
      if (!user) {
        console.error('User not found for ID:', objectId);
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      
      console.log('Found user:', { id: user._id.toString(), email: user.email, name: user.name });
      
      // Generate a referral code if the user doesn't have one yet
      if (!user.referralCode) {
        // Try to generate a unique referral code
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
      
      // Store address data
      if (address) {
        user.previousRegData = {
          ...user.previousRegData,
          address: {
            address: address.address || '',
            city: address.city || '',
            state: address.state || '',
            pincode: address.pincode || '',
            country: address.country || 'India'
          },
          lastUpdated: new Date()
        };
      }
      
      // Store plan data
      let planAmount = 800; // Default to basic plan (₹800)
      if (plan) {
        if (!user.previousRegData) {
          user.previousRegData = {
            lastUpdated: new Date()
          };
        }
        
        planAmount = plan.amount || 800;
        user.planAmount = planAmount;
        
        user.previousRegData.plan = {
          planId: plan.planId || 'basic',
          planAmount: planAmount,
          gstAmount: plan.gstAmount || 0
        };
      }
      
      // Update user payment information
      user.paymentCompleted = true;
      user.paymentDate = new Date();
      user.status = 'active';
      
      // Add payment information
      user.paymentInfo = {
        amount: planAmount,
        currency: 'INR',
        last4: '1234', // Demo value - would come from actual payment gateway
        paymentMethod: 'direct',
        paymentDate: new Date()
      };
      
      // Save the updated user
      console.log('Saving updated user data...');
      await user.save();
      console.log('User successfully updated and saved');
      
      // Determine package type based on plan amount
      const packageType = planAmount >= 2500 ? 'premium' : 'basic';
      
      console.log(`Processing commissions for user ${user.name} with ${packageType} plan (₹${planAmount})`);
      
      // Process commissions for the referral chain
      const commissionResult = await processReferralCommissions(objectId, packageType, planAmount);
      
      if (commissionResult.success) {
        console.log(`Successfully processed ${commissionResult.commissions} commissions`);
      } else {
        console.error('Failed to process commissions:', commissionResult.error);
      }
      
      return NextResponse.json(
        { 
          success: true, 
          message: 'Account successfully activated',
          userName: user.name,
          referralCode: user.referralCode || null,
          commissionsProcessed: commissionResult.commissions || 0
        },
        { status: 200 }
      );
    } catch (dbError: unknown) {
      const castError = dbError as MongoDBCastError;
      if (castError.name === 'CastError' && castError.path === '_id') {
        console.error('MongoDB CastError:', castError);
        return NextResponse.json(
          { success: false, message: 'Invalid user ID format: ' + castError.value },
          { status: 400 }
        );
      }
      console.error('Database error:', dbError);
      throw dbError;
    }
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Account activation error:', errorMessage);
    
    return NextResponse.json(
      { success: false, message: 'Account activation failed: ' + errorMessage },
      { status: 500 }
    );
  }
}