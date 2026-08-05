import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2,
  Search, Eye, ClipboardList, DollarSign, User, Shield, Car,
  Heart, Flame, Plane, BarChart3, Ban, Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Textarea } from '../../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../lib/utils';
import PaymentReferenceGenerator from '../../components/PaymentReferenceGenerator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  coverageAmount: number;
  premium: number;
  adjustedPremium?: number;
  totalPremium?: number;
  effectiveDate: string;
  expirationDate: string;
  premiumFrequency: string;
  productDetails: any;
  underwriterNotes?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  productName?: string;
  selectedPerils?: any[];
  selectedRiders?: any[];
}

interface DashboardStats {
  pendingReviews: number;
  pendingFinalApprovals: number;
  pendingEndorsements: number;
  policiesThisMonth: number;
  totalActivePolicies: number;
  rejectedPolicies: number;
  approvalRate: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; color: string }> = {
    PENDING_UNDERWRITING: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-800' },
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-orange-100 text-orange-800' },
    PAYMENT_RECEIVED: { label: 'Payment Received', color: 'bg-emerald-100 text-emerald-800' },
    PENDING_FINAL_APPROVAL: { label: 'Pending Activation', color: 'bg-purple-100 text-purple-800' },
    AWAITING_CUSTOMER_APPROVAL: { label: 'Awaiting Customer', color: 'bg-cyan-100 text-cyan-800' },
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    REJECTED_BY_CUSTOMER: { label: 'Rejected by Customer', color: 'bg-red-100 text-red-800' },
  };
  return badges[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
};

const PRODUCT_ICONS: Record<string, any> = {
  MOTOR: Car, HEALTH: Heart, FIRE: Flame, TRAVEL: Plane, LIFE: User, default: Shield,
};

const getRoleDisplayName = (role: string): string => {
  const map: Record<string, string> = {
    UNDERWRITING_OFFICER_I: 'Underwriting Officer I',
    UNDERWRITING_OFFICER_II: 'Underwriting Officer II',
    SENIOR_UNDERWRITING_OFFICER: 'Senior Underwriting Officer',
    SUPERVISOR_UNDERWRITING: 'Supervisor Underwriting',
    MANAGER_UNDERWRITING: 'Underwriting Manager',
    HEAD_UNDERWRITING: 'Head of Underwriting',
    UNDERWRITING_ADMIN: 'Underwriting Admin',
    MASTER_ADMIN: 'Master Admin',
  };
  return map[role] || role || 'Underwriting Staff';
};

const usePermissions = (userRole: string) => {
  return useMemo(() => {
    const isOfficer = ['UNDERWRITING_OFFICER_I', 'UNDERWRITING_OFFICER_II', 'SENIOR_UNDERWRITING_OFFICER'].includes(userRole);
    const isSupervisor = userRole === 'SUPERVISOR_UNDERWRITING';
    const isManager = userRole === 'MANAGER_UNDERWRITING';
    const isHead = userRole === 'HEAD_UNDERWRITING';
    const isAdmin = userRole === 'UNDERWRITING_ADMIN' || userRole === 'MASTER_ADMIN';

    return {
      isOfficer, isSupervisor, isManager, isHead, isAdmin,
      canReview: true,
      canApprove: isSupervisor || isManager || isHead || isAdmin,
      canGeneratePayment: isSupervisor || isManager || isHead || isAdmin,
      canFinalApprove: isSupervisor || isManager || isHead || isAdmin,
      canReject: isSupervisor || isManager || isHead || isAdmin,
      canViewAll: isManager || isHead || isAdmin,
      roleDisplayName: getRoleDisplayName(userRole),
    };
  }, [userRole]);
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function UnifiedUnderwritingDashboard() {
  const { user } = useAuthStore();
  const userRole = user?.role?.toUpperCase() || '';
  const permissions = usePermissions(userRole);

  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stats, setStats] = useState<DashboardStats>({
    pendingReviews: 0, pendingFinalApprovals: 0, pendingEndorsements: 0,
    policiesThisMonth: 0, totalActivePolicies: 0, rejectedPolicies: 0, approvalRate: 0,
  });
  const [policies, setPolicies] = useState<Policy[]>([]);

  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDetails, setPolicyDetails] = useState<Policy | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [reviewData, setReviewData] = useState({
    adjustedPremium: '',
    notes: '',
    actionType: 'review' as 'review' | 'reject' | 'approve' | 'final_approve',
  });
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch
  // --------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policiesRes, statsRes] = await Promise.all([
        axiosInstance.get('/underwriting/pending-review'),
        axiosInstance.get('/underwriting/stats'),
      ]);
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);
      setStats(statsRes.data || {
        pendingReviews: 0, pendingFinalApprovals: 0, pendingEndorsements: 0,
        policiesThisMonth: 0, totalActivePolicies: 0, rejectedPolicies: 0, approvalRate: 0,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // --------------------------------------------------------------------------
  // Detail
  // --------------------------------------------------------------------------
  const fetchPolicyDetails = async (policyId: string) => {
    setLoadingDetails(true);
    try {
      const res = await axiosInstance.get(`/underwriting/policies/${policyId}`);
      setPolicyDetails(res.data);
    } catch {
      toast.error('Failed to load policy details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewPolicy = async (policy: Policy) => {
    setSelectedPolicy(policy);
    await fetchPolicyDetails(policy.id);
    setIsDetailsModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------
  const openReviewModal = (policy: Policy, actionType: 'review' | 'reject' | 'approve' | 'final_approve') => {
    setSelectedPolicy(policy);
    setReviewData({
      adjustedPremium: policy.premium?.toString() || '',
      notes: '',
      actionType,
    });
    setIsReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedPolicy) return;
    setSubmitting(true);
    try {
      let endpoint = '';
      const payload: any = { notes: reviewData.notes };

      switch (reviewData.actionType) {
        case 'review':
          endpoint = `/underwriting/policies/${selectedPolicy.id}/adjust`;
          payload.adjusted_premium = parseFloat(reviewData.adjustedPremium) || selectedPolicy.premium;
          payload.underwriter_notes = reviewData.notes;
          break;
        case 'approve':
          endpoint = `/underwriting/policies/${selectedPolicy.id}/direct-approve`;
          payload.comments = reviewData.notes;
          break;
        case 'reject':
          endpoint = `/underwriting/policies/${selectedPolicy.id}/reject`;
          payload.reason = reviewData.notes;
          break;
        case 'final_approve':
          endpoint = `/underwriting/policies/${selectedPolicy.id}/final-approve`;
          break;
      }

      await axiosInstance.post(endpoint, payload);
      toast.success(`${reviewData.actionType.replace('_', ' ')} completed`);
      setIsReviewModalOpen(false);
      setSelectedPolicy(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGeneratePaymentRef = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsPaymentDialogOpen(true);
  };

  // --------------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------------
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch =
      policy.policyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (policy.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  const renderStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Pending Review', value: policies.filter(p => p.status === 'PENDING_UNDERWRITING').length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Approved', value: policies.filter(p => p.status === 'APPROVED').length, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Pending Payment', value: policies.filter(p => p.status === 'PENDING_PAYMENT').length, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Active', value: stats.totalActivePolicies, icon: Shield, color: 'text-green-600', bg: 'bg-green-100' },
      ].map((card, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-xs text-gray-500">{card.label}</p><p className="text-2xl font-bold">{card.value}</p></div>
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPolicyList = (policyList: Policy[]) => {
    if (!policyList?.length) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No policies found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {policyList.map((policy) => {
          const status = getStatusBadge(policy.status);
          const ProductIcon = PRODUCT_ICONS[policy.type] || PRODUCT_ICONS.default;
          return (
            <Card key={policy.id} className="hover:shadow-lg transition-all duration-200 border-l-4"
              style={{ borderLeftColor: status.color.includes('yellow') ? '#eab308' : status.color.includes('blue') ? '#3b82f6' : status.color.includes('orange') ? '#f97316' : status.color.includes('emerald') ? '#10b981' : status.color.includes('green') ? '#22c55e' : status.color.includes('red') ? '#ef4444' : '#6b7280' }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProductIcon className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div><p className="text-gray-500">Customer</p><p className="font-medium">{policy.customerName || 'N/A'}</p></div>
                      <div><p className="text-gray-500">Coverage</p><p className="font-medium text-blue-600">{formatCurrency(policy.coverageAmount)}</p></div>
                      <div><p className="text-gray-500">Premium</p><p className="font-medium">ETB {policy.premium?.toLocaleString()}</p></div>
                    </div>
                    {policy.paymentReference && <p className="text-xs text-orange-600 font-medium">Ref: {policy.paymentReference}</p>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewPolicy(policy)}><Eye className="h-4 w-4 mr-1" /> View</Button>
                    {permissions.canReview && policy.status === 'PENDING_UNDERWRITING' && (
                      <Button variant="outline" size="sm" onClick={() => openReviewModal(policy, 'review')}><ClipboardList className="h-4 w-4 mr-1" /> Review</Button>
                    )}
                    {permissions.canApprove && policy.status === 'PENDING_UNDERWRITING' && (
                      <Button variant="default" size="sm" className="bg-blue-600" onClick={() => openReviewModal(policy, 'approve')}><CheckCircle className="h-4 w-4 mr-1" /> Approve</Button>
                    )}
                    {permissions.canGeneratePayment && policy.status === 'APPROVED' && !policy.paymentReference && (
                      <Button variant="default" size="sm" className="bg-orange-600" onClick={() => handleGeneratePaymentRef(policy)}><DollarSign className="h-4 w-4 mr-1" /> Payment Ref</Button>
                    )}
                    {permissions.canFinalApprove && policy.status === 'PAYMENT_RECEIVED' && (
                      <Button variant="default" size="sm" className="bg-green-600" onClick={() => openReviewModal(policy, 'final_approve')}><CheckCircle className="h-4 w-4 mr-1" /> Activate</Button>
                    )}
                    {permissions.canReject && ['PENDING_UNDERWRITING', 'APPROVED'].includes(policy.status) && (
                      <Button variant="outline" size="sm" className="text-red-600" onClick={() => openReviewModal(policy, 'reject')}><Ban className="h-4 w-4 mr-1" /> Reject</Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Loading / Error
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading underwriting dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="h-4 w-4 mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-gray-500">Review and process policy applications</p>
            <Badge className="bg-blue-100 text-blue-800">{permissions.roleDisplayName}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {renderStatsCards()}

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search policies..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING_UNDERWRITING">Pending Review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
            <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Pending ({policies.filter(p => p.status === 'PENDING_UNDERWRITING').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({policies.filter(p => p.status === 'APPROVED').length})</TabsTrigger>
          <TabsTrigger value="payment">Payment ({policies.filter(p => ['PENDING_PAYMENT', 'PAYMENT_RECEIVED'].includes(p.status)).length})</TabsTrigger>
          <TabsTrigger value="all">All ({filteredPolicies.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">{renderPolicyList(filteredPolicies.filter(p => p.status === 'PENDING_UNDERWRITING'))}</TabsContent>
        <TabsContent value="approved">{renderPolicyList(filteredPolicies.filter(p => p.status === 'APPROVED'))}</TabsContent>
        <TabsContent value="payment">{renderPolicyList(filteredPolicies.filter(p => ['PENDING_PAYMENT', 'PAYMENT_RECEIVED'].includes(p.status)))}</TabsContent>
        <TabsContent value="all">{renderPolicyList(filteredPolicies)}</TabsContent>
      </Tabs>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewData.actionType === 'approve' ? 'Approve Policy' : reviewData.actionType === 'reject' ? 'Reject Policy' : reviewData.actionType === 'final_approve' ? 'Activate Policy' : 'Review Policy'}: {selectedPolicy?.policyNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedPolicy && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Customer</p><p className="font-medium">{selectedPolicy.customerName}</p></div>
                  <div><p className="text-gray-500">Coverage</p><p className="font-medium">{formatCurrency(selectedPolicy.coverageAmount)}</p></div>
                  <div><p className="text-gray-500">Premium</p><p className="font-medium">ETB {selectedPolicy.premium?.toLocaleString()}</p></div>
                  <div><p className="text-gray-500">Status</p><Badge className={getStatusBadge(selectedPolicy.status).color}>{getStatusBadge(selectedPolicy.status).label}</Badge></div>
                </div>
              </div>
              {reviewData.actionType === 'review' && (
                <div>
                  <Label>Adjusted Premium (ETB)</Label>
                  <Input type="number" value={reviewData.adjustedPremium} onChange={(e) => setReviewData({ ...reviewData, adjustedPremium: e.target.value })} />
                </div>
              )}
              <div>
                <Label>{reviewData.actionType === 'reject' ? 'Rejection Reason' : 'Notes'}</Label>
                <Textarea value={reviewData.notes} onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmitReview} disabled={submitting} className="flex-1 bg-blue-600">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Submit
                </Button>
                <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rich Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Policy Details: {selectedPolicy?.policyNumber}</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
          ) : policyDetails ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                {(() => { const s = getStatusBadge(policyDetails.status); return <Badge className={s.color}>{s.label}</Badge>; })()}
                <span className="text-sm text-gray-500">Created: {formatDate(policyDetails.createdAt)}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Policy Number</p><p className="font-medium text-lg">{policyDetails.policyNumber}</p></div>
                <div><p className="text-xs text-gray-500">Product</p><p className="font-medium">{policyDetails.productName || policyDetails.type}</p></div>
                <div><p className="text-xs text-gray-500">Coverage</p><p className="font-medium text-blue-600 text-lg">{formatCurrency(policyDetails.coverageAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Premium</p><p className="font-medium">ETB {Number(policyDetails.premium || 0).toLocaleString()}</p></div>
                <div><p className="text-xs text-gray-500">Frequency</p><p className="font-medium">{policyDetails.premiumFrequency || 'ANNUALLY'}</p></div>
                <div><p className="text-xs text-gray-500">Effective</p><p className="font-medium">{formatDate(policyDetails.effectiveDate)}</p></div>
                <div><p className="text-xs text-gray-500">Expiration</p><p className="font-medium">{formatDate(policyDetails.expirationDate)}</p></div>
                <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{policyDetails.customerName || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Email</p><p className="font-medium">{policyDetails.customerEmail || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Phone</p><p className="font-medium">{policyDetails.customerPhone || 'N/A'}</p></div>
                {policyDetails.adjustedPremium && <div><p className="text-xs text-gray-500">Adjusted Premium</p><p className="font-medium text-orange-600">ETB {Number(policyDetails.adjustedPremium).toLocaleString()}</p></div>}
                {policyDetails.paymentReference && <div><p className="text-xs text-gray-500">Payment Ref</p><p className="font-medium text-orange-600">{policyDetails.paymentReference}</p></div>}
              </div>
              {policyDetails.underwriterNotes && (
                <div><h3 className="text-lg font-semibold mb-2">Underwriter Notes</h3><div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm">{policyDetails.underwriterNotes}</p></div></div>
              )}
              <div className="flex gap-3 pt-4 border-t justify-end">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
                {permissions.canReview && policyDetails.status === 'PENDING_UNDERWRITING' && (
                  <Button className="bg-blue-600" onClick={() => { setIsDetailsModalOpen(false); setTimeout(() => openReviewModal(policyDetails, 'review'), 100); }}><ClipboardList className="h-4 w-4 mr-2" /> Review</Button>
                )}
                {permissions.canApprove && policyDetails.status === 'PENDING_UNDERWRITING' && (
                  <Button className="bg-blue-600" onClick={() => { setIsDetailsModalOpen(false); setTimeout(() => openReviewModal(policyDetails, 'approve'), 100); }}><CheckCircle className="h-4 w-4 mr-2" /> Approve</Button>
                )}
                {permissions.canGeneratePayment && policyDetails.status === 'APPROVED' && !policyDetails.paymentReference && (
                  <Button className="bg-orange-600" onClick={() => { setIsDetailsModalOpen(false); setTimeout(() => handleGeneratePaymentRef(policyDetails), 100); }}><DollarSign className="h-4 w-4 mr-2" /> Payment Ref</Button>
                )}
                {permissions.canFinalApprove && policyDetails.status === 'PAYMENT_RECEIVED' && (
                  <Button className="bg-green-600" onClick={() => { setIsDetailsModalOpen(false); setTimeout(() => openReviewModal(policyDetails, 'final_approve'), 100); }}><CheckCircle className="h-4 w-4 mr-2" /> Activate</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12"><p className="text-gray-500">No policy details found</p></div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Reference Generator */}
      {selectedPolicy && (
        <PaymentReferenceGenerator
          policyId={selectedPolicy.id}
          policyNumber={selectedPolicy.policyNumber}
          coverageAmount={selectedPolicy.coverageAmount || 0}
          customerName={selectedPolicy.customerName}
          customerPhone={selectedPolicy.customerPhone}
          customerEmail={selectedPolicy.customerEmail}
          open={isPaymentDialogOpen}
          onClose={() => { setIsPaymentDialogOpen(false); setSelectedPolicy(null); fetchDashboardData(); }}
        />
      )}
    </div>
  );
}