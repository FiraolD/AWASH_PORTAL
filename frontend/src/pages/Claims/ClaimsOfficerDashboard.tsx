import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  RefreshCw, 
  Search,
  ChevronRight,
  User,
  Calendar,
  DollarSign,
  Phone,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuthStore } from '../../stores/authStore';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface Claim {
  id: string;
  claimNumber: string;
  status: string;
  incidentDate: string;
  incidentDescription: string;
  natureOfLoss: string;
  estimatedAmount: number;
  submittedDate: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  policyNumber: string;
  policyType: string;
}

interface DashboardStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
}

export default function ClaimsOfficerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // Fetch assigned claims
      const claimsResponse = await axiosInstance.get('/claims/my-assigned');
      const claimsData = claimsResponse.data || [];
      setClaims(claimsData);

      // Calculate stats from claims
      const statsData: DashboardStats = {
        total: claimsData.length,
        pending: claimsData.filter((c: Claim) => c.status === 'SUBMITTED').length,
        underReview: claimsData.filter((c: Claim) => c.status === 'UNDER_REVIEW').length,
        approved: claimsData.filter((c: Claim) => c.status === 'APPROVED').length,
        rejected: claimsData.filter((c: Claim) => c.status === 'REJECTED').length,
        paid: claimsData.filter((c: Claim) => c.status === 'PAID').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      if (!silent) {
        toast.error('Failed to load assigned claims');
      }
    } finally {
      setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData(true);
    toast.success('Dashboard refreshed');
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
      UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-800', icon: <AlertCircle className="h-3 w-3" /> },
      APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
      REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: <AlertCircle className="h-3 w-3" /> },
      PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-800', icon: <CheckCircle2 className="h-3 w-3" /> },
    };
    const defaultStatus = { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
    return statusMap[status] || defaultStatus;
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount?.toLocaleString() || '0'}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter claims
  const filteredClaims = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch = 
        claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${claim.firstName} ${claim.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.policyNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || claim.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [claims, searchTerm, filterStatus]);

  const handleClaimClick = (claimId: string) => {
    navigate(`/claims-officer/review/${claimId}`);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Officer Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Manage claims assigned to you ({claims.length} assigned)
          </p>
          <p className="text-sm text-gray-400">
            Welcome back, {user?.firstName} {user?.lastName}
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Assigned</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Under Review</p>
                <p className="text-2xl font-bold text-blue-600">{stats.underReview}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by claim number, customer, or policy..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Assigned Claims ({filteredClaims.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClaims.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No claims found</p>
              <p className="text-sm text-gray-400 mt-1">
                {claims.length === 0 
                  ? 'You have no claims assigned to you yet.' 
                  : 'No claims match your filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => {
                const statusInfo = getStatusBadge(claim.status);
                return (
                  <div
                    key={claim.id}
                    onClick={() => handleClaimClick(claim.id)}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-[#1A3E6F]"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-[#1A3E6F]">
                          {claim.claimNumber}
                        </h3>
                        <Badge className={statusInfo.color}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {statusInfo.label}
                          </span>
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-700">
                            {claim.firstName} {claim.lastName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{claim.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{claim.phone || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Policy: {claim.policyNumber}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">{formatCurrency(claim.estimatedAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Incident: {formatDate(claim.incidentDate)}</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-500 line-clamp-1">
                        {claim.incidentDescription || claim.natureOfLoss || 'No description'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#1A3E6F] group-hover:bg-[#1A3E6F] group-hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimClick(claim.id);
                        }}
                      >
                        Review <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}