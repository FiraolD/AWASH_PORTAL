import React, { useEffect, useState } from 'react';
import { 
  FileCheck, 
  AlertTriangle, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  DollarSign,
  MessageSquare,
  Send,
  Loader2,
  Shield,
  TrendingUp,
  Activity,
  Award,
  BarChart3,
  Lock
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  createdAt: string;
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
  type: string;
  changes: any;
  reason: string;
  status: string;
  submittedDate: string;
}

interface DashboardStats {
  pendingReviews: number;
  pendingFinalApprovals: number;
  pendingEndorsements: number;
  policiesThisMonth: number;
  totalActivePolicies: number;
  approvalRate: number;
}

export default function UnderwritingOfficersDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('queue');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingReviews: 0,
    pendingFinalApprovals: 0,
    pendingEndorsements: 0,
    policiesThisMonth: 0,
    totalActivePolicies: 0,
    approvalRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedEndorsement, setSelectedEndorsement] = useState<Endorsement | null>(null);
  const [adjustedPremium, setAdjustedPremium] = useState('');
  const [underwriterNotes, setUnderwriterNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Role-based access control
  const userRole = user?.role?.toUpperCase() || '';
  
  // Define role levels
  const isOfficerLevel1 = userRole === 'UNDERWRITING_OFFICER_I';
  const isOfficerLevel2 = userRole === 'UNDERWRITING_OFFICER_II';
  const isSeniorOfficer = userRole === 'SENIOR_UNDERWRITING_OFFICER';
  const isManager = userRole === 'UNDERWRITING_MANAGER';
  const isHead = userRole === 'UNDERWRITING_HEAD';
  const isAdmin = userRole === 'UNDERWRITING_ADMIN' || userRole === 'MASTER_ADMIN';
  
  // Permission flags
  const canViewAllTabs = true; // All underwriting officers can view all tabs
  const canAdjustPremium = true; // All underwriting officers can adjust premiums
  const canApproveEndorsements = isSeniorOfficer || isManager || isHead || isAdmin;
  const canApproveFinalPolicy = isManager || isHead || isAdmin;
  const canBulkApprove = isManager || isHead || isAdmin;
  
  // For Officer I - they can VIEW but not APPROVE
  const canApprove = !isOfficerLevel1;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await axiosInstance.get('/underwriting/stats');
      setStats(statsResponse.data);

      // Fetch pending policies for review
      const policiesResponse = await axiosInstance.get('/underwriting/pending-review');
      setPolicies(policiesResponse.data);

      // Fetch risk assessments
      const riskResponse = await axiosInstance.get('/underwriting/risk-assessments');
      setRiskAssessments(riskResponse.data);

      // Fetch endorsements
      const endorsementsResponse = await axiosInstance.get('/underwriting/endorsements');
      setEndorsements(endorsementsResponse.data);

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

  const handleApproveEndorsement = async (id: string) => {
    if (!canApproveEndorsements) {
      toast.error('You do not have permission to approve endorsements');
      return;
    }
    
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
    if (!canApproveEndorsements) {
      toast.error('You do not have permission to reject endorsements');
      return;
    }
    
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

  const getRiskBadge = (score: number, level: string) => {
    if (score >= 70 || level === 'HIGH') {
      return { label: 'High Risk', color: 'bg-red-100 text-red-800', icon: TrendingUp };
    } else if (score >= 40 || level === 'MEDIUM') {
      return { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle };
    } else {
      return { label: 'Low Risk', color: 'bg-green-100 text-green-800', icon: CheckCircle };
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

  // Get role display name
  const getRoleDisplayName = () => {
    switch (userRole) {
      case 'UNDERWRITING_OFFICER_I': return 'Underwriting Officer I (View Only)';
      case 'UNDERWRITING_OFFICER_II': return 'Underwriting Officer II';
      case 'SENIOR_UNDERWRITING_OFFICER': return 'Senior Underwriting Officer';
      case 'UNDERWRITING_MANAGER': return 'Underwriting Manager';
      case 'UNDERWRITING_HEAD': return 'Head of Underwriting';
      case 'UNDERWRITING_ADMIN': return 'Underwriting Administrator';
      default: return userRole || 'Underwriting Officer';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Role Badge */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Manage policy reviews and risk assessments</p>
            <Badge className="bg-blue-100 text-blue-800">
              {getRoleDisplayName()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReviews}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Final Approval</p>
                <p className="text-2xl font-bold text-purple-600">{stats.pendingFinalApprovals}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Endorsements</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pendingEndorsements}</p>
              </div>
              <FileText className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Policies This Month</p>
                <p className="text-2xl font-bold text-blue-600">{stats.policiesThisMonth}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Policies</p>
                <p className="text-2xl font-bold text-green-600">{stats.totalActivePolicies}</p>
              </div>
              <Shield className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs - All underwriting officers can view all tabs */}
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

        {/* Policy Queue Tab */}
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
        </TabsContent>

        {/* Risk Assessment Tab - All officers can view */}
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

        {/* Endorsements Tab - All officers can view, but only senior can approve/reject */}
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
                          {!canApproveEndorsements && (
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
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedEndorsement(endorsement)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {canApproveEndorsements ? (
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

      {/* Premium Adjustment Modal - All officers can adjust premiums */}
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
                  <DollarSign className="h-4 w-4" />
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
                  <MessageSquare className="h-4 w-4" />
                  Message to Customer
                </Label>
                <Textarea
                  value={underwriterNotes}
                  onChange={(e) => setUnderwriterNotes(e.target.value)}
                  placeholder="Explain the premium adjustment..."
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
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Submit Adjustment
                </Button>
                <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Endorsement View Modal (for Officer I - view only) */}
      <Dialog open={!!selectedEndorsement} onOpenChange={() => setSelectedEndorsement(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Endorsement Details</DialogTitle>
          </DialogHeader>
          
          {selectedEndorsement && (
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
              
              {!canApproveEndorsements && (
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Lock className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">You have view-only access for endorsements</p>
                  <p className="text-xs text-gray-400">Approval requires Senior Officer or higher role</p>
                </div>
              )}
              
              {canApproveEndorsements && (
                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => {
                    handleApproveEndorsement(selectedEndorsement.id);
                    setSelectedEndorsement(null);
                  }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700" onClick={() => {
                    handleRejectEndorsement(selectedEndorsement.id);
                    setSelectedEndorsement(null);
                  }}>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}