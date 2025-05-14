'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import AdminLayout from '@/components/layouts/AdminLayout';
import { formatCurrency, formatDate } from '@/lib/utils';

type Withdrawal = {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  details: {
    accountNumber?: string;
    bankName?: string;
    accountHolderName?: string;
    ifscCode?: string;
    upiId?: string;
    walletAddress?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  adminMessage?: string;
  user?: {
    name: string;
    email: string;
  }
};

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/withdrawals');
      const data = await response.json();
      
      if (data.success) {
        setWithdrawals(data.withdrawals);
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to fetch withdrawals',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while fetching withdrawals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionType) return;
    
    try {
      setProcessingId(selectedWithdrawal._id);
      
      const response = await fetch(`/api/admin/withdrawals/${selectedWithdrawal._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: actionType === 'approve' ? 'approved' : 'rejected',
          adminMessage: adminMessage.trim() || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Success',
          description: `Withdrawal ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
        });
        
        // Update the withdrawal in the list
        setWithdrawals(prev => 
          prev.map(w => 
            w._id === selectedWithdrawal._id 
              ? { 
                  ...w, 
                  status: actionType === 'approve' ? 'approved' : 'rejected',
                  adminMessage: adminMessage.trim() || w.adminMessage
                } 
              : w
          )
        );
      } else {
        toast({
          title: 'Error',
          description: data.message || `Failed to ${actionType} withdrawal`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `An error occurred while trying to ${actionType} the withdrawal`,
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
      closeDialog();
    }
  };

  const openDialog = (withdrawal: Withdrawal, type: 'approve' | 'reject') => {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setAdminMessage('');
  };

  const closeDialog = () => {
    setSelectedWithdrawal(null);
    setActionType(null);
    setAdminMessage('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Withdrawal Requests</CardTitle>
            <CardDescription>
              Manage user withdrawal requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No withdrawal requests found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((withdrawal) => (
                      <TableRow key={withdrawal._id}>
                        <TableCell>{formatDate(withdrawal.createdAt)}</TableCell>
                        <TableCell>
                          {withdrawal.user?.name || 'Unknown User'}
                          <div className="text-xs text-muted-foreground">
                            {withdrawal.user?.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(withdrawal.amount, withdrawal.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{withdrawal.method}</div>
                          <div className="text-xs text-muted-foreground">
                            {withdrawal.method === 'bank' && (
                              <>
                                {withdrawal.details.accountHolderName}, 
                                {withdrawal.details.bankName} ({withdrawal.details.ifscCode})
                              </>
                            )}
                            {withdrawal.method === 'upi' && (
                              <>{withdrawal.details.upiId}</>
                            )}
                            {withdrawal.method === 'wallet' && (
                              <>{withdrawal.details.walletAddress}</>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                        <TableCell>
                          {withdrawal.status === 'pending' ? (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => openDialog(withdrawal, 'approve')}
                                disabled={processingId === withdrawal._id}
                              >
                                {processingId === withdrawal._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => openDialog(withdrawal, 'reject')}
                                disabled={processingId === withdrawal._id}
                              >
                                {processingId === withdrawal._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-1" />
                                )}
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              {withdrawal.adminMessage || `${withdrawal.status} by admin`}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedWithdrawal && !!actionType} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve' 
                ? 'Are you sure you want to approve this withdrawal request?' 
                : 'Are you sure you want to reject this withdrawal request? The amount will be refunded to the user\'s balance.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedWithdrawal && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Amount:</div>
                <div>{formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency)}</div>
                
                <div className="text-muted-foreground">User:</div>
                <div>{selectedWithdrawal.user?.name || 'Unknown User'}</div>
                
                <div className="text-muted-foreground">Method:</div>
                <div>{selectedWithdrawal.method}</div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Admin Message (optional)</label>
                <Textarea
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  placeholder="Add an optional message or reason"
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleAction}
              disabled={processingId !== null}
              variant={actionType === 'approve' ? 'default' : 'destructive'}
            >
              {processingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {actionType === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
} 