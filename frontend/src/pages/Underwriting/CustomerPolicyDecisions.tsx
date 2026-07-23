import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Textarea';
import { Badge } from '../../components/ui/Badge';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface PolicyOffer {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  originalPremium: number;
  adjustedPremium: number;
  underwriterNotes: string;
  status: string;
  updatedAt: string;
}

export default function CustomerPolicyDecisions() {
  const [policies, setPolicies] = useState<PolicyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyOffer | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingDecisions();
  }, []);

  const fetchPendingDecisions = async () => {
    setLoading(true);
    try {
      // Fetch policies awaiting customer decision
      const response = await axiosInstance.get('/policies/pending-decision');
      console.log('Pending decisions:', response.data);
      setPolicies(response.data);
    } catch (error) {
      console.error('Failed to fetch pending decisions:', error);
      toast.error('Failed to load pending decisions');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'ACCEPT' | 'REJECT') => {
    if (!selectedPolicy) return;
    
    setSubmitting(true);
    try {
      await axiosInstance.post(`/policies/${selectedPolicy.id}/respond`, {
        decision: decision,
        notes: decisionNotes
      });
      
      toast.success(decision === 'ACCEPT' 
        ? 'Offer accepted! Policy will be finalized by underwriter.' 
        : 'Offer rejected. You can submit a new application.'
      );
      
      setSelectedPolicy(null);
      setDecisionNotes('');
      fetchPendingDecisions();
    } catch (error: any) {
      console.error('Failed to submit decision:', error);
      toast.error(error.response?.data?.error || 'Failed to process your decision');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount?.toLocaleString() || '0'}`;
  };

  const getSavingsAmount = (original: number, adjusted: number) => {
    const savings = original - adjusted;
    if (savings > 0) return `You save ${formatCurrency(savings)}`;
    if (savings < 0) return `Premium increased by ${formatCurrency(Math.abs(savings))}`;
    return 'No change to premium';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading policy offers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Policy Offers</h1>
        <p className="text-gray-500 mt-1">Review and respond to underwriter premium adjustments</p>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending policy offers</p>
            <p className="text-sm text-gray-400 mt-1">All your policies have been reviewed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="border-2 hover:border-blue-300 transition-all">
              <CardContent className="p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                      <Badge className="bg-purple-100 text-purple-800">
                        Offer Pending
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Product Type</p>
                        <p className="font-medium">{policy.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Coverage Amount</p>
                        <p className="font-medium">{formatCurrency(policy.coverageAmount)}</p>
                      </div>
                    </div>
                    
                    {/* Premium Comparison */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2">Premium Adjustment</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Original Request</p>
                          <p className="text-lg line-through text-gray-400">
                            {formatCurrency(policy.originalPremium)}
                          </p>
                        </div>
                        <div className="text-2xl font-bold text-blue-600">→</div>
                        <div>
                          <p className="text-xs text-gray-500">Adjusted Offer</p>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(policy.adjustedPremium)}
                          </p>
                        </div>
                      </div>
                      <p className={`text-sm mt-2 font-medium ${
                        policy.originalPremium > policy.adjustedPremium 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                      }`}>
                        {getSavingsAmount(policy.originalPremium, policy.adjustedPremium)}
                      </p>
                    </div>
                    
                    {/* Underwriter Message */}
                    {policy.underwriterNotes && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Message from Underwriter
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{policy.underwriterNotes}</p>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Offer sent: {new Date(policy.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setSelectedPolicy(policy)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Review Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Decision Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedPolicy(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="border-b p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Review Offer: {selectedPolicy.policyNumber}</h3>
              <button onClick={() => setSelectedPolicy(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Premium Comparison */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-500">Your Request</p>
                    <p className="text-xl font-semibold">{formatCurrency(selectedPolicy.originalPremium)}</p>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">→</div>
                  <div className="text-center flex-1">
                    <p className="text-sm text-gray-500">Underwriter Offer</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(selectedPolicy.adjustedPremium)}</p>
                  </div>
                </div>
              </div>

              {/* Underwriter Message */}
              {selectedPolicy.underwriterNotes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Underwriter's Message
                  </p>
                  <p className="text-gray-700 mt-2">{selectedPolicy.underwriterNotes}</p>
                </div>
              )}

              {/* Decision Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700">Additional Notes (Optional)</label>
                <Textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder="Add any comments or questions for the underwriter..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Warning for higher premium */}
              {selectedPolicy.adjustedPremium > selectedPolicy.originalPremium && (
                <div className="bg-yellow-50 p-3 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    The underwriter has proposed a higher premium than you requested. 
                    Please review carefully before accepting.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={() => handleDecision('ACCEPT')} 
                  disabled={submitting}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Accept Offer
                </Button>
                <Button 
                  onClick={() => handleDecision('REJECT')} 
                  disabled={submitting}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject Offer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}