// frontend/src/components/policies/PolicyReviewQueue.tsx
import React, { useEffect, useState } from 'react';
import axios from '../../lib/axios';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { toast } from 'sonner';

interface PendingPolicy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  status: string;
  approvalType: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
}

export default function PolicyReviewQueue() {
  const [policies, setPolicies] = useState<PendingPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PendingPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewData, setReviewData] = useState({
    decision: 'APPROVE',
    adjustedPremium: '',
    underwriterNotes: '',
    sendToCustomer: true
  });

  useEffect(() => {
    fetchPendingPolicies();
  }, []);

  const fetchPendingPolicies = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/policies/pending-underwriting');
      setPolicies(response.data);
    } catch (error) {
      console.error('Failed to fetch pending policies:', error);
      toast.error('Failed to load pending policies');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectApprove = async (policyId: string) => {
    if (!confirm('Are you sure you want to directly approve this policy? This will skip underwriting review.')) {
      return;
    }
    
    try {
      await axios.post(`/policies/${policyId}/direct-approve`, {
        comments: 'Directly approved by authorized personnel'
      });
      toast.success('Policy approved successfully');
      fetchPendingPolicies();
      setIsReviewDialogOpen(false);
    } catch (error) {
      console.error('Failed to approve policy:', error);
      toast.error('Failed to approve policy');
    }
  };

  const handleReviewAdjust = async () => {
    if (!selectedPolicy) return;
    
    try {
      await axios.post(`/policies/${selectedPolicy.id}/review-adjust`, {
        decision: reviewData.decision,
        adjustedPremium: reviewData.adjustedPremium ? parseFloat(reviewData.adjustedPremium) : null,
        underwriterNotes: reviewData.underwriterNotes,
        sendToCustomer: reviewData.sendToCustomer
      });
      
      toast.success(`Policy ${reviewData.decision.toLowerCase()}d successfully`);
      setIsReviewDialogOpen(false);
      fetchPendingPolicies();
      setSelectedPolicy(null);
    } catch (error) {
      console.error('Failed to review policy:', error);
      toast.error('Failed to process policy');
    }
  };

  const getApprovalTypeBadge = (type: string) => {
    if (type === 'DIRECT_APPROVAL') {
      return <Badge className="bg-purple-100 text-purple-800">Direct Approval</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Review Needed</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A3E6F]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#1A3E6F]">Policy Review Queue</h2>
          <p className="text-gray-500">Review and process pending policy applications</p>
        </div>
        <Button onClick={fetchPendingPolicies} variant="outline">
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {policies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 text-gray-500">
              No pending policies to review
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {policy.policyNumber} - {policy.type}
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Customer: {policy.customerName} ({policy.customerEmail})
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getApprovalTypeBadge(policy.approvalType)}
                    <Badge className="bg-blue-100 text-blue-800">
                      {policy.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Coverage Amount</p>
                    <p className="font-semibold">ETB {policy.coverageAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Proposed Premium</p>
                    <p className="font-semibold">ETB {policy.premium?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Submitted</p>
                    <p className="font-semibold">{new Date(policy.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  {policy.approvalType === 'DIRECT_APPROVAL' && (
                    <Button 
                      onClick={() => handleDirectApprove(policy.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Direct Approve
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setIsReviewDialogOpen(true);
                    }}
                    variant="outline"
                  >
                    Review & {policy.approvalType === 'DIRECT_APPROVAL' ? 'Adjust' : 'Underwrite'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Review Policy: {selectedPolicy?.policyNumber}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decision
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 p-2"
                value={reviewData.decision}
                onChange={(e) => setReviewData({ ...reviewData, decision: e.target.value })}
              >
                <option value="APPROVE">Approve</option>
                <option value="REJECT">Reject</option>
                <option value="REQUEST_CHANGES">Request Changes</option>
              </select>
            </div>
            
            {reviewData.decision === 'APPROVE' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjusted Premium (leave blank to keep original)
                  </label>
                  <Input
                    type="number"
                    placeholder="Original: ETB {selectedPolicy?.premium?.toLocaleString()}"
                    value={reviewData.adjustedPremium}
                    onChange={(e) => setReviewData({ ...reviewData, adjustedPremium: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendToCustomer"
                    checked={reviewData.sendToCustomer}
                    onChange={(e) => setReviewData({ ...reviewData, sendToCustomer: e.target.checked })}
                  />
                  <label htmlFor="sendToCustomer" className="text-sm text-gray-700">
                    Send offer to customer for approval
                  </label>
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes / Comments
              </label>
              <Textarea
                rows={4}
                placeholder="Add your review notes here..."
                value={reviewData.underwriterNotes}
                onChange={(e) => setReviewData({ ...reviewData, underwriterNotes: e.target.value })}
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleReviewAdjust} className="bg-[#1A3E6F]">
                Submit Review
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}