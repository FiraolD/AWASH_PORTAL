import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Eye, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';



interface PendingPolicy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  submittedDate: string;
  status: string;
  riskScore?: number;
}


export default function PolicyQueuePage() {
  console.log('PolicyQueuePage is rendering!')
  const [policies, setPolicies] = useState<PendingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PendingPolicy | null>(null);
  const [adjustedPremium, setAdjustedPremium] = useState('');
  const [underwriterNotes, setUnderwriterNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingPolicies = async () => {
    setLoading(true);
    try {
      // FIXED: Use the correct underwriting endpoint
      const response = await axiosInstance.get('/underwriting/pending-review');
      console.log('Fetched policies:', response.data);
      setPolicies(response.data);
    } catch (error) {
      console.error('Failed to fetch pending policies:', error);
      toast.error('Failed to load policy queue');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPolicies();
  }, []);

  const handleAdjustPremium = async () => {
    if (!selectedPolicy) return;
    
    if (!adjustedPremium || parseFloat(adjustedPremium) <= 0) {
      toast.error('Please enter a valid premium amount');
      return;
    }
    
    if (!underwriterNotes.trim()) {
      toast.error('Please add notes explaining the premium adjustment');
      return;
    }
    
    setSubmitting(true);
    try {
      // FIXED: Use the correct underwriting adjust endpoint
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/adjust`, {
        adjusted_premium: parseFloat(adjustedPremium),
        underwriter_notes: underwriterNotes
      });
      
      toast.success('Premium adjustment submitted! Customer will be notified.');
      setSelectedPolicy(null);
      setAdjustedPremium('');
      setUnderwriterNotes('');
      fetchPendingPolicies();
    } catch (error) {
      console.error('Failed to submit adjustment:', error);
      toast.error('Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      PENDING_UNDERWRITING: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
      SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
      UNDER_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-800' },
      AWAITING_CUSTOMER_APPROVAL: { label: 'Awaiting Customer', color: 'bg-orange-100 text-orange-800' },
      PENDING_FINAL_APPROVAL: { label: 'Pending Final', color: 'bg-indigo-100 text-indigo-800' },
      ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' }
    };
    return badges[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
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
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Policy Approval Queue</h1>
        <p className="text-gray-500 mt-1">Review and adjust premiums for pending policy applications</p>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending policies for review</p>
            <p className="text-sm text-gray-400 mt-1">All policies have been processed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => {
            const statusBadge = getStatusBadge(policy.status);
            return (
              <Card key={policy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                        <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium">{policy.type}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Coverage Amount</p>
                          <p className="font-medium">ETB {policy.coverageAmount?.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Requested Premium</p>
                          <p className="font-medium">ETB {policy.premium?.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <p className="text-gray-500">Customer</p>
                        <p className="font-medium">{policy.customerName}</p>
                        <p className="text-gray-500 text-xs">{policy.customerEmail}</p>
                      </div>
                    </div>
                    
                    <Button onClick={() => {
                      setSelectedPolicy(policy);
                      setAdjustedPremium(policy.premium?.toString() || '');
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review & Adjust
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Premium Adjustment Modal */}
      <Dialog open={!!selectedPolicy} onOpenChange={() => setSelectedPolicy(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Policy: {selectedPolicy?.policyNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedPolicy && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Policy Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium">{selectedPolicy.customerName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium">{selectedPolicy.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Coverage Amount</p>
                    <p className="font-medium">ETB {selectedPolicy.coverageAmount?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Requested Premium</p>
                    <p className="font-medium">ETB {selectedPolicy.premium?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Adjusted Premium (ETB)
                </Label>
                <Input
                  type="number"
                  value={adjustedPremium}
                  onChange={(e) => setAdjustedPremium(e.target.value)}
                  placeholder="Enter adjusted premium amount"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Original: ETB {selectedPolicy.premium?.toLocaleString()}
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Message to Customer
                </Label>
                <Textarea
                  value={underwriterNotes}
                  onChange={(e) => setUnderwriterNotes(e.target.value)}
                  placeholder="Explain the premium adjustment, provide justification, or ask for additional information..."
                  rows={4}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleAdjustPremium} 
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Submit Adjustment & Notify Customer
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