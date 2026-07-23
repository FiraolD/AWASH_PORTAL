import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { FileText, CheckCircle, AlertTriangle, TrendingUp, Users, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface UnderwritingStats {
  pendingPolicies: number;
  activePolicies: number;
  totalPolicies: number;
  highRiskPolicies: number;
}

const UnderwritingAdminDashboard = () => {
  const { token, user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UnderwritingStats>({
    pendingPolicies: 0,
    activePolicies: 0,
    totalPolicies: 0,
    highRiskPolicies: 0
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
      title: 'Pending Policies', 
      value: stats.pendingPolicies, 
      icon: Clock, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-100',
      description: 'Awaiting underwriting review'
    },
    { 
      title: 'Active Policies', 
      value: stats.activePolicies, 
      icon: CheckCircle, 
      color: 'text-green-600', 
      bg: 'bg-green-100',
      description: 'Currently active policies'
    },
    { 
      title: 'Total Policies', 
      value: stats.totalPolicies, 
      icon: FileText, 
      color: 'text-blue-600', 
      bg: 'bg-blue-100',
      description: 'All time policies'
    },
    { 
      title: 'High Risk', 
      value: stats.highRiskPolicies, 
      icon: AlertTriangle, 
      color: 'text-red-600', 
      bg: 'bg-red-100',
      description: 'Policies needing attention'
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
        <h1 className="text-2xl font-bold text-gray-900">Underwriting Admin Dashboard</h1>
        <p className="text-gray-500">Manage policy underwriting and risk assessment</p>
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
        <Button onClick={() => navigate('/underwriting/queue')} className="bg-blue-600 hover:bg-blue-700">
          <Clock className="mr-2 h-4 w-4" />
          Review Pending Policies
        </Button>
        <Button onClick={() => navigate('/policies')} variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          View All Policies
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Underwriting Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Recent underwriting activities will appear here</p>
            <Button variant="link" onClick={() => navigate('/underwriting/queue')} className="mt-2">
              Go to Policy Queue →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnderwritingAdminDashboard;