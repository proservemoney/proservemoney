import connectDB from './db';
import User from '../models/User';
import Commission from '../models/Commission';
import Earning from '../models/Earning';
import WalletTransaction from '../models/WalletTransaction';
import CompanyWallet from '../models/CompanyWallet';
import { 
  PLANS, 
  MAX_REFERRAL_DEPTH, 
  getCommissionRate, 
  calculateCommission 
} from '../config/referralConfig';
import { logUserActivity } from './activity-logger';
import mongoose from 'mongoose';

interface ProcessCommissionsResult {
  success: boolean;
  totalCommissions: number;
  companyAmount: number;
  commissionDetails: {
    userId: string;
    amount: number;
    level: number;
    percentage: number;
  }[];
  error?: string;
}

/**
 * Process commissions for a user who purchased a plan
 * This distributes earnings to all referrers in the ancestry tree
 */
export async function processCommissions(
  userId: string,
  planType: 'basic' | 'premium'
): Promise<ProcessCommissionsResult> {
  try {
    await connectDB();
    
    // Get the user who purchased the plan
    const user = await User.findById(userId);
    if (!user) {
      console.error(`Commission processing: User not found with ID ${userId}`);
      return { 
        success: false, 
        totalCommissions: 0,
        companyAmount: 0,
        commissionDetails: [],
        error: 'User not found' 
      };
    }

    // Validate the plan type
    if (planType !== 'basic' && planType !== 'premium') {
      console.error(`Commission processing: Invalid plan type ${planType} for user ${userId}`);
      return {
        success: false,
        totalCommissions: 0,
        companyAmount: 0,
        commissionDetails: [],
        error: `Invalid plan type: ${planType}`
      };
    }
    
    // Get the plan amount
    const planAmount = planType === 'basic' 
      ? PLANS.BASIC.amount 
      : PLANS.PREMIUM.amount;
    
    // Initialize result object
    const result: ProcessCommissionsResult = {
      success: true,
      totalCommissions: 0,
      companyAmount: 0,
      commissionDetails: []
    };
    
    // Start a transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // Process each ancestor up to the maximum referral depth
      let totalCommissionPercentage = 0;
      
      // Debug log to ensure referralAncestors exists
      console.log(`Commission processing: User ${userId} has referral ancestors:`, 
                  user.referralAncestors ? user.referralAncestors.length : 'none');
      
      if (user.referralAncestors && user.referralAncestors.length > 0) {
        for (const ancestor of user.referralAncestors) {
          if (ancestor.level > MAX_REFERRAL_DEPTH) {
            console.log(`Commission processing: Skipping ancestor at level ${ancestor.level} (exceeds max depth)`);
            continue; // Skip if beyond the maximum depth
          }
          
          // Get the referrer user
          const referrer = await User.findById(ancestor.userId).session(session);
          if (!referrer) {
            console.log(`Commission processing: Ancestor ${ancestor.userId} at level ${ancestor.level} not found`);
            continue; // Skip if referrer not found
          }
          
          // Calculate commission
          const commissionRate = getCommissionRate(planType, ancestor.level);
          const amount = calculateCommission(planAmount, commissionRate);
          
          console.log(`Commission processing: Calculated commission for ${referrer.name} (${referrer._id}) at level ${ancestor.level}: ${amount} (${commissionRate}%)`);
          
          if (amount <= 0) {
            console.log(`Commission processing: Zero commission for level ${ancestor.level}, skipping`);
            continue; // Skip if no commission
          }
          
          // Add to total commission percentage
          totalCommissionPercentage += commissionRate;
          
          // Create commission record
          const commission = new Commission({
            userId: referrer._id,
            fromUserId: user._id,
            amount,
            level: ancestor.level,
            percentage: commissionRate,
            planType,
            planAmount,
            status: 'completed', // Mark as completed immediately
            createdAt: new Date()
          });
          
          await commission.save({ session });
          
          // Add to user's earnings
          const earning = new Earning({
            userId: referrer._id,
            amount,
            currency: 'INR',
            source: 'commission',
            referralId: user._id,
            level: ancestor.level,
            description: `${commissionRate}% commission from ${planType} plan purchase by ${user.name}`,
            createdAt: new Date(),
            status: 'completed' // Mark as completed immediately
          });
          
          await earning.save({ session });
          
          // Create wallet transaction
          const walletTx = new WalletTransaction({
            userId: referrer._id,
            amount,
            transactionType: 'commission',
            referenceId: commission._id.toString(),
            status: 'completed',
            description: `Level ${ancestor.level} commission for ${planType} plan purchase by ${user.name}`,
            createdAt: new Date()
          });
          
          await walletTx.save({ session });
          
          // Update user's wallet balance
          // Make sure wallet field exists
          if (!referrer.wallet) {
            referrer.wallet = { balance: 0 };
          }
          
          referrer.wallet.balance = (referrer.wallet.balance || 0) + amount;
          
          // Also update the totalEarnings field on the user
          referrer.totalEarnings = (referrer.totalEarnings || 0) + amount;
          
          await referrer.save({ session });
          
          // Update running total and add to result details
          result.totalCommissions += amount;
          result.commissionDetails.push({
            userId: referrer._id.toString(),
            amount,
            level: ancestor.level,
            percentage: commissionRate
          });
          
          // Log activity for the referrer
          await logUserActivity({
            userId: referrer._id.toString(),
            type: 'PAYMENT_COMPLETED',
            description: `Earned ₹${amount} commission from ${user.name}'s ${planType} plan purchase at level ${ancestor.level}`,
            meta: {
              fromUser: user._id.toString(),
              amount,
              level: ancestor.level,
              planType
            }
          });
        }
      } else {
        console.log(`Commission processing: User ${userId} has no referral ancestors, no commissions to process`);
      }
      
      // Calculate remaining amount for company wallet (company profit)
      const remainingPercentage = 100 - totalCommissionPercentage;
      const companyAmount = (planAmount * remainingPercentage) / 100;
      result.companyAmount = companyAmount;
      
      // Update company wallet
      await CompanyWallet.findOneAndUpdate(
        { walletId: 'company' },
        { 
          $inc: { balance: companyAmount },
          $set: { updatedAt: new Date() }
        },
        { upsert: true, session }
      );
      
      // Record company transaction
      const companyTx = new WalletTransaction({
        userId: new mongoose.Types.ObjectId('000000000000000000000000'), // Special ID for company
        amount: companyAmount,
        transactionType: 'deposit',
        referenceId: `plan_purchase_${user._id.toString()}`,
        status: 'completed',
        description: `Company revenue from ${planType} plan purchase by ${user.name}`,
        createdAt: new Date()
      });
      
      await companyTx.save({ session });
      
      await session.commitTransaction();
      console.log(`Commission processing: Successfully processed commissions for user ${userId}`);
    } catch (error) {
      await session.abortTransaction();
      console.error(`Commission processing: Error during transaction:`, error);
      throw error;
    } finally {
      session.endSession();
    }
    
    return result;
  } catch (error) {
    console.error('Error processing commissions:', error);
    return { 
      success: false, 
      totalCommissions: 0,
      companyAmount: 0,
      commissionDetails: [],
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user commission statistics
 */
export async function getUserCommissionStats(userId: string) {
  try {
    await connectDB();
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    // Get direct referrals (users who used this user's referral code)
    const directReferrals = await User.countDocuments({
      referredBy: new mongoose.Types.ObjectId(userId)
    });
    
    // Get total team size (all levels of referrals)
    const teamSize = await User.countDocuments({
      'referralAncestors.userId': new mongoose.Types.ObjectId(userId)
    });
    
    // Get total earnings
    const totalEarningsResult = await Earning.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          source: 'commission',
          status: { $ne: 'failed' }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    const totalEarnings = totalEarningsResult.length > 0 ? totalEarningsResult[0].total : 0;
    
    // Get earnings breakdown by level
    const earningsByLevel = await Earning.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          source: 'commission',
          status: { $ne: 'failed' }
        }
      },
      {
        $group: {
          _id: '$level',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletBalance: user.wallet?.balance || 0
      },
      referrals: {
        direct: directReferrals,
        team: teamSize
      },
      earnings: {
        total: totalEarnings,
        byLevel: earningsByLevel.map(item => ({
          level: item._id,
          amount: item.total,
          transactions: item.count
        }))
      }
    };
  } catch (error) {
    console.error('Error getting user commission stats:', error);
    throw error;
  }
} 