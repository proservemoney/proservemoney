import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { 
  PLANS, 
  MAX_REFERRAL_DEPTH, 
  BASIC_PLAN_COMMISSION_RATES, 
  PREMIUM_PLAN_COMMISSION_RATES 
} from '@/config/referralConfig';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authCheck = await verifyAuth();
    
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Calculate total commission percentages
    const calculateTotalCommission = (rates: any) => {
      return Object.values(rates).reduce((total: number, rate: any) => total + Number(rate), 0);
    };
    
    const basicTotalCommission = calculateTotalCommission(BASIC_PLAN_COMMISSION_RATES);
    const premiumTotalCommission = calculateTotalCommission(PREMIUM_PLAN_COMMISSION_RATES);
    
    // Calculate company profit percentages
    const basicCompanyProfit = 100 - basicTotalCommission;
    const premiumCompanyProfit = 100 - premiumTotalCommission;
    
    // Calculate actual values
    const basicCommissionTotal = PLANS.BASIC.amount * (basicTotalCommission / 100);
    const basicCompanyProfitAmount = PLANS.BASIC.amount * (basicCompanyProfit / 100);
    
    const premiumCommissionTotal = PLANS.PREMIUM.amount * (premiumTotalCommission / 100);
    const premiumCompanyProfitAmount = PLANS.PREMIUM.amount * (premiumCompanyProfit / 100);
    
    return NextResponse.json({
      success: true,
      config: {
        maxReferralDepth: MAX_REFERRAL_DEPTH,
        plans: PLANS,
        commissionRates: {
          basic: BASIC_PLAN_COMMISSION_RATES,
          premium: PREMIUM_PLAN_COMMISSION_RATES
        },
        summary: {
          basic: {
            planAmount: PLANS.BASIC.amount,
            totalCommissionPercent: basicTotalCommission,
            totalCommissionAmount: basicCommissionTotal,
            companyProfitPercent: basicCompanyProfit,
            companyProfitAmount: basicCompanyProfitAmount
          },
          premium: {
            planAmount: PLANS.PREMIUM.amount,
            totalCommissionPercent: premiumTotalCommission,
            totalCommissionAmount: premiumCommissionTotal,
            companyProfitPercent: premiumCompanyProfit,
            companyProfitAmount: premiumCompanyProfitAmount
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching commission config:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch commission configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 