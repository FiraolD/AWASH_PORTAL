import { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle, CheckCircle, DollarSign, BarChart3, Clock, RefreshCw, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface DashboardStats {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
}

interface QueueStats {
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
  total: number;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  assigned: number;
  approved: number;
  rejected: number;
  avgTime: number;
}

interface ClaimQueueItem {
  id: string;
  claimNumber: string;
  status: string;
  incidentDate: string;
  estimatedAmount: number;
  submittedDate: string;
  natureOfLoss: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  policyNumber: string;
  type: string;
}

export default function ClaimsManagerDashboard() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    paid: 0
  });
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    paid: 0,
    total: 0
  });
  const [teamPerformance, setTeamPerformance] = useState<TeamMember[]>([]);
  const [recentClaims, setRecentClaims] = useState<ClaimQueueItem[]>([]);

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch claim statistics
      const statsResponse = await axios.get(`${API_URL}/claims/stats/summary`, {
        headers: getAuthHeaders()
      });
      setStats(statsResponse.data);
      
      // Fetch queue statistics
      const queueStatsResponse = await axios.get(`${API_URL}/claims/queue/stats`, {
        headers: getAuthHeaders()
      });
      setQueueStats(queueStatsResponse.data);
      
      // Fetch claim queue for recent claims
      const queueResponse = await axios.get(`${API_URL}/claims/queue`, {
        headers: getAuthHeaders()
      });
      setRecentClaims(queueResponse.data.slice(0, 10));
      
      // Fetch team performance based on claim officers
      await fetchTeamPerformance();
      
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPerformance = async () => {
    try {
      // Fetch all claim officers
      const usersResponse = await axios.get(`${API_URL}/users?role=CLAIM_OFFICER`, {
        headers: getAuthHeaders()
      });
      
      const claimOfficers = usersResponse.data.filter((user: any) => 
        user.role === 'CLAIM_OFFICER' || 
        user.role === 'CLAIM_OFFICER_I' || 
        user.role === 'CLAIM_OFFICER_II' ||
        user.role === 'SENIOR_CLAIM_OFFICER'
      );
      
      // Get claim statistics for each officer
      const performanceData = await Promise.all(
        claimOfficers.map(async (officer: any) => {
          try {
            const claimsResponse = await axios.get(`${API_URL}/claims?assignedTo=${officer.id}`, {
              headers: getAuthHeaders()
            });
            
            const claims = claimsResponse.data;
            const assigned = claims.length;
            const approved = claims.filter((c: any) => c.status === 'APPROVED' || c.status === 'PAID').length;
            const rejected = claims.filter((c: any) => c.status === 'REJECTED').length;
            
            // Calculate average processing time (simplified for now)
            const avgTime = 3.5; // This would need more complex calculation
            
            return {
              id: officer.id,
              firstName: officer.firstName || 'N/A',
              lastName: officer.lastName || 'N/A',
              email: officer.email,
              role: officer.role,
              assigned,
              approved,
              rejected,
              avgTime
            };
          } catch (err) {
            console.error(`Failed to fetch claims for officer ${officer.id}:`, err);
            return {
              id: officer.id,
              firstName: officer.firstName || 'N/A',
              lastName: officer.lastName || 'N/A',
              email: officer.email,
              role: officer.role,
              assigned: 0,
              approved: 0,
              rejected: 0,
              avgTime: 0
            };
          }
        })
      );
      
      setTeamPerformance(performanceData);
    } catch (error) {
      console.error('Failed to fetch team performance:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast.success('Dashboard refreshed');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>;
      case 'under_review':
        return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'paid':
        return <Badge className="bg-purple-100 text-purple-800">Paid</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'Unknown'}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `ETB ${(amount / 1000000).toFixed(1)}M`;
    }
    return `ETB ${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1A3E6F] mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Oversee team performance and claim approvals</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Claims</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
              <BarChart3 className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{queueStats.pending || stats.pending}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Under Review</p>
                <p className="text-xl font-bold text-blue-600">{queueStats.underReview || stats.underReview}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Approved</p>
                <p className="text-xl font-bold text-green-600">{stats.approved}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Rejected</p>
                <p className="text-xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Paid</p>
                <p className="text-xl font-bold text-purple-600">{stats.paid}</p>
              </div>
              <DollarSign className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamPerformance.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No team members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Officer</th>
                    <th className="px-4 py-2 text-center">Role</th>
                    <th className="px-4 py-2 text-center">Assigned</th>
                    <th className="px-4 py-2 text-center">Approved</th>
                    <th className="px-4 py-2 text-center">Rejected</th>
                    <th className="px-4 py-2 text-center">Success Rate</th>
                    <th className="px-4 py-2 text-center">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPerformance.map((member, idx) => {
                    const successRate = member.assigned > 0 
                      ? Math.round((member.approved / member.assigned) * 100) 
                      : 0;
                    return (
                      <tr key={member.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                          {member.firstName} {member.lastName}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge variant="outline" className="text-xs">
                            {member.role?.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center">{member.assigned}</td>
                        <td className="px-4 py-2 text-center text-green-600">{member.approved}</td>
                        <td className="px-4 py-2 text-center text-red-600">{member.rejected}</td>
                        <td className="px-4 py-2 text-center font-medium">{successRate}%</td>
                        <td className="px-4 py-2 text-center">
                          <Badge className={
                            successRate >= 70 
                              ? 'bg-green-100 text-green-800' 
                              : successRate >= 50 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'
                          }>
                            {successRate >= 70 ? 'Excellent' : successRate >= 50 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Claims Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recent Claims Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentClaims.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No pending claims</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Claim Number</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-center">Policy</th>
                    <th className="px-4 py-2 text-center">Amount</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    <th className="px-4 py-2 text-center">Submitted</th>
                    <th className="px-4 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClaims.map((claim) => (
                    <tr key={claim.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{claim.claimNumber}</td>
                      <td className="px-4 py-2">
                        {claim.firstName} {claim.lastName}
                      </td>
                      <td className="px-4 py-2 text-center">{claim.policyNumber}</td>
                      <td className="px-4 py-2 text-center">
                        {formatCurrency(claim.estimatedAmount || 0)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {getStatusBadge(claim.status)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {new Date(claim.submittedDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => window.location.href = `/claims/${claim.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}