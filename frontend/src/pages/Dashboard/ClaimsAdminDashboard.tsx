import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock, CheckCircle, AlertCircle, TrendingUp, Users, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface ClaimsStats {
  pendingClaims: number;
  approvedClaims: number;
  totalClaims: number;
  avgProcessingDays: number;
}

const ClaimsAdminDashboard = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<ClaimsStats>({
    pendingClaims: 0,
    approvedClaims: 0,
    totalClaims: 0,
    avgProcessingDays: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data;
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      title: 'Pending Claims', 
      value: stats.pendingClaims, 
      icon: Clock, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100',
      description: 'Awaiting review'
    },
    { 
      title: 'Approved (Monthly)', 
      value: stats.approvedClaims, 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      description: 'Claims approved this month'
    },
    { 
      title: 'Total Claims', 
      value: stats.totalClaims, 
      icon: AlertCircle, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      description: 'All time claims'
    },
    { 
      title: 'Avg Processing', 
      value: `${stats.avgProcessingDays} days`, 
      icon: TrendingUp, 
      color: 'text-purple-600', 
      bg: 'bg-purple-100',
      description: 'Average processing time'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Claims Admin Dashboard</h1>
        <p className="text-gray-500">Manage and track insurance claims</p>
        <p className="text-sm text-gray-400 mt-1">Welcome back, {user?.firstName}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`h-10 w-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{card.title}</p>
                <h3 className="text-2xl font-bold">{card.value}</h3>
                <p className="text-xs text-gray-400 mt-1">{card.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Button onClick={() => navigate('/claims-admin/queue')} className="bg-blue-600 hover:bg-blue-700">
          <Clock className="mr-2 h-4 w-4" />
          Review Pending Claims
        </Button>
        <Button onClick={() => navigate('/claims')} variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          View All Claims
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Claims Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Recent claims will appear here</p>
            <Button variant="link" onClick={() => navigate('/claims-admin/queue')} className="mt-2">
              Go to Claim Queue →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// MAKE SURE THIS DEFAULT EXPORT EXISTS
export default ClaimsAdminDashboard;