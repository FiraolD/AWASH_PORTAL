import React, { useEffect, useState } from 'react';
import { 
  Users, TrendingUp, Clock, CheckCircle, XCircle, BarChart3, 
  Eye, DollarSign, Calendar, Award, AlertTriangle, FileText,
  Download, Filter, ChevronDown, Loader2, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  pendingReviews: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  averageProcessingTime: number;
  totalValue: number;
}

interface DashboardStats {
  teamMembers: number;
  pendingReviews: number;
  approvedThisWeek: number;
  rejectedThisWeek: number;
  averageProcessingTime: number;
  totalExposure: number;
  departmentEfficiency: number;
}

interface RecentActivity {
  id: string;
  policyNumber: string;
  type: string;
  customerName: string;
  amount: number;
  action: string;
  officer: string;
  time: string;
}

export default function UnderwritingManagerDashboard() {
  const { user } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    teamMembers: 0,
    pendingReviews: 0,
    approvedThisWeek: 0,
    rejectedThisWeek: 0,
    averageProcessingTime: 0,
    totalExposure: 0,
    departmentEfficiency: 0
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch team performance
      const teamResponse = await axiosInstance.get('/underwriting/manager/team-performance');
      setTeamMembers(teamResponse.data);

      // Fetch stats
      const statsResponse = await axiosInstance.get('/underwriting/manager/stats', {
        params: { range: timeRange }
      });
      setStats(statsResponse.data);

      // Fetch recent activities
      const activitiesResponse = await axiosInstance.get('/underwriting/manager/recent-activities');
      setRecentActivities(activitiesResponse.data);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `ETB ${amount?.toLocaleString() || '0'}`;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600';
    if (efficiency >= 60) return 'text-yellow-600';
    return 'text-red-600';
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Manager Dashboard</h1>
          <p className="text-gray-500 mt-1">Monitor team performance and underwriting metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Team Members</p>
                <p className="text-xl font-bold">{stats.teamMembers}</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Pending Reviews</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pendingReviews}</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Approved</p>
                <p className="text-xl font-bold text-green-600">{stats.approvedThisWeek}</p>
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
                <p className="text-xl font-bold text-red-600">{stats.rejectedThisWeek}</p>
              </div>
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Avg Processing</p>
                <p className="text-xl font-bold">{stats.averageProcessingTime} days</p>
              </div>
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Department Efficiency</p>
                <p className={`text-xl font-bold ${getEfficiencyColor(stats.departmentEfficiency)}`}>
                  {stats.departmentEfficiency}%
                </p>
              </div>
              <Award className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Officer</th>
                  <th className="px-4 py-3 text-center">Role</th>
                  <th className="px-4 py-3 text-center">Pending</th>
                  <th className="px-4 py-3 text-center">Approved</th>
                  <th className="px-4 py-3 text-center">Rejected</th>
                  <th className="px-4 py-3 text-center">Avg Time</th>
                  <th className="px-4 py-3 text-right">Total Value</th>
                  <th className="px-4 py-3 text-center">Performance</th>
                  <th className="px-4 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">
                      {member.firstName} {member.lastName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline" className="text-xs">
                        {member.role?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center text-yellow-600">{member.pendingReviews}</td>
                    <td className="px-4 py-3 text-center text-green-600">{member.approvedThisWeek}</td>
                    <td className="px-4 py-3 text-center text-red-600">{member.rejectedThisWeek}</td>
                    <td className="px-4 py-3 text-center">{member.averageProcessingTime} days</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(member.totalValue)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        member.averageProcessingTime < 2.5 
                          ? 'bg-green-100 text-green-800' 
                          : member.averageProcessingTime < 4 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }>
                        {member.averageProcessingTime < 2.5 ? 'Excellent' : 
                         member.averageProcessingTime < 4 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    {activity.type === 'approval' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : activity.type === 'rejection' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{activity.policyNumber}</p>
                    <p className="text-xs text-gray-500">
                      {activity.action} by {activity.officer}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(activity.amount)}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}