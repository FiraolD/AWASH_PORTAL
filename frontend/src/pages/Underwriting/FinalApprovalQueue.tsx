import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, MessageSquare, DollarSign, User, Loader2, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface PolicyForFinalApproval {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  originalPremium: number;
  adjustedPremium: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDecision: string;
  customerDecisionNotes: string;
  underwriterNotes: string;
  status: string;
  createdAt: string;
  customerDecisionDate: string;
}

export default function FinalApprovalQueue() {
  const { user } = useAuthStore();
  const [policies, setPolicies] = useState<PolicyForFinalApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyForFinalApproval | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userRole = user?.role?.toUpperCase() || '';
  // FIXED: Added SENIOR_UNDERWRITING_OFFICER to the allowed roles
  const canApprove = ['UNDERWRITING_ADMIN', 'MANAGER_UNDERWRITING', 'HEAD_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'MASTER_ADMIN'].includes(userRole);

  console.log('User role:', userRole);
  console.log('Can approve:', canApprove);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get('/underwriting/pending-final-approval');
      console.log('Final approval policies:', response.data);
      setPolicies(response.data);
    } catch (error) {
      console.error('Failed to fetch final approval policies:', error);
      toast.error('Failed to load policies');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalApproval = async () => {
    if (!selectedPolicy) return;
    
    setSubmitting(true);
    try {
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/final-approve`, {
        notes: approvalNotes
      });
      
      toast.success('Policy fully approved and activated!');
      setSelectedPolicy(null);
      setApprovalNotes('');
      fetchPolicies();
    } catch (error) {
      console.error('Failed to approve policy:', error);
      toast.error('Failed to approve policy');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount?.toLocaleString() || '0'}`;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING_FINAL_APPROVAL: 'bg-yellow-100 text-yellow-800',
      ACTIVE: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Final Approval Queue</h1>
        <p className="text-gray-500 mt-1">Policies accepted by customers awaiting your final approval</p>
        <Badge className="mt-2 bg-blue-100 text-blue-800">
          Role: {userRole} • {canApprove ? 'Can Approve' : 'View Only'}
        </Badge>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500">No policies pending final approval</p>
            <p className="text-sm text-gray-400 mt-1">All customer-accepted policies have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-md transition-shadow border-2 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                      <Badge className={getStatusBadge(policy.status)}>
                        {policy.status?.replace(/_/g, ' ')}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        Customer Accepted
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Customer</p>
                        <p className="font-medium">{policy.customerName}</p>
                        <p className="text-xs text-gray-400">{policy.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Final Premium</p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(policy.adjustedPremium || policy.premium)}
                        </p>
                        <p className="text-xs text-gray-400 line-through">
                          Original: {formatCurrency(policy.originalPremium)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Coverage Amount</p>
                        <p className="font-medium">{formatCurrency(policy.coverageAmount)}</p>
                      </div>
                    </div>
                    
                    {/* Premium Comparison */}
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Customer Requested</p>
                          <p className="text-sm line-through text-gray-400">{formatCurrency(policy.originalPremium)}</p>
                        </div>
                        <div className="text-xl font-bold text-blue-600">→</div>
                        <div>
                          <p className="text-xs text-gray-500">Underwriter Offer</p>
                          <p className="text-sm font-semibold text-blue-600">{formatCurrency(policy.adjustedPremium)}</p>
                        </div>
                        <div className="text-xl font-bold text-green-600">→</div>
                        <div>
                          <p className="text-xs text-gray-500">Customer Accepted</p>
                          <p className="text-sm font-semibold text-green-600">{formatCurrency(policy.adjustedPremium)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Underwriter Notes */}
                    {policy.underwriterNotes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Your Notes to Customer
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{policy.underwriterNotes}</p>
                      </div>
                    )}
                    
                    {/* Customer Response */}
                    {policy.customerDecisionNotes && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Customer Response
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{policy.customerDecisionNotes}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Customer accepted on: {new Date(policy.customerDecisionDate).toLocaleString()}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setSelectedPolicy(policy)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!canApprove}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Review & Approve
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Final Approval Modal */}
      <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Final Approval: {selectedPolicy?.policyNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedPolicy && (
            <div className="space-y-6">
              {/* Policy Details Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Policy Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{selectedPolicy.customerName}</p>
                    <p className="text-xs text-gray-400">{selectedPolicy.customerEmail}</p>
                    <p className="text-xs text-gray-400">{selectedPolicy.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Policy Type</p>
                    <p className="font-medium">{selectedPolicy.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Coverage Amount</p>
                    <p className="font-medium">{formatCurrency(selectedPolicy.coverageAmount)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Final Premium</p>
                    <p className="font-medium text-green-600">{formatCurrency(selectedPolicy.adjustedPremium)}</p>
                  </div>
                </div>
              </div>

              {/* Premium Adjustment History */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Premium Adjustment History</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">Customer Requested:</span>
                    <span className="font-medium">{formatCurrency(selectedPolicy.originalPremium)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm text-blue-600">Underwriter Offer:</span>
                    <span className="font-medium text-blue-600">{formatCurrency(selectedPolicy.adjustedPremium)}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm text-green-600">Customer Accepted:</span>
                    <span className="font-medium text-green-600">{formatCurrency(selectedPolicy.adjustedPremium)}</span>
                  </div>
                </div>
              </div>

              {/* Underwriter Notes */}
              {selectedPolicy.underwriterNotes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Your Previous Notes to Customer</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedPolicy.underwriterNotes}</p>
                </div>
              )}

              {/* Customer Response */}
              {selectedPolicy.customerDecisionNotes && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm font-medium">Customer Response</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedPolicy.customerDecisionNotes}</p>
                </div>
              )}

              {/* Approval Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700">Approval Notes (Optional)</label>
                <Textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any final notes or conditions for this policy..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  Once approved, this policy will become ACTIVE and the customer will be notified.
                  The policy cannot be modified after approval.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleFinalApproval} 
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve & Activate Policy
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedPolicy(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}