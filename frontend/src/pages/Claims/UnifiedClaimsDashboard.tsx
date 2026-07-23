import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2,
  Search, Eye, ClipboardList, Activity, DollarSign, User
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { ScrollArea } from '../../components/ui/Scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../lib/utils';

// ----------------------------------------------------------------------------
// Types (adjust to match your actual Claim model)
// ----------------------------------------------------------------------------
interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  userId: string;
  status: string;
  incidentDate: string;
  incidentDescription: string;
  location: string;
  estimatedAmount: number;
  approvedAmount?: number;
  natureOfLoss: string;
  submittedDate: string;
  createdAt: string;
  updatedAt: string;
  policyNumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  assignedOfficer?: string;
  assignedOfficerName?: string;
  officerRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  riskItem?: string;
  vehicleDetails?: any;
  timeline?: any[];
}

interface DashboardStats {
  total: number;
  pending: number;
  underReview: number;
  reviewed: number;
  approved: number;
  rejected: number;
  avgProcessingDays: number;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; color: string }> = {
    SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-800' },
    REVIEWED: { label: 'Reviewed', color: 'bg-cyan-100 text-cyan-800' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-800' },
  };
  return badges[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'SUBMITTED': return Clock;
    case 'UNDER_REVIEW': return AlertCircle;
    case 'REVIEWED': return FileText;
    case 'APPROVED': return CheckCircle;
    case 'REJECTED': return XCircle;
    case 'PAID': return DollarSign;
    default: return FileText;
  }
};

const getRoleDisplayName = (role: string): string => {
  const map: Record<string, string> = {
    'CLAIM_OFFICER': 'Claim Officer',
    'CLAIM_OFFICER_I': 'Claim Officer I',
    'CLAIM_OFFICER_II': 'Claim Officer II',
    'SENIOR_CLAIM_OFFICER': 'Senior Claim Officer',
    'SUPERVISOR_CLAIMS': 'Supervisor Claims',
    'MANAGER_CLAIMS': 'Claims Manager',
    'HEAD_CLAIMS': 'Head of Claims',
    'CLAIMS_ADMIN': 'Claims Administrator',
    'MASTER_ADMIN': 'Master Administrator'
  };
  return map[role] || role || 'Claims Officer';
};

// ----------------------------------------------------------------------------
// Permissions (memoized)
// ----------------------------------------------------------------------------
const useClaimsPermissions = (userRole: string) => {
  return useMemo(() => {
    const isReviewer = ['CLAIM_OFFICER', 'CLAIM_OFFICER_I', 'CLAIM_OFFICER_II', 'SENIOR_CLAIM_OFFICER'].includes(userRole);
    const isApprover = ['MANAGER_CLAIMS', 'SUPERVISOR_CLAIMS', 'HEAD_CLAIMS'].includes(userRole);
    const isAdmin = userRole === 'CLAIMS_ADMIN' || userRole === 'MASTER_ADMIN';
    return {
      isReviewer,
      isApprover,
      isAdmin,
      canReview: isReviewer && !isApprover,
      canApprove: isApprover || isAdmin,
      canViewAll: isApprover || isAdmin,
      roleDisplayName: getRoleDisplayName(userRole)
    };
  }, [userRole]);
};

// ----------------------------------------------------------------------------
// Debounce utility
// ----------------------------------------------------------------------------
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as unknown as T;
}

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------
export default function UnifiedClaimsDashboard() {
  const { user } = useAuthStore();
  const userRole = user?.role?.toUpperCase() || '';
  const permissions = useClaimsPermissions(userRole);

  // Dashboard state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, pending: 0, underReview: 0, reviewed: 0,
    approved: 0, rejected: 0, avgProcessingDays: 0
  });
  const [queueClaims, setQueueClaims] = useState<Claim[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Claim[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchClaim, setSelectedSearchClaim] = useState<Claim | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Queue filter
  const [queueSearchTerm, setQueueSearchTerm] = useState('');

  // Debounced search function (with internal min‑length guard)
  const debouncedSearch = useRef(
    debounce(async (query: string) => {
      if (query.length < 3) return; // safety net
      setSearching(true);
      try {
        const res = await axiosInstance.get('/claims/search', { params: { query } });
        setSearchResults(res.data || []);
        setShowSearchDropdown(true);
      } catch (err: any) {
        const msg = err.response?.data?.error || err.response?.data?.message || 'Search failed';
        toast.error(msg);
        setSearchResults([]);
        setShowSearchDropdown(false);
      } finally {
        setSearching(false);
      }
    }, 300)
  ).current;

  // ========================================================================
  // Data fetching
  // ========================================================================
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Stats
      const statsRes = await axiosInstance.get('/claims/stats/summary');
      const s = statsRes.data || {};
      setStats({
        total: s.total || 0,
        pending: s.pending || 0,
        underReview: s.underReview || 0,
        reviewed: s.reviewed || 0,
        approved: s.approved || 0,
        rejected: s.rejected || 0,
        avgProcessingDays: s.avgProcessingDays || 0
      });

      // Queue claims
      let queueData: Claim[] = [];
      if (permissions.canReview) {
        try {
          const res = await axiosInstance.get('/claims/my-assigned');
          queueData = res.data || [];
        } catch {
          const res = await axiosInstance.get('/claims/queue');
          queueData = res.data || [];
        }
      } else if (permissions.canApprove) {
        try {
          const res = await axiosInstance.get('/claims/pending-approval');
          queueData = res.data || [];
        } catch {
          const res = await axiosInstance.get('/claims/queue?status=REVIEWED');
          queueData = res.data || [];
        }
      } else {
        try {
          const res = await axiosInstance.get('/claims');
          queueData = res.data || [];
        } catch {
          queueData = [];
        }
      }
      setQueueClaims(queueData.map((c: any) => ({
        ...c,
        customerName: c.customerName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Unknown'
      })));

      // Recent activities
      try {
        const actRes = await axiosInstance.get('/claims/recent-activities');
        setRecentActivities(actRes.data || []);
      } catch { /* ignore */ }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [permissions]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // ========================================================================
  // Search handler (strict minimum length)
  // ========================================================================
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 3) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      if (value.trim().length > 0) {
        toast.info('Please enter at least 3 characters to search');
      }
      return;
    }
    setSearching(true);
    debouncedSearch(value.trim());
  };

  const openSearchClaimDetail = (claim: Claim) => {
    setSelectedSearchClaim(claim);
    setDetailModalOpen(true);
    setShowSearchDropdown(false);
  };

  // Filter queue
  const filteredQueue = queueClaims.filter(c =>
    c.claimNumber?.toLowerCase().includes(queueSearchTerm.toLowerCase()) ||
    c.customerName?.toLowerCase().includes(queueSearchTerm.toLowerCase())
  );

  // ========================================================================
  // Render helpers
  // ========================================================================
  const renderStatsCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {[
        { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
        { label: 'Under Review', value: stats.underReview, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
        { label: 'Reviewed', value: stats.reviewed, icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-100' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
        { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
        { label: 'Total', value: stats.total, icon: DollarSign, color: 'text-gray-600', bg: 'bg-gray-100' }
      ].map((card, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderQueueClaims = () => {
    if (filteredQueue.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No claims in your queue</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-3">
        {filteredQueue.map((claim) => {
          const status = getStatusBadge(claim.status);
          const StatusIcon = getStatusIcon(claim.status);
          return (
            <Card key={claim.id} className="hover:shadow-lg transition-all duration-200 border-l-4"
              style={{ borderLeftColor: status.color.includes('yellow') ? '#eab308' : status.color.includes('blue') ? '#3b82f6' : status.color.includes('cyan') ? '#06b6d4' : status.color.includes('green') ? '#22c55e' : status.color.includes('red') ? '#ef4444' : '#8b5cf6' }}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusIcon className={`h-4 w-4 ${status.color}`} />
                      <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      <div><p className="text-gray-500">Customer</p><p className="font-medium">{claim.customerName}</p></div>
                      <div><p className="text-gray-500">Nature</p><p className="font-medium">{claim.natureOfLoss}</p></div>
                      <div><p className="text-gray-500">Amount</p><p className="font-medium text-blue-600">{formatCurrency(claim.estimatedAmount)}</p></div>
                    </div>
                    {claim.assignedOfficerName && (
                      <p className="text-xs text-gray-400"><User className="h-3 w-3 inline mr-1" />Assigned to: {claim.assignedOfficerName}</p>
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

  const renderRecentActivities = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" /> Recent Activities
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activities</p>
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-3">
              {recentActivities.slice(0, 15).map((act, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{act.action}</p>
                    <p className="text-xs text-gray-500">{act.user} • {formatDate(act.timestamp)}</p>
                  </div>
                  <Badge className={act.status === 'APPROVED' ? 'bg-green-100 text-green-800' : act.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}>
                    {act.status}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );

  // ========================================================================
  // Loading / Error states
  // ========================================================================
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
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

  // ========================================================================
  // Main render
  // ========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-gray-500">Manage and monitor claims</p>
            <Badge className="bg-blue-100 text-blue-800">{permissions.roleDisplayName}</Badge>
            {permissions.canApprove && (
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Approver
              </Badge>
            )}
            {permissions.canReview && !permissions.canApprove && (
              <Badge className="bg-cyan-100 text-cyan-800 flex items-center gap-1">
                <ClipboardList className="h-3 w-3" /> Reviewer
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

      {/* Stats Cards */}
      {renderStatsCards()}

      {/* Global Search Claim (read-only results) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Claims
          </CardTitle>
          <p className="text-sm text-gray-500">Search across all claims in the system (view only, min. 3 characters)</p>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by claim number or customer name..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
              onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            />
            {showSearchDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No claims found</div>
                ) : (
                  searchResults.map((claim) => (
                    <button
                      key={claim.id}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                      onMouseDown={() => openSearchClaimDetail(claim)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{claim.claimNumber}</p>
                          <p className="text-sm text-gray-500">{claim.customerName} • {claim.natureOfLoss}</p>
                        </div>
                        <Badge className={getStatusBadge(claim.status).color}>
                          {getStatusBadge(claim.status).label}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* My Queue */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {permissions.canApprove ? 'Pending Approvals' : 'My Claim Queue'}
            </CardTitle>
            <div className="flex-1 max-w-xs">
              <Input
                placeholder="Filter queue..."
                value={queueSearchTerm}
                onChange={(e) => setQueueSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderQueueClaims()}
        </CardContent>
      </Card>

      {/* Recent Activities */}
      {renderRecentActivities()}

      {/* Read-Only Detail Modal for searched claims */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Claim Details: {selectedSearchClaim?.claimNumber}
              <span className="text-xs text-red-500 ml-2">(Read-only)</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSearchClaim && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const status = getStatusBadge(selectedSearchClaim.status);
                  return <Badge className={status.color}>{status.label}</Badge>;
                })()}
                <span className="text-sm text-gray-500">Submitted: {formatDate(selectedSearchClaim.submittedDate)}</span>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div><p className="text-xs text-gray-500">Claim Number</p><p className="font-medium">{selectedSearchClaim.claimNumber}</p></div>
                <div><p className="text-xs text-gray-500">Policy</p><p className="font-medium">{selectedSearchClaim.policyNumber || 'N/A'}</p></div>
                <div><p className="text-xs text-gray-500">Customer</p><p className="font-medium">{selectedSearchClaim.customerName}</p></div>
                <div><p className="text-xs text-gray-500">Nature of Loss</p><p className="font-medium">{selectedSearchClaim.natureOfLoss}</p></div>
                <div><p className="text-xs text-gray-500">Incident Date</p><p className="font-medium">{formatDate(selectedSearchClaim.incidentDate)}</p></div>
                <div><p className="text-xs text-gray-500">Location</p><p className="font-medium">{selectedSearchClaim.location || 'N/A'}</p></div>
              </div>

              {/* Amounts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-yellow-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Estimated Amount</p>
                  <p className="text-xl font-bold text-yellow-700">{formatCurrency(selectedSearchClaim.estimatedAmount)}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500">Approved Amount</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(selectedSearchClaim.approvedAmount || 0)}</p>
                </div>
              </div>

              {/* Description */}
              {selectedSearchClaim.incidentDescription && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm bg-white p-3 rounded-lg border">{selectedSearchClaim.incidentDescription}</p>
                </div>
              )}

              {/* Vehicle Details (if any) */}
              {selectedSearchClaim.vehicleDetails && (
                <div>
                  <p className="text-sm font-medium mb-1 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Vehicle Details
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-lg text-sm">
                    <div><span className="text-gray-500">Make:</span> {selectedSearchClaim.vehicleDetails.make}</div>
                    <div><span className="text-gray-500">Model:</span> {selectedSearchClaim.vehicleDetails.model}</div>
                    <div><span className="text-gray-500">Year:</span> {selectedSearchClaim.vehicleDetails.year}</div>
                    <div><span className="text-gray-500">Plate:</span> {selectedSearchClaim.vehicleDetails.plateNumber}</div>
                  </div>
                </div>
              )}

              {/* Officer Remarks */}
              {selectedSearchClaim.officerRemarks && (
                <div>
                  <p className="text-sm font-medium mb-1">Officer Remarks</p>
                  <p className="text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">{selectedSearchClaim.officerRemarks}</p>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setDetailModalOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}