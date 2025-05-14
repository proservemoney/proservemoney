import React from 'react';
import { formatCurrency, formatDate } from '../lib/utils';
import CurrencyDisplay from './CurrencyDisplay';

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  status: string;
  type: 'earning' | 'withdrawal';
  source?: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  loading?: boolean;
}

export default function TransactionTable({ transactions, loading = false }: TransactionTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-10 theme-text-secondary">
        No transactions found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
              Date
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium theme-text-secondary uppercase tracking-wider">
              Description
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium theme-text-secondary uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium theme-text-secondary uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {transactions.map((transaction) => (
            <tr key={transaction.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm theme-text">
                {formatDate(transaction.date)}
              </td>
              <td className="px-6 py-4 text-sm theme-text">
                <div className="flex items-center">
                  {transaction.type === 'earning' && (
                    <span className="mr-2 flex-shrink-0 h-4 w-4 text-green-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </span>
                  )}
                  {transaction.type === 'withdrawal' && (
                    <span className="mr-2 flex-shrink-0 h-4 w-4 text-red-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </span>
                  )}
                  {transaction.description}
                  {transaction.source && (
                    <span className="ml-2 text-xs theme-text-secondary">
                      ({transaction.source})
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2">
                <CurrencyDisplay 
                  amount={transaction.amount} 
                  iconSize={14} 
                  fontWeight={500} 
                  className={transaction.type === 'credit' ? 'text-green-500' : 'text-red-500'} 
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${transaction.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                    transaction.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                  {transaction.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 