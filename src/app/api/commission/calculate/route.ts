import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Earning from '@/models/Earning';
import { 
  PLANS, 
  MAX_REFERRAL_DEPTH, 
  getCommissionRate, 
  calculateCommission 
} from '@/config/referralConfig';

/**
 * Calculate Commission API
 * 
 * This endpoint calculates and distributes commissions for all users based on their referral network
 */
export async function POST(request: NextRequest) {
  try {
    // Connect to database
    await connectDB();
    
    // Get all active users
    const users = await User.find({ status: 'active', paymentCompleted: true });
    
    let totalCommissionsCreated = 0;
    let processedUsers = 0;
    
    // Process each user
    for (const user of users) {
      // Skip users without referral ancestry
      if (!user.referralAncestors || user.referralAncestors.length === 0) {
        continue;
      }
      
      // Determine the user's package type and price from config
      const planType = user.planAmount >= PLANS.PREMIUM.amount ? 'premium' : 'basic';
      const planAmount = planType === 'premium' ? PLANS.PREMIUM.amount : PLANS.BASIC.amount;
      
      // Check if we've already processed this user's commission
      const existingCommission = await Earning.findOne({
        referralId: user._id,
        source: 'commission'
      });
      
      if (existingCommission) {
        continue; // Skip if commission was already distributed
      }
      
      // Distribute commissions to ancestors based on their level
      for (const ancestor of user.referralAncestors) {
        // Get the appropriate commission rate based on level and package
        const level = ancestor.level;
        if (level > MAX_REFERRAL_DEPTH) continue; // Skip levels beyond max depth defined in config
        
        // Get commission rate from config (rate is percentage, e.g., 12 for 12%)
        const commissionRatePercentage = getCommissionRate(planType, level);
        
        if (commissionRatePercentage > 0) {
          // Calculate commission amount using function from config
          const commissionAmount = calculateCommission(planAmount, commissionRatePercentage);
          
          // Create earning record for the ancestor
          const earning = new Earning({
            userId: ancestor.userId,
            amount: commissionAmount,
            currency: 'INR',
            source: 'commission',
            referralId: user._id,
            level: level,
            description: `Level ${level} commission (${commissionRatePercentage}%) from referral (${planType} plan)`, // Use planType and add percentage
            status: 'completed' // Use 'completed' to match commission-service.ts
          });
          
          await earning.save();
          
          // Update the ancestor's total earnings
          await User.findByIdAndUpdate(ancestor.userId, {
            $inc: { totalEarnings: commissionAmount }
          });
          
          totalCommissionsCreated++;
        }
      }
      
      processedUsers++;
    }
    
    return NextResponse.json({
      success: true,
      message: `Commission calculation completed. Processed ${processedUsers} users and created ${totalCommissionsCreated} commission earnings.`
    });
    
  } catch (error: any) {
    console.error('Error calculating commissions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate commissions', message: error.message },
      { status: 500 }
    );
  }
}