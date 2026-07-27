import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2,
  Search, Eye, ClipboardList, Activity, DollarSign, User, Shield, Car,
  Heart, Flame, Plane, Users, BarChart3, Download, Ban, Send, ArrowLeft,
  Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Textarea } from '../../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { ScrollArea } from '../../components/ui/Scroll-area';
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
  userId: string;
  productId: string;
  type: string;
  productName: string;
  status: string;
  coverageAmount: number;
  termMonths: number;
  effectiveDate: string;
  expirationDate: string;
  premium: number;
  premiumFrequency: string;
  productDetails: any;
  selectedPerils: any[];
  selectedRiders: any[];
  submittedDate: string;
  reviewedBy?: string;
  reviewedAt?: string;
  underwriterNotes?: string;
  paymentReference?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  policyHolderName?: string;
}

interface DashboardStats {
  total: number;
  submitted: number;
  underReview: number;
  reviewed: number;
  pendingPayment: number;
  paymentReceived: number;
  active: number;
  rejected: number;
  avgProcessingDays: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
    REVIEWED: { label: 'Reviewed', color: 'bg-cyan-100 text-cyan-800' },
    PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-orange-100 text-orange-800' },
    PAYMENT_RECEIVED: { label: 'Payment Received', color: 'bg-emerald-100 text-emerald-800' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    REQUIRES_MODIFICATION: { label: 'Requires Modification', color: 'bg-purple-100 text-purple-800' },
  };
  return badges[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
};

const PRODUCT_ICONS: Record<string, any> = {
  MOTOR: Car,
  HEALTH: Heart,
  FIRE: Flame,
  TRAVEL: Plane,
  LIFE: User,
  default: Shield,
};

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
const usePermissions = (userRole: string) => {
  return useMemo(() => {
    const isUnderwriter = ['UNDERWRITER_I', 'UNDERWRITER_II', 'SENIOR_UNDERWRITER'].includes(userRole);
    const isSupervisor = userRole === 'SUPERVISOR_UNDERWRITING';
    const isManager = userRole === 'UNDERWRITING_MANAGER';
    const isHead = userRole === 'HEAD_UNDERWRITING';
    const isAdmin = userRole === 'UNDERWRITING_ADMIN' || userRole === 'MASTER_ADMIN';

    return {
      isUnderwriter,
      isSupervisor,
      isManager,
      isHead,
      isAdmin,
      canReview: isUnderwriter || isSupervisor || isManager || isHead || isAdmin,
      canAdjustPremium: isUnderwriter || isSupervisor || isManager || isHead || isAdmin,
      canApproveForPayment: isUnderwriter || isSupervisor || isManager || isHead || isAdmin,
      canGeneratePayment: isSupervisor || isManager || isHead || isAdmin,
      canFinalApprove: isSupervisor || isManager || isHead || isAdmin,
      canReject: isSupervisor || isManager || isHead || isAdmin,
      canViewTeamPerformance: isManager || isHead || isAdmin,
      roleDisplayName: getRoleDisplayName(userRole),
    };
  }, [userRole]);
};

const getRoleDisplayName = (role: string): string => {
  const map: Record<string, string> = {
    UNDERWRITER_I: 'Underwriter I',
    UNDERWRITER_II: 'Underwriter II',
    SENIOR_UNDERWRITER: 'Senior Underwriter',
    SUPERVISOR_UNDERWRITING: 'Supervisor Underwriting',
    UNDERWRITING_MANAGER: 'Underwriting Manager',
    HEAD_UNDERWRITING: 'Head of Underwriting',
    UNDERWRITING_ADMIN: 'Underwriting Admin',
    MASTER_ADMIN: 'Master Admin',
  };
  return map[role] || role || 'Underwriting Staff';
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function UnifiedUnderwritingDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userRole = user?.role?.toUpperCase() || '';
  const permissions = usePermissions(userRole);

  // State
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stats, setStats] = useState<DashboardStats>({
    total: 0, submitted: 0, underReview: 0, reviewed: 0,
    pendingPayment: 0, paymentReceived: 0, active: 0, rejected: 0,
    avgProcessingDays: 0,
  });
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  // Modal states
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDetails, setPolicyDetails] = useState<Policy | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  // Review form
  const [reviewData, setReviewData] = useState({
    decision: 'APPROVE_FOR_PAYMENT',
    adjustedPremium: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch dashboard data
  // --------------------------------------------------------------------------
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch policies based on role
      let endpoint = '/policies';
      if (permissions.isUnderwriter) {
        endpoint = '/policies/queue'; // SUBMITTED policies
      } else if (permissions.canGeneratePayment) {
        endpoint = '/policies/reviewed'; // REVIEWED policies
      }

      const [policiesRes, statsRes] = await Promise.all([
        axiosInstance.get(endpoint),
        axiosInstance.get('/policies/stats'),
      ]);

      const policiesData = Array.isArray(policiesRes.data)
        ? policiesRes.data
        : (policiesRes.data?.policies || policiesRes.data?.data || []);

      setPolicies(policiesData.map((p: any) => ({
        ...p,
        customerName: p.customerName || p.policyHolderName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown',
      })));

      const s = statsRes.data || {};
      setStats({
        total: s.total || 0,
        submitted: s.submitted || 0,
        underReview: s.underReview || 0,
        reviewed: s.reviewed || 0,
        pendingPayment: s.pendingPayment || 0,
        paymentReceived: s.paymentReceived || 0,
        active: s.active || 0,
        rejected: s.rejected || 0,
        avgProcessingDays: s.avgProcessingDays || 0,
      });

      // Team performance
      if (permissions.canViewTeamPerformance) {
        try {
          const teamRes = await axiosInstance.get('/policies/team-performance');
          setTeamMembers(teamRes.data || []);
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [permissions]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // --------------------------------------------------------------------------
  // Policy detail
  // --------------------------------------------------------------------------
  const fetchPolicyDetails = async (policyId: string) => {
    setLoadingDetails(true);
    try {
      const res = await axiosInstance.get(`/policies/${policyId}`);
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

  const handleReviewPolicy = (policy: Policy) => {
    setSelectedPolicy(policy);
    setReviewData({
      decision: 'APPROVE_FOR_PAYMENT',
      adjustedPremium: policy.premium?.toString() || policy.coverageAmount?.toString() || '',
      notes: '',
    });
    setIsReviewModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // Submit review
  // --------------------------------------------------------------------------
  const handleSubmitReview = async () => {
    if (!selectedPolicy) return;

    setSubmitting(true);
    try {
      await axiosInstance.post(`/policies/${selectedPolicy.id}/review`, {
        decision: reviewData.decision,
        adjustedPremium: reviewData.adjustedPremium ? parseFloat(reviewData.adjustedPremium) : null,
        notes: reviewData.notes,
      });

      toast.success('Review submitted successfully');
      setIsReviewModalOpen(false);
      setSelectedPolicy(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Reject policy
  // --------------------------------------------------------------------------
  const handleRejectPolicy = async () => {
    if (!selectedPolicy) return;
    if (!reviewData.notes.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setSubmitting(true);
    try {
      await axiosInstance.post(`/policies/${selectedPolicy.id}/review`, {
        decision: 'REJECT',
        notes: reviewData.notes,
      });

      toast.success('Policy rejected');
      setIsReviewModalOpen(false);
      setSelectedPolicy(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject policy');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Final approve (after payment received)
  // --------------------------------------------------------------------------
  const handleFinalApprove = async () => {
    if (!selectedPolicy) return;

    setSubmitting(true);
    try {
      await axiosInstance.post(`/policies/${selectedPolicy.id}/final-approve`, {
        notes: reviewData.notes,
      });

      toast.success('Policy activated successfully');
      setIsReviewModalOpen(false);
      setSelectedPolicy(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to activate policy');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------------
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch =
      policy.policyNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || policy.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------
  const renderStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      {[
        { label: 'Submitted', value: stats.submitted, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Under Review', value: stats.underReview, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Reviewed', value: stats.reviewed, icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100' },
        { label: 'Pending Payment', value: stats.pendingPayment, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-100' },
        { label: 'Payment Received', value: stats.paymentReceived, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
        { label: 'Active', value: stats.active, icon: Shield, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
        { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-gray-600', bg: 'bg-gray-100' },
      ].map((card, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
              <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderPolicyList = (policyList: Policy[]) => {
    if (!policyList || policyList.length === 0) {
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
              style={{
                borderLeftColor: status.color.includes('yellow') ? '#eab308' :
                  status.color.includes('blue') ? '#3b82f6' :
                  status.color.includes('cyan') ? '#06b6d4' :
                  status.color.includes('orange') ? '#f97316' :
                  status.color.includes('emerald') ? '#10b981' :
                  status.color.includes('green') ? '#22c55e' :
                  status.color.includes('red') ? '#ef4444' : '#6b7280',
              }}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ProductIcon className="h-4 w-4 text-blue-600" />
                      <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                      <Badge className={status.color}>{status.label}</Badge>
                      <Badge variant="outline" className="text-xs">{policy.type}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div><p className="text-gray-500">Customer</p><p className="font-medium">{policy.customerName}</p></div>
                      <div><p className="text-gray-500">Coverage</p><p className="font-medium text-blue-600">{formatCurrency(policy.coverageAmount)}</p></div>
                      <div><p className="text-gray-500">Submitted</p><p className="font-medium">{formatDate(policy.submittedDate)}</p></div>
                    </div>
                    {policy.premium && (
                      <p className="text-xs text-gray-500">Premium: ETB {policy.premium?.toLocaleString()}</p>
                    )}
                    {policy.paymentReference && (
                      <p className="text-xs text-orange-600">Payment Ref: {policy.paymentReference}</p>
                    )}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewPolicy(policy)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>

                    {/* Review button for underwriters */}
                    {permissions.canReview && ['SUBMITTED', 'UNDER_REVIEW'].includes(policy.status) && (
                      <Button variant="outline" size="sm" onClick={() => handleReviewPolicy(policy)}>
                        <ClipboardList className="h-4 w-4 mr-1" /> Review
                      </Button>
                    )}

                    {/* Generate Payment Reference for supervisors/managers */}
                    {permissions.canGeneratePayment && policy.status === 'REVIEWED' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setIsPaymentDialogOpen(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Generate Payment Ref
                      </Button>
                    )}

                    {/* Final Approve for PAYMENT_RECEIVED policies */}
                    {permissions.canFinalApprove && policy.status === 'PAYMENT_RECEIVED' && (
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setSelectedPolicy(policy);
                          setReviewData({ decision: 'FINAL_APPROVE', adjustedPremium: '', notes: '' });
                          setIsReviewModalOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Final Approve
                      </Button>
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
  // MAIN RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-gray-500">Review and process policy applications</p>
            <Badge className="bg-blue-100 text-blue-800">{permissions.roleDisplayName}</Badge>
            {permissions.canGeneratePayment && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <DollarSign className="h-3 w-3" /> Can Generate Payment
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {renderStatsCards()}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
            <SelectItem value="REVIEWED">Reviewed</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pending Payment</SelectItem>
            <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Queue ({policies.filter(p => ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)).length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reviewed ({policies.filter(p => p.status === 'REVIEWED').length})
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            All ({filteredPolicies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {renderPolicyList(filteredPolicies.filter(p => ['SUBMITTED', 'UNDER_REVIEW'].includes(p.status)))}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {renderPolicyList(filteredPolicies.filter(p => p.status === 'REVIEWED'))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {renderPolicyList(filteredPolicies)}
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* REVIEW MODAL */}
      {/* ================================================================ */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewData.decision === 'FINAL_APPROVE'
                ? 'Final Approval'
                : `Review Policy: ${selectedPolicy?.policyNumber}`}
            </DialogTitle>
            <DialogDescription>
              {reviewData.decision === 'FINAL_APPROVE'
                ? 'Confirm payment has been received and activate this policy'
                : 'Review the policy application and adjust premium if needed'}
            </DialogDescription>
          </DialogHeader>

          {selectedPolicy && reviewData.decision !== 'FINAL_APPROVE' && (
            <div className="space-y-4">
              {/* Policy Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Policy Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500">Customer</p><p className="font-medium">{selectedPolicy.customerName}</p></div>
                  <div><p className="text-gray-500">Product</p><p className="font-medium">{selectedPolicy.productName || selectedPolicy.type}</p></div>
                  <div><p className="text-gray-500">Coverage</p><p className="font-medium">{formatCurrency(selectedPolicy.coverageAmount)}</p></div>
                  <div><p className="text-gray-500">Term</p><p className="font-medium">{selectedPolicy.termMonths} months</p></div>
                </div>
              </div>

              {/* Decision */}
              <div>
                <Label>Decision</Label>
                <Select value={reviewData.decision} onValueChange={(val) => setReviewData({ ...reviewData, decision: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVE_FOR_PAYMENT">Approve for Payment</SelectItem>
                    <SelectItem value="REQUIRES_MODIFICATION">Request Modification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Adjusted Premium */}
              <div>
                <Label>Adjusted Premium (ETB)</Label>
                <Input
                  type="number"
                  value={reviewData.adjustedPremium}
                  onChange={(e) => setReviewData({ ...reviewData, adjustedPremium: e.target.value })}
                  placeholder="Leave empty to use original premium"
                />
              </div>

              {/* Notes */}
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                  placeholder="Add review notes..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmitReview} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit Review
                </Button>
                <Button variant="outline" className="flex-1 text-red-600" onClick={handleRejectPolicy} disabled={submitting}>
                  <Ban className="h-4 w-4 mr-2" /> Reject
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsReviewModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {selectedPolicy && reviewData.decision === 'FINAL_APPROVE' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="font-medium text-emerald-800">Confirm Final Approval</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Payment has been received for this policy. Activating will make it ACTIVE.
                </p>
              </div>
              <div>
                <Label>Approval Notes</Label>
                <Textarea
                  value={reviewData.notes}
                  onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })}
                  placeholder="Add final approval notes..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleFinalApprove} disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Confirm & Activate
                </Button>
                <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* DETAILS MODAL */}
      {/* ================================================================ */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Policy Details: {selectedPolicy?.policyNumber}</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : policyDetails ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => { const s = getStatusBadge(policyDetails.status); return <Badge className={s.color}>{s.label}</Badge>; })()}
                <span className="text-sm text-gray-500">Submitted: {formatDate(policyDetails.submittedDate)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Policy Number</p><p className="font-medium">{policyDetails.policyNumber}</p></div>
                <div><p className="text-xs text-gray-500">Product</p><p className="font-medium">{policyDetails.productName || policyDetails.type}</p></div>
                <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{policyDetails.customerName}</p></div>
                <div><p className="text-xs text-gray-500">Coverage</p><p className="font-medium">{formatCurrency(policyDetails.coverageAmount)}</p></div>
                <div><p className="text-xs text-gray-500">Premium</p><p className="font-medium">{formatCurrency(policyDetails.premium || 0)}</p></div>
                <div><p className="text-xs text-gray-500">Term</p><p className="font-medium">{policyDetails.termMonths} months</p></div>
                {policyDetails.paymentReference && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Payment Reference</p>
                    <p className="font-medium text-orange-600">{policyDetails.paymentReference}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No policy details found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================================================================ */}
      {/* PAYMENT REFERENCE GENERATOR DIALOG */}
      {/* ================================================================ */}
      {selectedPolicy && (
        <PaymentReferenceGenerator
          policyId={selectedPolicy.id}
          policyNumber={selectedPolicy.policyNumber}
          coverageAmount={selectedPolicy.coverageAmount || 0}
          customerName={selectedPolicy.customerName}
          customerPhone={selectedPolicy.customerPhone}
          customerEmail={selectedPolicy.customerEmail}
          open={isPaymentDialogOpen}
          onClose={() => {
            setIsPaymentDialogOpen(false);
            setSelectedPolicy(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
}