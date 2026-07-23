import React, { useEffect, useState, useCallback } from 'react';
import { 
  FileCheck, AlertTriangle, FileText, Clock, CheckCircle, XCircle,
  Eye, DollarSign, MessageSquare, Send, Loader2, Shield, TrendingUp,
  Activity, Award, Lock, Zap, Ban, ThumbsUp, User, Phone, Mail, 
  Home, Car, Heart, Briefcase, Calendar as CalendarIcon, Building,
  MapPin, Hash, Wrench, Key, Truck, Users, Flag, CreditCard,
  ChevronDown, ChevronUp, Package, ShieldCheck, Info, AlertCircle,
  Plus, Minus, Search, Filter, RefreshCw, Download
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatCurrency, formatDate } from '../../lib/utils';

// ============================================
// TYPES
// ============================================

interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  adjustedPremium?: number;
  totalPremium?: number;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
  effectiveDate?: string;
  expirationDate?: string;
  premiumFrequency?: string;
  underwriterNotes?: string;
  customerDecision?: string;
  customerDecisionNotes?: string;
  customerDecisionDate?: string;
  approvalType?: string;
  riskScore?: number;
}

interface PolicyDetail extends Policy {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    occupation?: string;
    nationality?: string;
    idNumber?: string;
  };
  productDetails?: {
    vehicles?: VehicleDetail[];
    propertyType?: string;
    propertyAddress?: string;
    propertyValue?: number;
    constructionType?: string;
    yearBuilt?: number;
    securityFeatures?: string[];
    floorArea?: number;
    numberOfRooms?: number;
    healthConditions?: string[];
    beneficiaries?: Array<{
      name: string;
      relationship: string;
      percentage: number;
      dateOfBirth?: string;
    }>;
    travelDestination?: string;
    travelDates?: { from: string; to: string };
    sumInsured?: number;
    purpose?: string;
    previousClaims?: Array<{
      year: number;
      amount: number;
      description: string;
    }>;
  };
  selectedPerils?: Array<{
    id: string;
    perilName: string;
    description: string;
    premium: number;
  }>;
  selectedRiders?: Array<{
    id: string;
    riderName: string;
    description: string;
    premium: number;
    maxLimit?: number;
  }>;
  negotiationHistory?: Array<{
    timestamp: string;
    action: string;
    notes: string;
    from?: number;
    to?: number;
    underwriterName?: string;
  }>;
}

interface RiskAssessment {
  id: string;
  policyNumber: string;
  customerName: string;
  coverageAmount: number;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  recommendation: string;
}

interface Endorsement {
  id: string;
  policyNumber: string;
  customerName: string;
  customerEmail: string;
  type: string;
  changes: any;
  reason: string;
  status: string;
  submittedDate: string;
}

interface VehicleDetail {
  id?: string;
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vehicleValue: number;
  engineNumber?: string;
  chassisNumber?: string;
  plateNumber?: string;
  fuelType?: string;
  seatingCapacity?: number;
  color?: string;
  vehicleType?: string;
  usage?: string;
}

interface DashboardStats {
  pendingReviews: number;
  pendingFinalApprovals: number;
  pendingEndorsements: number;
  policiesThisMonth: number;
  totalActivePolicies: number;
  approvalRate: number;
  rejectedPolicies: number;
}

// ============================================
// PERMISSION HOOK
// ============================================

const useUnderwritingPermissions = (userRole: string) => {
  const isOfficerLevel1 = userRole === 'UNDERWRITING_OFFICER_I';
  const isOfficerLevel2 = userRole === 'UNDERWRITING_OFFICER_II';
  const isSeniorOfficer = userRole === 'SENIOR_UNDERWRITING_OFFICER';
  const isSupervisor = userRole === 'SUPERVISOR_UNDERWRITING';
  const isManager = userRole === 'MANAGER_UNDERWRITING';
  const isHead = userRole === 'HEAD_UNDERWRITING';
  const isAdmin = userRole === 'UNDERWRITING_ADMIN' || userRole === 'MASTER_ADMIN';

  return {
    canViewAllTabs: true,
    canAdjustPremium: true,
    canDirectApprove: isSupervisor || isManager || isHead || isAdmin,
    canReject: isSupervisor || isManager || isHead || isAdmin || isSeniorOfficer,
    canApproveEndorsements: isSeniorOfficer || isManager || isHead || isAdmin,
    canFinalApprove: isManager || isHead || isAdmin,
    canBulkApprove: isManager || isHead || isAdmin,
    canViewRiskAssessment: true,
    isViewOnly: isOfficerLevel1,
    isOfficer: isOfficerLevel1 || isOfficerLevel2,
    isSenior: isSeniorOfficer,
    isManager: isManager || isSupervisor,
    isHead: isHead,
    isAdmin: isAdmin,
    roleDisplayName: getRoleDisplayName(userRole)
  };
};

const getRoleDisplayName = (role: string): string => {
  const map: Record<string, string> = {
    'UNDERWRITING_OFFICER_I': 'Underwriting Officer I (View Only)',
    'UNDERWRITING_OFFICER_II': 'Underwriting Officer II',
    'SENIOR_UNDERWRITING_OFFICER': 'Senior Underwriting Officer',
    'SUPERVISOR_UNDERWRITING': 'Supervisor Underwriting',
    'MANAGER_UNDERWRITING': 'Underwriting Manager',
    'HEAD_UNDERWRITING': 'Head of Underwriting',
    'UNDERWRITING_ADMIN': 'Underwriting Administrator',
    'MASTER_ADMIN': 'Master Administrator'
  };
  return map[role] || role || 'Underwriting Officer';
};

// ============================================
// SECTION HEADER COMPONENT
// ============================================

const SectionHeader = ({ 
  title, 
  icon: Icon, 
  section, 
  count, 
  bgColor = "bg-gray-50",
  expanded,
  onToggle
}: any) => (
  <button
    onClick={() => onToggle(section)}
    className={`w-full flex items-center justify-between p-3 ${bgColor} rounded-lg hover:bg-gray-100 transition-colors`}
  >
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[#1A3E6F]" />
      <span className="font-medium">{title}</span>
      {count !== undefined && count > 0 && (
        <Badge className="bg-[#1A3E6F] text-white ml-2">{count}</Badge>
      )}
    </div>
    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
  </button>
);

// ============================================
// INFO ROW COMPONENT
// ============================================

const InfoRow = ({ label, value, icon: Icon }: any) => (
  <div className="flex items-start gap-2 p-2 border-b last:border-0">
    {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5" />}
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value || 'N/A'}</p>
    </div>
  </div>
);

// ============================================
// STATUS BADGE HELPERS
// ============================================

const getStatusBadge = (status: string) => {
  const badges: Record<string, { label: string; color: string }> = {
    PENDING_UNDERWRITING: { label: 'Pending Review', color: 'bg-yellow-100 text-yellow-800' },
    SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
    UNDER_REVIEW: { label: 'Under Review', color: 'bg-purple-100 text-purple-800' },
    AWAITING_CUSTOMER_APPROVAL: { label: 'Awaiting Customer', color: 'bg-orange-100 text-orange-800' },
    PENDING_FINAL_APPROVAL: { label: 'Pending Final', color: 'bg-indigo-100 text-indigo-800' },
    ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800' },
    REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
    REJECTED_BY_CUSTOMER: { label: 'Rejected by Customer', color: 'bg-red-100 text-red-800' },
    APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    PAID: { label: 'Paid', color: 'bg-emerald-100 text-emerald-800' },
  };
  return badges[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800' };
};

const getRiskBadge = (score: number, level: string) => {
  if (score >= 70 || level === 'HIGH') {
    return { label: 'High Risk', color: 'bg-red-100 text-red-800', icon: TrendingUp };
  } else if (score >= 40 || level === 'MEDIUM') {
    return { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
  } else {
    return { label: 'Low Risk', color: 'bg-green-100 text-green-800', icon: CheckCircle };
  }
};

const getPolicyTypeIcon = (type: string) => {
  const map: Record<string, any> = {
    'MOTOR': Car, 'AUTO': Car, 'PROPERTY': Building, 'HOME': Home,
    'LIFE': Heart, 'HEALTH': Heart, 'TRAVEL': Briefcase
  };
  return map[type?.toUpperCase()] || FileText;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function UnifiedUnderwritingDashboard() {
  const { user } = useAuthStore();
  const userRole = user?.role?.toUpperCase() || '';
  const permissions = useUnderwritingPermissions(userRole);

  // ===== State =====
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingReviews: 0,
    pendingFinalApprovals: 0,
    pendingEndorsements: 0,
    policiesThisMonth: 0,
    totalActivePolicies: 0,
    approvalRate: 0,
    rejectedPolicies: 0
  });

  // Modal states
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDetails, setPolicyDetails] = useState<PolicyDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null);
  
  // Form states
  const [adjustedPremium, setAdjustedPremium] = useState('');
  const [underwriterNotes, setUnderwriterNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'adjust' | 'direct_approve' | 'reject' | 'final_approve'>('adjust');
  
  // UI states
  const [expandedSections, setExpandedSections] = useState({
    customerInfo: true,
    riskInputs: true,
    coverageDetails: true,
    vehicles: true,
    propertyDetails: true,
    perils: true,
    riders: true,
    previousClaims: true,
    reviewHistory: true
  });

  // ===== Data Fetching =====
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsResult, policiesResult, riskResult, endorsementsResult] = await Promise.allSettled([
        axiosInstance.get('/underwriting/stats'),
        axiosInstance.get('/underwriting/pending-review'),
        axiosInstance.get('/underwriting/risk-assessments'),
        axiosInstance.get('/underwriting/endorsements')
      ]);

      const fallbackStats: DashboardStats = {
        pendingReviews: 0,
        pendingFinalApprovals: 0,
        pendingEndorsements: 0,
        policiesThisMonth: 0,
        totalActivePolicies: 0,
        approvalRate: 0,
        rejectedPolicies: 0
      };

      setStats(statsResult.status === 'fulfilled' ? (statsResult.value.data || fallbackStats) : fallbackStats);
      setPolicies(policiesResult.status === 'fulfilled' && Array.isArray(policiesResult.value.data) ? policiesResult.value.data : []);
      setRiskAssessments(riskResult.status === 'fulfilled' && Array.isArray(riskResult.value.data) ? riskResult.value.data : []);
      setEndorsements(endorsementsResult.status === 'fulfilled' && Array.isArray(endorsementsResult.value.data) ? endorsementsResult.value.data : []);

      const failedRequests = [statsResult, policiesResult, riskResult, endorsementsResult].filter((result) => result.status === 'rejected');
      if (failedRequests.length > 0 && failedRequests.length === 4) {
        toast.error('Failed to load dashboard data');
      }

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      if (error.response?.status === 403) {
        toast.error('You don\'t have permission to access underwriting data');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPolicyDetails = async (policyId: string) => {
    setLoadingDetails(true);
    try {
      const response = await axiosInstance.get(`/underwriting/policies/${policyId}`);
      setPolicyDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch policy details:', error);
      toast.error('Failed to load policy details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  // ===== Action Handlers =====
  const openActionModal = async (policy: Policy, type: 'adjust' | 'direct_approve' | 'reject' | 'final_approve') => {
    setSelectedPolicy(policy);
    setActionType(type);
    setAdjustedPremium(policy.premium?.toString() || '');
    setUnderwriterNotes('');
    setRejectReason('');
    await fetchPolicyDetails(policy.id);
  };

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
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/adjust`, {
        adjusted_premium: parseFloat(adjustedPremium),
        underwriter_notes: underwriterNotes
      });
      
      toast.success('Premium adjustment submitted! Customer will be notified.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setAdjustedPremium('');
      setUnderwriterNotes('');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to submit adjustment:', error);
      toast.error('Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectApprove = async () => {
    if (!selectedPolicy) return;
    
    if (!underwriterNotes.trim()) {
      toast.error('Please add approval notes before confirming');
      return;
    }
    
    setSubmitting(true);
    try {
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/direct-approve`, {
        comments: underwriterNotes
      });
      
      toast.success('Policy approved successfully! Policy is now ACTIVE.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setUnderwriterNotes('');
      fetchDashboardData();
    } catch (error: any) {
      console.error('Failed to approve policy:', error);
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to approve policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPolicy = async () => {
    if (!selectedPolicy) return;
    
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setSubmitting(true);
    try {
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/reject`, {
        reason: rejectReason,
        comments: rejectReason
      });
      
      toast.success('Policy rejected successfully.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setRejectReason('');
      fetchDashboardData();
    } catch (error: any) {
      console.error('Failed to reject policy:', error);
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to reject policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalApprove = async () => {
    if (!selectedPolicy) return;
    
    if (!underwriterNotes.trim()) {
      toast.error('Please add approval notes before confirming');
      return;
    }
    
    setSubmitting(true);
    try {
      await axiosInstance.post(`/underwriting/policies/${selectedPolicy.id}/final-approve`, {
        notes: underwriterNotes
      });
      
      toast.success('Policy fully approved and activated!');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setUnderwriterNotes('');
      fetchDashboardData();
    } catch (error: any) {
      console.error('Failed to final approve policy:', error);
      toast.error(error.response?.data?.error || 'Failed to approve policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveEndorsement = async (id: string) => {
    try {
      await axiosInstance.post(`/underwriting/endorsements/${id}/approve`, {});
      toast.success('Endorsement approved successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to approve endorsement:', error);
      toast.error('Failed to approve endorsement');
    }
  };

  const handleRejectEndorsement = async (id: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      try {
        await axiosInstance.post(`/underwriting/endorsements/${id}/reject`, { reason });
        toast.success('Endorsement rejected');
        fetchDashboardData();
      } catch (error) {
        console.error('Failed to reject endorsement:', error);
        toast.error('Failed to reject endorsement');
      }
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ===== Loading State =====
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-gray-500">Manage policy reviews, risk assessments, and endorsements</p>
            <Badge className="bg-blue-100 text-blue-800">
              {permissions.roleDisplayName}
            </Badge>
            {permissions.isViewOnly && (
              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                View Only
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* ===== STATS CARDS ===== */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 xl:grid-cols-7">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Final Approval</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingFinalApprovals}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Endorsements</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingEndorsements}</p>
              </div>
              <FileText className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-blue-600">{stats.policiesThisMonth}</p>
              </div>
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Active Policies</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalActivePolicies}</p>
              </div>
              <Shield className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejectedPolicies || 0}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Approval Rate</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.approvalRate || 0}%</p>
              </div>
              <Award className="h-6 w-6 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== TABS ===== */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Policy Queue ({stats.pendingReviews})
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Risk Assessment ({riskAssessments.length})
          </TabsTrigger>
          <TabsTrigger value="endorsements" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Endorsements ({stats.pendingEndorsements})
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: POLICY QUEUE ===== */}
        <TabsContent value="queue" className="space-y-4">
          {policies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No policies pending review</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {policies.map((policy) => {
                const statusBadge = getStatusBadge(policy.status);
                const PolicyIcon = getPolicyTypeIcon(policy.type);
                return (
                  <Card key={policy.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <PolicyIcon className="h-5 w-5 text-[#1A3E6F]" />
                            <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                            <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                            {policy.riskScore && policy.riskScore > 60 && (
                              <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                            )}
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
                          
                          <div className="text-xs text-gray-400">
                            Submitted: {new Date(policy.createdAt).toLocaleString()}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap">
                          {permissions.canDirectApprove && (
                            <Button 
                              onClick={() => openActionModal(policy, 'direct_approve')} 
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <Zap className="h-4 w-4 mr-1" /> Direct Approve
                            </Button>
                          )}
                          {permissions.canReject && (
                            <Button 
                              onClick={() => openActionModal(policy, 'reject')} 
                              variant="destructive" 
                              className="bg-red-600 hover:bg-red-700"
                              size="sm"
                            >
                              <Ban className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          )}
                          <Button 
                            onClick={() => openActionModal(policy, 'adjust')} 
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 mr-1" /> Review & Adjust
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 2: RISK ASSESSMENT ===== */}
        <TabsContent value="risk" className="space-y-4">
          {riskAssessments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No pending risk assessments</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {riskAssessments.map((assessment) => {
                const riskInfo = getRiskBadge(assessment.riskScore, assessment.riskLevel);
                const RiskIcon = riskInfo.icon;
                
                return (
                  <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold text-lg">{assessment.policyNumber}</h3>
                          <Badge className={riskInfo.color}>
                            <RiskIcon className="h-3 w-3 mr-1 inline" />
                            {riskInfo.label}
                          </Badge>
                          <Badge className="bg-gray-100 text-gray-800">
                            Score: {assessment.riskScore}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Customer</p>
                          <p className="font-medium">{assessment.customerName}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Coverage Amount</p>
                          <p className="font-medium">ETB {assessment.coverageAmount?.toLocaleString()}</p>
                        </div>
                        
                        {assessment.riskFactors && assessment.riskFactors.length > 0 && (
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Risk Factors</p>
                            <div className="flex flex-wrap gap-2">
                              {assessment.riskFactors.map((factor, idx) => (
                                <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {factor}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {assessment.recommendation && (
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <p className="text-sm font-medium text-blue-800">Recommendation</p>
                            <p className="text-sm text-blue-700">{assessment.recommendation}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 3: ENDORSEMENTS ===== */}
        <TabsContent value="endorsements" className="space-y-4">
          {endorsements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No pending endorsements</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {endorsements.map((endorsement) => (
                <Card key={endorsement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-semibold">{endorsement.policyNumber}</h3>
                          <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          {!permissions.canApproveEndorsements && (
                            <Badge className="bg-gray-100 text-gray-500 flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              View Only
                            </Badge>
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Customer</p>
                          <p className="font-medium">{endorsement.customerName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Endorsement Type</p>
                          <p className="font-medium">{endorsement.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Changes Requested</p>
                          <p className="text-sm">
                            {typeof endorsement.changes === 'string' 
                              ? endorsement.changes 
                              : JSON.stringify(endorsement.changes || {})}
                          </p>
                        </div>
                        {endorsement.reason && (
                          <div>
                            <p className="text-sm text-gray-500">Reason</p>
                            <p className="text-sm text-gray-600">{endorsement.reason}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEndorsement(endorsement)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {permissions.canApproveEndorsements ? (
                          <>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveEndorsement(endorsement.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRejectEndorsement(endorsement.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                            className="text-gray-400"
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            No Approval Rights
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* ACTION MODAL - Full Policy Details */}
      {/* ============================================ */}
      {selectedPolicy && policyDetails && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" 
          onClick={() => setSelectedPolicy(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto" 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = getPolicyTypeIcon(policyDetails.type);
                  return <Icon className="h-5 w-5 text-[#1A3E6F]" />;
                })()}
                <h3 className="text-lg font-semibold">
                  {actionType === 'direct_approve' && 'Direct Approve Policy'}
                  {actionType === 'reject' && 'Reject Policy'}
                  {actionType === 'final_approve' && 'Final Approve Policy'}
                  {actionType === 'adjust' && `Review Policy: ${policyDetails.policyNumber}`}
                </h3>
                {(() => {
                  const status = getStatusBadge(policyDetails.status);
                  return <Badge className={status.color}>{status.label}</Badge>;
                })()}
              </div>
              <button onClick={() => setSelectedPolicy(null)} className="text-gray-500 hover:text-gray-700 text-xl">
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* ===== RISK ASSESSMENT SUMMARY ===== */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Risk Assessment Summary</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-amber-700">Coverage Amount</p>
                        <p className="font-bold">ETB {policyDetails.coverageAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Premium</p>
                        <p className="font-bold">ETB {policyDetails.premium?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Premium Ratio</p>
                        <p className="font-bold">
                          {policyDetails.coverageAmount > 0 
                            ? ((policyDetails.premium / policyDetails.coverageAmount) * 100).toFixed(2) 
                            : 0}%
                        </p>
                      </div>
                      <div>
                        <p className="text-amber-700">Risk Level</p>
                        <Badge className={policyDetails.coverageAmount > 1000000 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {policyDetails.coverageAmount > 1000000 ? 'High' : 'Medium'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== CUSTOMER INFORMATION ===== */}
              <SectionHeader 
                title="Customer Information" 
                icon={User} 
                section="customerInfo"
                expanded={expandedSections.customerInfo}
                onToggle={toggleSection}
              />
              {expandedSections.customerInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  <InfoRow label="Full Name" value={`${policyDetails.customer?.firstName} ${policyDetails.customer?.lastName}`} icon={User} />
                  <InfoRow label="Email" value={policyDetails.customer?.email} icon={Mail} />
                  <InfoRow label="Phone" value={policyDetails.customer?.phone} icon={Phone} />
                  <InfoRow label="Address" value={policyDetails.customer?.address} icon={Home} />
                  <InfoRow label="Date of Birth" value={policyDetails.customer?.dateOfBirth ? formatDate(policyDetails.customer.dateOfBirth) : 'N/A'} icon={CalendarIcon} />
                  <InfoRow label="Occupation" value={policyDetails.customer?.occupation} icon={Briefcase} />
                  <InfoRow label="Nationality" value={policyDetails.customer?.nationality} icon={Flag} />
                  <InfoRow label="ID Number" value={policyDetails.customer?.idNumber} icon={CreditCard} />
                </div>
              )}

              {/* ===== VEHICLE DETAILS ===== */}
              {policyDetails.productDetails?.vehicles && policyDetails.productDetails.vehicles.length > 0 && (
                <>
                  <SectionHeader 
                    title="Motor Vehicle Details" 
                    icon={Car} 
                    section="vehicles" 
                    count={policyDetails.productDetails.vehicles.length}
                    bgColor="bg-blue-50"
                    expanded={expandedSections.vehicles}
                    onToggle={toggleSection}
                  />
                  {expandedSections.vehicles && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      {policyDetails.productDetails.vehicles.map((vehicle, idx) => (
                        <div key={idx} className="border border-blue-200 rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-blue-800 mb-3">Vehicle {idx + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoRow label="Make" value={vehicle.make} icon={Car} />
                            <InfoRow label="Model" value={vehicle.model} icon={Car} />
                            <InfoRow label="Year" value={vehicle.year} icon={CalendarIcon} />
                            <InfoRow label="Registration Number" value={vehicle.registrationNumber || vehicle.plateNumber} icon={Key} />
                            <InfoRow label="Plate Number" value={vehicle.plateNumber || vehicle.registrationNumber} icon={Hash} />
                            <InfoRow label="Engine Number" value={vehicle.engineNumber} icon={Wrench} />
                            <InfoRow label="Chassis Number" value={vehicle.chassisNumber} icon={Truck} />
                            <InfoRow label="Vehicle Value" value={`ETB ${vehicle.vehicleValue?.toLocaleString()}`} icon={DollarSign} />
                            <InfoRow label="Vehicle Type" value={vehicle.vehicleType || 'N/A'} />
                            <InfoRow label="Fuel Type" value={vehicle.fuelType || 'N/A'} icon={Flag} />
                            <InfoRow label="Seating Capacity" value={vehicle.seatingCapacity || 'N/A'} icon={Users} />
                            <InfoRow label="Color" value={vehicle.color || 'N/A'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ===== PROPERTY DETAILS ===== */}
              {policyDetails.productDetails?.propertyAddress && (
                <>
                  <SectionHeader 
                    title="Property Details" 
                    icon={Building} 
                    section="propertyDetails"
                    expanded={expandedSections.propertyDetails}
                    onToggle={toggleSection}
                  />
                  {expandedSections.propertyDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                      <InfoRow label="Property Type" value={policyDetails.productDetails.propertyType} icon={Building} />
                      <InfoRow label="Property Address" value={policyDetails.productDetails.propertyAddress} icon={MapPin} />
                      <InfoRow label="Property Value" value={`ETB ${policyDetails.productDetails.propertyValue?.toLocaleString()}`} icon={DollarSign} />
                      <InfoRow label="Construction Type" value={policyDetails.productDetails.constructionType} />
                      <InfoRow label="Year Built" value={policyDetails.productDetails.yearBuilt} icon={CalendarIcon} />
                      <InfoRow label="Floor Area" value={policyDetails.productDetails.floorArea ? `${policyDetails.productDetails.floorArea} sqm` : 'N/A'} />
                      <InfoRow label="Number of Rooms" value={policyDetails.productDetails.numberOfRooms} />
                      <InfoRow label="Security Features" value={policyDetails.productDetails.securityFeatures?.join(', ') || 'None'} icon={Shield} />
                    </div>
                  )}
                </>
              )}

              {/* ===== COVERAGE DETAILS ===== */}
              <SectionHeader 
                title="Coverage Details" 
                icon={ShieldCheck} 
                section="coverageDetails"
                expanded={expandedSections.coverageDetails}
                onToggle={toggleSection}
              />
              {expandedSections.coverageDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  <InfoRow label="Policy Type" value={policyDetails.type} icon={FileText} />
                  <InfoRow label="Coverage Amount" value={`ETB ${policyDetails.coverageAmount?.toLocaleString()}`} icon={DollarSign} />
                  <InfoRow label="Requested Premium" value={`ETB ${policyDetails.premium?.toLocaleString()}`} icon={DollarSign} />
                  <InfoRow label="Premium Frequency" value={policyDetails.premiumFrequency} icon={CalendarIcon} />
                  <InfoRow label="Effective Date" value={policyDetails.effectiveDate ? formatDate(policyDetails.effectiveDate) : 'N/A'} icon={CalendarIcon} />
                  <InfoRow label="Expiration Date" value={policyDetails.expirationDate ? formatDate(policyDetails.expirationDate) : 'N/A'} icon={CalendarIcon} />
                </div>
              )}

              {/* ===== SELECTED PERILS ===== */}
              {policyDetails.selectedPerils && policyDetails.selectedPerils.length > 0 && (
                <>
                  <SectionHeader 
                    title="Selected Perils / Risks" 
                    icon={AlertCircle} 
                    section="perils" 
                    count={policyDetails.selectedPerils.length}
                    expanded={expandedSections.perils}
                    onToggle={toggleSection}
                  />
                  {expandedSections.perils && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.selectedPerils.map((peril) => (
                        <div key={peril.id} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{peril.perilName}</p>
                            <p className="text-xs text-gray-500">{peril.description}</p>
                          </div>
                          <p className="font-medium text-amber-600">ETB {peril.premium?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ===== SELECTED RIDERS ===== */}
              {policyDetails.selectedRiders && policyDetails.selectedRiders.length > 0 && (
                <>
                  <SectionHeader 
                    title="Selected Riders / Add-ons" 
                    icon={Package} 
                    section="riders" 
                    count={policyDetails.selectedRiders.length}
                    expanded={expandedSections.riders}
                    onToggle={toggleSection}
                  />
                  {expandedSections.riders && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.selectedRiders.map((rider) => (
                        <div key={rider.id} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{rider.riderName}</p>
                            <p className="text-xs text-gray-500">{rider.description}</p>
                            {rider.maxLimit && <p className="text-xs text-gray-500">Max Limit: ETB {rider.maxLimit.toLocaleString()}</p>}
                          </div>
                          <p className="font-medium text-amber-600">ETB {rider.premium?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ===== PREVIOUS CLAIMS ===== */}
              {policyDetails.productDetails?.previousClaims && policyDetails.productDetails.previousClaims.length > 0 && (
                <>
                  <SectionHeader 
                    title="Previous Claims History" 
                    icon={FileCheck} 
                    section="previousClaims" 
                    count={policyDetails.productDetails.previousClaims.length}
                    expanded={expandedSections.previousClaims}
                    onToggle={toggleSection}
                  />
                  {expandedSections.previousClaims && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.productDetails.previousClaims.map((claim, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{claim.year}</p>
                            <p className="text-xs text-gray-500">{claim.description}</p>
                          </div>
                          <p className="font-medium text-red-600">ETB {claim.amount?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ===== REVIEW HISTORY ===== */}
              {policyDetails.negotiationHistory && policyDetails.negotiationHistory.length > 0 && (
                <>
                  <SectionHeader 
                    title="Review History" 
                    icon={Clock} 
                    section="reviewHistory"
                    expanded={expandedSections.reviewHistory}
                    onToggle={toggleSection}
                  />
                  {expandedSections.reviewHistory && (
                    <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                      {policyDetails.negotiationHistory.map((item, idx) => (
                        <div key={idx} className="text-sm p-2 bg-white rounded border">
                          <div className="flex justify-between">
                            <span className="font-medium">{item.action}</span>
                            <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                          </div>
                          {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ============================================ */}
              {/* ACTION FORMS */}
              {/* ============================================ */}

              {/* DIRECT APPROVE FORM */}
              {actionType === 'direct_approve' && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800">Direct Approval</p>
                    <p className="text-sm text-green-700">This will approve the policy immediately. The policy will become ACTIVE.</p>
                  </div>
                  <div>
                    <Label>Approval Notes <span className="text-red-500">*</span></Label>
                    <Textarea 
                      value={underwriterNotes} 
                      onChange={(e) => setUnderwriterNotes(e.target.value)} 
                      placeholder="Add approval notes..." 
                      rows={3} 
                      className="mt-1" 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleDirectApprove} 
                      disabled={submitting} 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                      Confirm Direct Approval
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* REJECT FORM */}
              {actionType === 'reject' && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-medium text-red-800">Reject Policy</p>
                    <p className="text-sm text-red-700">This will reject the policy application. The customer will be notified.</p>
                  </div>
                  <div>
                    <Label>Rejection Reason <span className="text-red-500">*</span></Label>
                    <Textarea 
                      value={rejectReason} 
                      onChange={(e) => setRejectReason(e.target.value)} 
                      placeholder="Provide clear reason for rejection..." 
                      rows={3} 
                      className="mt-1" 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleRejectPolicy} 
                      disabled={submitting} 
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
                      Confirm Rejection
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* FINAL APPROVE FORM */}
              {actionType === 'final_approve' && (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <p className="font-medium text-purple-800">Final Approval</p>
                    <p className="text-sm text-purple-700">This will final approve the policy. The policy will become ACTIVE and the customer will be notified.</p>
                  </div>
                  <div>
                    <Label>Approval Notes <span className="text-red-500">*</span></Label>
                    <Textarea 
                      value={underwriterNotes} 
                      onChange={(e) => setUnderwriterNotes(e.target.value)} 
                      placeholder="Add final approval notes..." 
                      rows={3} 
                      className="mt-1" 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleFinalApprove} 
                      disabled={submitting} 
                      className="flex-1 bg-purple-600 hover:bg-purple-700"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Confirm Final Approval
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </>
              )}

              {/* ADJUST FORM */}
              {actionType === 'adjust' && (
                <>
                  <div>
                    <Label>Adjusted Premium (ETB) <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      value={adjustedPremium} 
                      onChange={(e) => setAdjustedPremium(e.target.value)} 
                      className="mt-1" 
                    />
                    <p className="text-xs text-gray-500 mt-1">Original: ETB {policyDetails.premium?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Message to Customer <span className="text-red-500">*</span></Label>
                    <Textarea 
                      value={underwriterNotes} 
                      onChange={(e) => setUnderwriterNotes(e.target.value)} 
                      placeholder="Explain the premium adjustment..." 
                      rows={3} 
                      className="mt-1" 
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button 
                      onClick={handleAdjustPremium} 
                      disabled={submitting} 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Adjustment
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* ENDORSEMENT DETAIL MODAL */}
      {/* ============================================ */}
      {selectedEndorsement && (
        <Dialog open={!!selectedEndorsement} onOpenChange={() => setSelectedEndorsement(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Endorsement Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Policy Number</label>
                  <p className="mt-1">{selectedEndorsement.policyNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p className="mt-1">{selectedEndorsement.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Type</label>
                  <p className="mt-1">{selectedEndorsement.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="mt-1">{new Date(selectedEndorsement.submittedDate).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Changes Requested</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <pre className="text-sm whitespace-pre-wrap">
                    {typeof selectedEndorsement.changes === 'string' 
                      ? selectedEndorsement.changes 
                      : JSON.stringify(selectedEndorsement.changes, null, 2)}
                  </pre>
                </div>
              </div>
              
              {selectedEndorsement.reason && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Reason</label>
                  <p className="mt-1 text-gray-700">{selectedEndorsement.reason}</p>
                </div>
              )}
              
              {!permissions.canApproveEndorsements && (
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Lock className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">You have view-only access for endorsements</p>
                  <p className="text-xs text-gray-400">Approval requires Senior Officer or higher role</p>
                </div>
              )}
              
              {permissions.canApproveEndorsements && (
                <div className="flex gap-3 pt-4">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700" 
                    onClick={() => {
                      handleApproveEndorsement(selectedEndorsement.id);
                      setSelectedEndorsement(null);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 text-red-600 hover:text-red-700" 
                    onClick={() => {
                      handleRejectEndorsement(selectedEndorsement.id);
                      setSelectedEndorsement(null);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}