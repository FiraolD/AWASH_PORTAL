// frontend/src/pages/admin/MasterAdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { 
  Users, FileText, Shield, DollarSign, Activity, 
  RefreshCw, TrendingUp, Clock, CheckCircle, AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface DashboardStats {
  totalCustomers: number;
  totalPolicies: number;
  totalClaims: number;
  totalPremium: number;
  activePolicies: number;
  pendingClaims: number;
  totalRevenue: number;
  newCustomersThisMonth: number;
}

interface Activity {
  id: string;
  type: 'claim' | 'policy';
  claimNumber?: string;
  policyNumber?: string;
  action: string;
  user: string;
  timestamp: string;
  status: string;
}

export default function MasterAdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalPolicies: 0,
    totalClaims: 0,
    totalPremium: 0,
    activePolicies: 0,
    pendingClaims: 0,
    totalRevenue: 0,
    newCustomersThisMonth: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      try {
        const parsed = JSON.parse(stored);
        authToken = parsed.state?.token;
      } catch (e) {}
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      
      console.log('Stats response:', statsResponse.data);
      
      // Handle both array and object responses
      if (statsResponse.data && typeof statsResponse.data === 'object') {
        setStats({
          totalCustomers: statsResponse.data.totalCustomers || 0,
          totalPolicies: statsResponse.data.totalPolicies || 0,
          totalClaims: statsResponse.data.totalClaims || 0,
          totalPremium: statsResponse.data.totalPremium || 0,
          activePolicies: statsResponse.data.activePolicies || 0,
          pendingClaims: statsResponse.data.pendingClaims || 0,
          totalRevenue: statsResponse.data.totalRevenue || 0,
          newCustomersThisMonth: statsResponse.data.newCustomersThisMonth || 0
        });
      }
      
      // Fetch activities
      const activitiesResponse = await axios.get(`${API_URL}/dashboard/activities`, {
        headers: getAuthHeaders()
      });
      
      console.log('Activities response:', activitiesResponse.data);
      
      // Handle different response formats
      let activitiesData: Activity[] = [];
      
      if (Array.isArray(activitiesResponse.data)) {
        activitiesData = activitiesResponse.data;
      } else if (activitiesResponse.data && Array.isArray(activitiesResponse.data.activities)) {
        activitiesData = activitiesResponse.data.activities;
      } else if (activitiesResponse.data && typeof activitiesResponse.data === 'object') {
        // If it's an object with activities property
        activitiesData = activitiesResponse.data.activities || [];
      }
      
      setActivities(activitiesData);
      
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
      // Set empty arrays to prevent errors
      setActivities([]);
    } finally {
      setLoading(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount);
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase() || '';
    if (statusUpper === 'ACTIVE') return 'bg-green-100 text-green-800';
    if (statusUpper === 'SUBMITTED') return 'bg-blue-100 text-blue-800';
    if (statusUpper === 'UNDER_REVIEW') return 'bg-yellow-100 text-yellow-800';
    if (statusUpper === 'APPROVED') return 'bg-green-100 text-green-800';
    if (statusUpper === 'REJECTED') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Master Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">System overview and key metrics</p>
        </div>
        <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Customers</p>
                <p className="text-2xl font-bold text-[#1A3E6F]">{stats.totalCustomers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Policies</p>
                <p className="text-2xl font-bold text-[#1A3E6F]">{stats.totalPolicies}</p>
                <p className="text-xs text-gray-400">Active: {stats.activePolicies}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Claims</p>
                <p className="text-2xl font-bold text-[#1A3E6F]">{stats.totalClaims}</p>
                <p className="text-xs text-gray-400">Pending: {stats.pendingClaims}</p>
              </div>
              <Shield className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Premium</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPremium)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activities || activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activities</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{activity.action}</p>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      By {activity.user} • {getTimeAgo(activity.timestamp)}
                    </p>
                    {(activity.claimNumber || activity.policyNumber) && (
                      <p className="text-xs text-gray-400 mt-1">
                        Reference: {activity.claimNumber || activity.policyNumber}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}