/**
 * Referral System Configuration
 * -------------------------------
 * This file defines the referral system parameters including
 * commission rates and plan types.
 */

// Maximum depth of the referral tree (how many levels get commissions)
export const MAX_REFERRAL_DEPTH = 10;

// Define available plans and their amounts
export const PLANS = {
  BASIC: {
    amount: 800, // Amount in INR
    label: 'Basic Plan'
  },
  PREMIUM: {
    amount: 2500, // Amount in INR
    label: 'Premium Plan'
  }
};

// Define commission rates for basic plan
export const BASIC_PLAN_COMMISSION_RATES = [
  { level: 1, rate: 0.10 }, // 10% for level 1 (direct referrals)
  { level: 2, rate: 0.05 }, // 5% for level 2
  { level: 3, rate: 0.02 }, // 2% for level 3
  { level: 4, rate: 0.01 }, // 1% for level 4
  { level: 5, rate: 0.005 }, // 0.5% for level 5
];

// Define commission rates for premium plan
export const PREMIUM_PLAN_COMMISSION_RATES = [
  { level: 1, rate: 0.15 }, // 15% for level 1 (direct referrals)
  { level: 2, rate: 0.07 }, // 7% for level 2
  { level: 3, rate: 0.03 }, // 3% for level 3
  { level: 4, rate: 0.02 }, // 2% for level 4
  { level: 5, rate: 0.01 }, // 1% for level 5
  { level: 6, rate: 0.005 }, // 0.5% for level 6
  { level: 7, rate: 0.005 }, // 0.5% for level 7
];

// Define commission rates for enterprise plan
export const ENTERPRISE_PLAN_COMMISSION_RATES = [
  { level: 1, rate: 0.20 }, // 20% for level 1 (direct referrals)
  { level: 2, rate: 0.10 }, // 10% for level 2
  { level: 3, rate: 0.05 }, // 5% for level 3
  { level: 4, rate: 0.03 }, // 3% for level 4
  { level: 5, rate: 0.02 }, // 2% for level 5
  { level: 6, rate: 0.01 }, // 1% for level 6
  { level: 7, rate: 0.005 }, // 0.5% for level 7
];

// Calculate maximum possible earnings for each plan
export const calculateMaxEarnings = (basePlanAmount: number, rates: Array<{level: number, rate: number}>) => {
  return rates.reduce((total, level) => total + (basePlanAmount * level.rate), 0);
};

// Define plan amounts
export const PLAN_AMOUNTS = {
  BASIC: 100,
  PREMIUM: 500,
  ENTERPRISE: 1000,
};

// Define referral bonus conditions
export const REFERRAL_BONUS_CONDITIONS = {
  DIRECT_REFERRALS_MILESTONE: [5, 10, 20, 50, 100],
  BONUS_AMOUNTS: [50, 100, 250, 500, 1000],
};

// Define withdrawal limits
export const WITHDRAWAL_LIMITS = {
  MINIMUM_WITHDRAWAL: 20,
  DAILY_WITHDRAWAL_LIMIT: 5000,
  WEEKLY_WITHDRAWAL_LIMIT: 20000,
  MONTHLY_WITHDRAWAL_LIMIT: 50000,
};

/**
 * Get commission rate based on plan type and level
 * @param planType Plan type ('basic' or 'premium')
 * @param level Referral level
 * @returns Commission rate as percentage
 */
export function getCommissionRate(planType: 'basic' | 'premium', level: number): number {
  const rates = planType === 'basic' ? BASIC_PLAN_COMMISSION_RATES : PREMIUM_PLAN_COMMISSION_RATES;
  
  // Make sure level is within the maximum depth
  if (level > MAX_REFERRAL_DEPTH) return 0;
  
  // Return the commission rate for the specified level
  const rate = rates.find(r => r.level === level);
  return rate ? rate.rate * 100 : 0;
}

/**
 * Calculate commission amount based on plan amount and rate
 * @param planAmount Amount of the plan purchased
 * @param rate Commission rate as percentage
 * @returns Commission amount
 */
export function calculateCommission(planAmount: number, rate: number): number {
  return (planAmount * rate) / 100;
}