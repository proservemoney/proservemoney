'use client';

import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

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
}

export default function TransactionTable({ transactions }: TransactionTableProps) {
  // Sort transactions by date, newest first
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.length > 0 ? (
            sortedTransactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">
                  {new Date(transaction.date).toLocaleDateString()}
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  {transaction.type === 'earning' ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {transaction.source || 'Earning'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Withdrawal
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {transaction.amount >= 0 ? (
                      <ArrowUpIcon className="inline h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownIcon className="inline h-3 w-3 mr-1" />
                    )}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      transaction.status === 'completed' || transaction.status === 'success' 
                        ? 'success' 
                        : transaction.status === 'pending' 
                        ? 'warning' 
                        : 'secondary'
                    }
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                No transactions found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
} 