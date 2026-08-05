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
  submittedDate?: string;
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
    SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
    PENDING_UNDERWRITING: { label: 'Pending Underwriting', color: 'bg-yellow-100 text-yellow-800' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
    AWAITING_CUSTOMER_APPROVAL: { label: 'Awaiting Customer', color: 'bg-orange-100 text-orange-800' },
    PENDING_FINAL_APPROVAL: { label: 'Pending Final Approval', color: 'bg-purple-100 text-purple-800' },
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
      canAdjustPremium: isOfficer || isSupervisor || isManager || isHead || isAdmin,
      canFinalApprove: isSupervisor || isManager || isHead || isAdmin,
      canReject: isSupervisor || isManager || isHead || isAdmin,
      canDirectApprove: isSupervisor || isManager || isHead || isAdmin,
      canViewAll: isManager || isHead || isAdmin,
      roleDisplayName: getRoleDisplayName(userRole),
    };
  }, [userRole]);
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function UnifiedUnderwritingDashboard() {
  const navigate = useNavigate();
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
    decision: 'APPROVE',
    adjustedPremium: '',
    notes: '',
    actionType: 'review' as 'review' | 'reject' | 'final_approve' | 'adjust' | 'direct_approve',
  });
  const [submitting, setSubmitting] = useState(false);

  // --------------------------------------------------------------------------
  // Fetch dashboard data
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
  // Policy detail
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
  // Review handlers
  // --------------------------------------------------------------------------
  const openReviewModal = (policy: Policy, actionType: 'review' | 'reject' | 'final_approve' | 'adjust' | 'direct_approve') => {
    setSelectedPolicy(policy);
    setReviewData({
      decision: actionType === 'reject' ? 'REJECT' : 'APPROVE',
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
      const endpoint = `/underwriting/policies/${selectedPolicy.id}/${reviewData.actionType === 'direct_approve' ? 'direct-approve' : reviewData.actionType === 'reject' ? 'reject' : reviewData.actionType === 'final_approve' ? 'final-approve' : 'adjust'}`;
      const payload: any = { notes: reviewData.notes };
      if (reviewData.actionType === 'adjust') {
        payload.adjusted_premium = parseFloat(reviewData.adjustedPremium);
        payload.underwriter_notes = reviewData.notes;
      }

      await axiosInstance.post(endpoint, payload);
      toast.success(`${reviewData.actionType.replace('_', ' ')} completed successfully`);
      setIsReviewModalOpen(false);
      setSelectedPolicy(null);
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to process');
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[
        { label: 'Pending Reviews', value: stats.pendingReviews, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Pending Final', value: stats.pendingFinalApprovals, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
        { label: 'Active Policies', value: stats.totalActivePolicies, icon: Shield, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Rejected', value: stats.rejectedPolicies, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
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
              style={{ borderLeftColor: status.color.includes('yellow') ? '#eab308' : status.color.includes('blue') ? '#3b82f6' : status.color.includes('purple') ? '#8b5cf6' : status.color.includes('green') ? '#22c55e' : status.color.includes('red') ? '#ef4444' : '#6b7280' }}
            >
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
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => handleViewPolicy(policy)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {permissions.canReview && ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(policy.status) && (
                      <Button variant="outline" size="sm" onClick={() => openReviewModal(policy, 'adjust')}>
                        <ClipboardList className="h-4 w-4 mr-1" /> Review
                      </Button>
                    )}
                    {permissions.canDirectApprove && ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(policy.status) && (
                      <Button variant="default" size="sm" className="bg-green-600" onClick={() => openReviewModal(policy, 'direct_approve')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    {permissions.canFinalApprove && policy.status === 'PENDING_FINAL_APPROVAL' && (
                      <Button variant="default" size="sm" className="bg-blue-600" onClick={() => openReviewModal(policy, 'final_approve')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Final Approve
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
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="PENDING_UNDERWRITING">Pending Underwriting</SelectItem>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="PENDING_FINAL_APPROVAL">Pending Final Approval</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue ({policies.filter(p => ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(p.status)).length})</TabsTrigger>
          <TabsTrigger value="final">Final Approval ({policies.filter(p => p.status === 'PENDING_FINAL_APPROVAL').length})</TabsTrigger>
          <TabsTrigger value="all">All ({filteredPolicies.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="queue">{renderPolicyList(filteredPolicies.filter(p => ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(p.status)))}</TabsContent>
        <TabsContent value="final">{renderPolicyList(filteredPolicies.filter(p => p.status === 'PENDING_FINAL_APPROVAL'))}</TabsContent>
        <TabsContent value="all">{renderPolicyList(filteredPolicies)}</TabsContent>
      </Tabs>

      {/* Review Modal */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reviewData.actionType === 'direct_approve' ? 'Direct Approve' : reviewData.actionType === 'reject' ? 'Reject' : reviewData.actionType === 'final_approve' ? 'Final Approval' : 'Review Policy'}: {selectedPolicy?.policyNumber}</DialogTitle>
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
              {reviewData.actionType === 'adjust' && (
                <div>
                  <Label>Adjusted Premium (ETB)</Label>
                  <Input type="number" value={reviewData.adjustedPremium} onChange={(e) => setReviewData({ ...reviewData, adjustedPremium: e.target.value })} />
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={reviewData.notes} onChange={(e) => setReviewData({ ...reviewData, notes: e.target.value })} rows={3} />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmitReview} disabled={submitting} className="flex-1 bg-blue-600">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit
                </Button>
                <Button variant="outline" onClick={() => setIsReviewModalOpen(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

{/* ================================================================ */}
{/* RICH DETAILS MODAL */}
{/* ================================================================ */}
<Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Policy Details: {selectedPolicy?.policyNumber}
      </DialogTitle>
    </DialogHeader>

    {loadingDetails ? (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    ) : policyDetails ? (
      <div className="space-y-6">
        {/* Status + Dates */}
        <div className="flex items-center gap-3 flex-wrap">
          {(() => {
            const s = getStatusBadge(policyDetails.status);
            return <Badge className={s.color}>{s.label}</Badge>;
          })()}
          <span className="text-sm text-gray-500">
        Submitted: {formatDate(policyDetails.createdAt || policyDetails.submittedDate || new Date().toISOString())}
          </span>
          {policyDetails.updatedAt && (
            <span className="text-sm text-gray-500">
              | Last Updated: {formatDate(policyDetails.updatedAt)}
            </span>
          )}
        </div>

        {/* Policy Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Policy Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Policy Number</p>
              <p className="font-medium text-lg">{policyDetails.policyNumber}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Product Type</p>
              <p className="font-medium">{policyDetails.productName || policyDetails.type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              {(() => {
                const s = getStatusBadge(policyDetails.status);
                return <Badge className={s.color}>{s.label}</Badge>;
              })()}
            </div>
            <div>
              <p className="text-xs text-gray-500">Coverage Amount</p>
              <p className="font-medium text-blue-600 text-lg">
                {formatCurrency(policyDetails.coverageAmount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Premium</p>
              <p className="font-medium">
                ETB {Number(policyDetails.premium || 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Premium Frequency</p>
              <p className="font-medium">{policyDetails.premiumFrequency || 'ANNUALLY'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Effective Date</p>
              <p className="font-medium">{formatDate(policyDetails.effectiveDate)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Expiration Date</p>
              <p className="font-medium">{formatDate(policyDetails.expirationDate)}</p>
            </div>
            {policyDetails.adjustedPremium && (
              <div>
                <p className="text-xs text-gray-500">Adjusted Premium</p>
                <p className="font-medium text-orange-600">
                  ETB {Number(policyDetails.adjustedPremium).toLocaleString()}
                </p>
              </div>
            )}
            {policyDetails.totalPremium && (
              <div>
                <p className="text-xs text-gray-500">Total Premium</p>
                <p className="font-medium text-green-600">
                  ETB {Number(policyDetails.totalPremium).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Information */}
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Customer Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-xs text-gray-500">Full Name</p>
              <p className="font-medium">{policyDetails.customerName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-medium">{policyDetails.customerEmail || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="font-medium">{policyDetails.customerPhone || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Perils (if any) */}
        {policyDetails.selectedPerils && policyDetails.selectedPerils.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Covered Perils
            </h3>
            <div className="space-y-2">
              {policyDetails.selectedPerils.map((peril: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{peril.perilName || peril.name}</p>
                    {peril.description && <p className="text-xs text-gray-500">{peril.description}</p>}
                  </div>
                  <Badge variant="outline">
                    ETB {Number(peril.premium || 0).toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Riders (if any) */}
        {policyDetails.selectedRiders && policyDetails.selectedRiders.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Optional Riders
            </h3>
            <div className="space-y-2">
              {policyDetails.selectedRiders.map((rider: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{rider.riderName || rider.name}</p>
                    {rider.description && <p className="text-xs text-gray-500">{rider.description}</p>}
                  </div>
                  <Badge variant="outline">
                    ETB {Number(rider.premium || 0).toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicles (if any) */}
        {policyDetails.productDetails?.vehicles && policyDetails.productDetails.vehicles.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Car className="h-5 w-5 text-blue-600" />
              Vehicles
            </h3>
            <div className="space-y-3">
              {policyDetails.productDetails.vehicles.map((vehicle: any, idx: number) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Make</p>
                      <p className="font-medium">{vehicle.make || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Model</p>
                      <p className="font-medium">{vehicle.model || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Year</p>
                      <p className="font-medium">{vehicle.yearOfMake || vehicle.year || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Plate</p>
                      <p className="font-medium">{vehicle.plateNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="font-medium">{vehicle.vehicleType || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Usage</p>
                      <p className="font-medium">{vehicle.usage || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Value</p>
                      <p className="font-medium">ETB {Number(vehicle.vehicleValue || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Underwriter Notes */}
        {policyDetails.underwriterNotes && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-gray-600" />
              Underwriter Notes
            </h3>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-800">{policyDetails.underwriterNotes}</p>
            </div>
          </div>
        )}

        {/* Payment Reference */}
        {policyDetails.paymentReference && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Payment Reference
            </h3>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-lg font-bold text-orange-700">{policyDetails.paymentReference}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t justify-end">
          <Button variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
            Close
          </Button>
          {permissions.canReview && ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(policyDetails.status) && (
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setIsDetailsModalOpen(false);
                setTimeout(() => openReviewModal(policyDetails, 'adjust'), 100);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Review Policy
            </Button>
          )}
          {permissions.canDirectApprove && ['SUBMITTED', 'PENDING_UNDERWRITING'].includes(policyDetails.status) && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setIsDetailsModalOpen(false);
                setTimeout(() => openReviewModal(policyDetails, 'direct_approve'), 100);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Direct Approve
            </Button>
          )}
          {permissions.canFinalApprove && policyDetails.status === 'PENDING_FINAL_APPROVAL' && (
            <Button
              className="bg-purple-600 hover:bg-purple-700"
              onClick={() => {
                setIsDetailsModalOpen(false);
                setTimeout(() => openReviewModal(policyDetails, 'final_approve'), 100);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Final Approve
            </Button>
          )}
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
    </div>
  );
}