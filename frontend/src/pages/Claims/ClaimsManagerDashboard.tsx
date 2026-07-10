import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock, FileText, RefreshCw, Search, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface ClaimSummary {
  id: string;
  claimNumber: string;
  status: string;
  estimatedAmount?: number;
  submittedDate?: string;
  incidentDescription?: string;
  firstName?: string;
  lastName?: string;
  policyNumber?: string;
  policyType?: string;
  type?: string;
}

interface TeamMember {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  assigned?: number;
  approved?: number;
  rejected?: number;
  avgTime?: number;
}

interface StatsState {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  paid: number;
  avgProcessingDays: number;
}

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 0 }).format(value || 0);

const getStatusBadge = (status?: string) => {
  const normalized = (status || '').toUpperCase();
  switch (normalized) {
    case 'SUBMITTED':
      return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>;
    case 'UNDER_REVIEW':
      return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
    case 'APPROVED':
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    case 'PAID':
      return <Badge className="bg-purple-100 text-purple-800">Paid</Badge>;
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status || 'Unknown'}</Badge>;
  }
};

export default function ClaimsManagerDashboard() {
  const [stats, setStats] = useState<StatsState>({ total: 0, pending: 0, underReview: 0, approved: 0, rejected: 0, paid: 0, avgProcessingDays: 0 });
  const [queueClaims, setQueueClaims] = useState<ClaimSummary[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const normalizeClaim = (raw: any): ClaimSummary => ({
    id: raw.id,
    claimNumber: raw.claimNumber || 'N/A',
    status: raw.status || 'UNKNOWN',
    estimatedAmount: raw.estimatedAmount || raw.amount || raw.estimated_amount,
    submittedDate: raw.submittedDate || raw.submitted_date,
    incidentDescription: raw.incidentDescription || raw.description || raw.natureOfLoss,
    firstName: raw.firstName || raw.customerFirstName,
    lastName: raw.lastName || raw.customerLastName,
    policyNumber: raw.policyNumber,
    policyType: raw.policyType || raw.type,
    type: raw.type || raw.policyType,
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const timestamp = Date.now();
      const [statsRes, queueRes, teamRes, activitiesRes] = await Promise.all([
        axiosInstance.get(`/claims/stats/summary?_=${timestamp}`),
        axiosInstance.get(`/claims/queue?_=${timestamp}`),
        axiosInstance.get(`/claims/team-performance?_=${timestamp}`),
        axiosInstance.get(`/claims/recent-activities?_=${timestamp}`),
      ]);
      setStats({
        total: statsRes.data?.total || 0,
        pending: statsRes.data?.pending || 0,
        underReview: statsRes.data?.underReview || 0,
        approved: statsRes.data?.approved || 0,
        rejected: statsRes.data?.rejected || 0,
        paid: statsRes.data?.paid || 0,
        avgProcessingDays: statsRes.data?.avgProcessingDays || 0,
      });
      setQueueClaims(Array.isArray(queueRes.data) ? queueRes.data.map(normalizeClaim) : []);
      setTeamMembers(Array.isArray(teamRes.data) ? teamRes.data : []);
      setRecentActivities(Array.isArray(activitiesRes.data) ? activitiesRes.data : []);
    } catch (error) {
      console.error('Failed to load manager dashboard data', error);
      toast.error('Unable to load the manager dashboard right now');
    } finally {
      if (!silent) setLoading(false);
      if (silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = window.setInterval(() => fetchData(true), 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const filteredQueue = useMemo(() => queueClaims.filter((claim) => {
    const term = searchTerm.toLowerCase();
    return claim.claimNumber.toLowerCase().includes(term) ||
      `${claim.firstName || ''} ${claim.lastName || ''}`.toLowerCase().includes(term) ||
      (claim.incidentDescription || '').toLowerCase().includes(term);
  }), [queueClaims, searchTerm]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData(true);
  };

  if (loading) {
    return <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500">Loading management dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Management Dashboard</h1>
          <p className="text-sm text-gray-500">Live operations overview for claims leadership</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search queue" className="pl-10" />
          </div>
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' },
          { label: 'Under Review', value: stats.underReview, icon: AlertCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{item.label}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.bg}`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Queue Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredQueue.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500">No claims in queue.</p>
            ) : filteredQueue.map((claim) => (
              <div key={claim.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#1A3E6F]">{claim.claimNumber}</p>
                    <p className="text-sm text-gray-500">{[claim.firstName, claim.lastName].filter(Boolean).join(' ') || 'Unknown customer'} • {claim.policyType || claim.type || 'Policy'}</p>
                  </div>
                  {getStatusBadge(claim.status)}
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between text-sm text-gray-500">
                  <span>{claim.incidentDescription || 'No description provided'}</span>
                  <span>{formatCurrency(claim.estimatedAmount)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamMembers.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">No team performance data yet.</p>
              ) : teamMembers.map((member) => (
                <div key={member.id} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">{[member.firstName, member.lastName].filter(Boolean).join(' ') || 'Team member'}</p>
                    <Badge className="bg-blue-100 text-blue-800">{member.assigned || 0} assigned</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Approved: {member.approved || 0} • Rejected: {member.rejected || 0}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">No recent activity yet.</p>
              ) : recentActivities.map((activity, index) => (
                <div key={`${activity.claimNumber || index}`} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{activity.claimNumber || 'Claim activity'}</p>
                    <Badge className="bg-gray-100 text-gray-700">{activity.status || 'Updated'}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{activity.action || 'Claim updated'} • {activity.user || 'System'}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
