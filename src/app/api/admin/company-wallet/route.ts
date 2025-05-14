import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import CompanyWallet from '@/models/CompanyWallet';
import WalletTransaction from '@/models/WalletTransaction';
import Order from '@/models/Order';
import Commission from '@/models/Commission';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authCheck = await verifyAuth();
    if (!authCheck.success) {
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Check authorization - only admins can view company wallet
    if (!authCheck.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Connect to database
    await connectDB();
    
    // Get company wallet
    const companyWallet = await CompanyWallet.findOne({ walletId: 'company' });
    
    // Get total collected from plan purchases
    const totalCollected = await WalletTransaction.aggregate([
      {
        $match: { 
          transactionType: 'purchase',
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $abs: '$amount' } } // Use abs to convert negative purchase amounts to positive
        }
      }
    ]);
    
    // Get total distributed as commissions
    const totalCommissions = await Commission.aggregate([
      {
        $match: { status: { $ne: 'failed' } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);
    
    // Get commission breakdown by levels
    const commissionByLevel = await Commission.aggregate([
      {
        $match: { status: { $ne: 'failed' } }
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
    
    // Get recent transactions
    const recentTransactions = await WalletTransaction.find({
      $or: [
        { transactionType: 'deposit', userId: '000000000000000000000000' }, // Company deposits
        { transactionType: 'commission', status: 'completed' } // Commission payouts
      ]
    })
    .sort({ createdAt: -1 })
    .limit(20);
    
    return NextResponse.json({
      success: true,
      wallet: {
        balance: companyWallet ? companyWallet.balance : 0,
        lastUpdated: companyWallet ? companyWallet.updatedAt : null
      },
      statistics: {
        totalCollected: totalCollected.length > 0 ? totalCollected[0].total : 0,
        totalCommissions: totalCommissions.length > 0 ? totalCommissions[0].total : 0,
        netProfit: totalCollected.length > 0 && totalCommissions.length > 0 
          ? totalCollected[0].total - totalCommissions[0].total 
          : 0,
        commissionByLevel: commissionByLevel.map(item => ({
          level: item._id,
          amount: item.total,
          transactions: item.count
        }))
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching company wallet stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch company wallet statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 