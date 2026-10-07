import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, AlertCircle, Loader2, Eye, Clock, CheckCircle,
  XCircle, DollarSign, Activity, Search, Shield, Car, Heart, Flame,
  Plane, User, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../lib/utils';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  status: string;
  incidentDate: string;
  estimatedAmount: number;
  approvedAmount?: number;
  natureOfLoss: string;
  submittedDate: string;
  policyNumber?: string;
  incidentDescription?: string;
  location?: string;
  productType?: string;
  customerName?: string;
}

// ----------------------------------------------------------------------------
// Status helpers
// ----------------------------------------------------------------------------
const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; color: string; icon: any }> = {
    SUBMITTED: { label: 'Submitted', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-blue-100 text-blue-800', icon: Activity },
    REVIEWED: { label: 'Reviewed', color: 'bg-cyan-100 text-cyan-800', icon: FileText },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: XCircle },
    PAID: { label: 'Paid', color: 'bg-purple-100 text-purple-800', icon: DollarSign },
  };
  return badges[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800', icon: FileText };
};

const PRODUCT_ICONS: Record<string, any> = {
  MOTOR: Car,
  HEALTH: Heart,
  FIRE: Flame,
  TRAVEL: Plane,
  LIFE: User,
  default: Shield,
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'PAID', label: 'Paid' },
];

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------
export default function ClaimsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [claims, setClaims] = useState<Claim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --------------------------------------------------------------------------
  // Fetch claims
  // --------------------------------------------------------------------------
  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get('/claims/my-claims');
      const claimsData = Array.isArray(res.data) ? res.data : (res.data?.claims || res.data?.data || []);
      setClaims(claimsData);
      setFilteredClaims(claimsData);
    } catch (err: any) {
      console.error('Failed to fetch claims:', err);
      // If /my-claims fails, try the generic /claims endpoint
      try {
        const fallbackRes = await axiosInstance.get('/claims');
        const claimsData = Array.isArray(fallbackRes.data) ? fallbackRes.data : (fallbackRes.data?.claims || fallbackRes.data?.data || []);
        setClaims(claimsData);
        setFilteredClaims(claimsData);
      } catch (fallbackErr: any) {
        setError(err.response?.data?.error || 'Failed to load claims');
        toast.error('Failed to load claims');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchClaims();
    setRefreshing(false);
    toast.success('Claims refreshed');
  };

  // --------------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------------
  useEffect(() => {
    let filtered = [...claims];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        c =>
          c.claimNumber?.toLowerCase().includes(term) ||
          c.policyNumber?.toLowerCase().includes(term) ||
          c.natureOfLoss?.toLowerCase().includes(term) ||
          c.incidentDescription?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    filtered.sort(
      (a, b) =>
        new Date(b.submittedDate || b.incidentDate).getTime() -
        new Date(a.submittedDate || a.incidentDate).getTime()
    );

    setFilteredClaims(filtered);
  }, [searchTerm, statusFilter, claims]);

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------
  const stats = {
    total: claims.length,
    submitted: claims.filter(c => c.status === 'SUBMITTED').length,
    underReview: claims.filter(c => c.status === 'UNDER_REVIEW').length,
    reviewed: claims.filter(c => c.status === 'REVIEWED').length,
    approved: claims.filter(c => c.status === 'APPROVED').length,
    rejected: claims.filter(c => c.status === 'REJECTED').length,
    paid: claims.filter(c => c.status === 'PAID').length,
  };

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your claims...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Error state
  // --------------------------------------------------------------------------
  if (error) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchClaims} className="bg-[#1A3E6F] hover:bg-[#153358]">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
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
      {/* Header – matches Policies page style */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">My Claims</h1>
          <p className="text-gray-500 mt-1">Track and manage your insurance claims</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          {/* ✅ FIXED: Register New Claim button */}
          <Button
            onClick={() => navigate('/customer/claims/new')}
            className="bg-[#1A3E6F] hover:bg-[#153358]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Register New Claim
          </Button>
        </div>
      </div>

      

      {/* Filters – matches Policies page style */}
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by claim number, policy number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Claims List – matches Policies page card style */}
      {filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No claims found</h3>
            <p className="text-gray-500 mb-6">
              {claims.length === 0
                ? "You haven't submitted any claims yet. Register a new claim to get started."
                : 'No claims match your current filters.'}
            </p>
            {claims.length === 0 && (
              <Button 
                onClick={() => navigate('/customer/claims/new')} 
                className="bg-[#1A3E6F] hover:bg-[#153358]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Register New Claim
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map((claim) => {
            const status = getStatusBadge(claim.status);
            const StatusIcon = status.icon;
            const ProductIcon = PRODUCT_ICONS[claim.productType || ''] || PRODUCT_ICONS.default;

            return (
              <Card
                key={claim.id}
                className="hover:shadow-lg transition-all duration-200 border-l-4 cursor-pointer"
                style={{
                  borderLeftColor: status.color.includes('yellow')
                    ? '#eab308'
                    : status.color.includes('blue')
                    ? '#3b82f6'
                    : status.color.includes('cyan')
                    ? '#06b6d4'
                    : status.color.includes('green')
                    ? '#22c55e'
                    : status.color.includes('red')
                    ? '#ef4444'
                    : status.color.includes('purple')
                    ? '#8b5cf6'
                    : '#6b7280',
                }}
                onClick={() => navigate(`/customer/claims/${claim.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start flex-wrap gap-4">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      {/* Top row: claim number + status + product type */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <h3 className="font-semibold text-lg">{claim.claimNumber}</h3>
                        <Badge className={status.color}>{status.label}</Badge>
                        {claim.productType && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <ProductIcon className="h-3 w-3" />
                            {claim.productType}
                          </Badge>
                        )}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500">Policy</p>
                          <p className="font-medium">{claim.policyNumber || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Nature of Loss</p>
                          <p className="font-medium">{claim.natureOfLoss || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Estimated Amount</p>
                          <p className="font-medium text-blue-600">
                            {formatCurrency(claim.estimatedAmount || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submitted Date</p>
                          <p className="font-medium">{formatDate(claim.submittedDate || claim.incidentDate)}</p>
                        </div>
                      </div>

                      {/* Approved amount (if exists) */}
                      {claim.approvedAmount && claim.approvedAmount > 0 && (
                        <p className="text-xs text-green-600">
                          Approved: {formatCurrency(claim.approvedAmount)}
                        </p>
                      )}

                      {/* Incident description preview */}
                      {claim.incidentDescription && (
                        <p className="text-xs text-gray-400 line-clamp-1">
                          {claim.incidentDescription}
                        </p>
                      )}
                    </div>

                    {/* View button */}
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}