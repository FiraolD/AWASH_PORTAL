import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, TrendingDown, Award, AlertTriangle, DollarSign, 
  Calendar, Target, Shield, Users, BarChart3, PieChart,
  Download, Filter, Loader2, Activity, CheckCircle, XCircle, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface DepartmentStats {
  totalPoliciesYTD: number;
  totalPremiumYTD: number;
  lossRatio: number;
  averagePremium: number;
  acceptanceRate: number;
  rejectionRate: number;
  pendingRate: number;
  newBusinessGrowth: number;
  renewalRate: number;
  departmentSize: number;
  activeOfficers: number;
  activeManagers: number;
}

interface RiskMetric {
  category: string;
  exposure: number;
  claims: number;
  lossRatio: number;
  riskLevel: string;
}

interface MonthlyTrend {
  month: string;
  applications: number;
  approvals: number;
  rejections: number;
  premium: number;
}

export default function UnderwritingHeadDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DepartmentStats>({
    totalPoliciesYTD: 0,
    totalPremiumYTD: 0,
    lossRatio: 0,
    averagePremium: 0,
    acceptanceRate: 0,
    rejectionRate: 0,
    pendingRate: 0,
    newBusinessGrowth: 0,
    renewalRate: 0,
    departmentSize: 0,
    activeOfficers: 0,
    activeManagers: 0
  });
  const [riskMetrics, setRiskMetrics] = useState<RiskMetric[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsResponse = await axiosInstance.get('/underwriting/head/stats', {
        params: { year: selectedYear }
      });
      setStats(statsResponse.data);

      const riskResponse = await axiosInstance.get('/underwriting/head/risk-metrics');
      setRiskMetrics(riskResponse.data);

      const trendsResponse = await axiosInstance.get('/underwriting/head/monthly-trends', {
        params: { year: selectedYear }
      });
      setMonthlyTrends(trendsResponse.data);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `ETB ${(amount / 1000000).toFixed(1)}M`;
    }
    return `ETB ${amount?.toLocaleString() || '0'}`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
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
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Head of Underwriting Dashboard</h1>
          <p className="text-gray-500 mt-1">Strategic underwriting performance and portfolio management</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
              <SelectItem value="2022">2022</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Annual Report
          </Button>
        </div>
      </div>

      {/* Key Metrics Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Premium (YTD)</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPremiumYTD)}</p>
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  {getTrendIcon(stats.newBusinessGrowth)}
                  {stats.newBusinessGrowth}% growth
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Policies (YTD)</p>
                <p className="text-2xl font-bold">{stats.totalPoliciesYTD.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">â†‘ 12% vs last year</p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Loss Ratio</p>
                <p className="text-2xl font-bold">{stats.lossRatio}%</p>
                <p className="text-sm text-yellow-600 mt-1">Target: 65%</p>
              </div>
              <Target className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Renewal Rate</p>
                <p className="text-2xl font-bold">{stats.renewalRate}%</p>
                <p className="text-sm text-green-600 mt-1">â†‘ 5% from target</p>
              </div>
              <Award className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Acceptance Rate</p>
                <p className="text-2xl font-bold text-green-600">{stats.acceptanceRate}%</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejection Rate</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejectionRate}%</p>
              </div>
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Department Size</p>
                <p className="text-2xl font-bold">{stats.departmentSize}</p>
                <p className="text-xs text-gray-400">{stats.activeOfficers} Officers, {stats.activeManagers} Managers</p>
              </div>
              <Users className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Premium</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.averagePremium)}</p>
              </div>
              <DollarSign className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Risk Analysis by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-right">Total Exposure</th>
                  <th className="px-4 py-3 text-right">Claims Incurred</th>
                  <th className="px-4 py-3 text-right">Loss Ratio</th>
                  <th className="px-4 py-3 text-center">Risk Level</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {riskMetrics.map((metric, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-3 font-medium">{metric.category}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(metric.exposure)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(metric.claims)}</td>
                    <td className="px-4 py-3 text-right font-medium">{metric.lossRatio}%</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        metric.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                        metric.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }>
                        {metric.riskLevel}
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

      {/* Monthly Trends Chart (Simplified Table View) */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends - {selectedYear}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-right">Applications</th>
                  <th className="px-4 py-3 text-right">Approvals</th>
                  <th className="px-4 py-3 text-right">Rejections</th>
                  <th className="px-4 py-3 text-right">Premium Volume</th>
                  <th className="px-4 py-3 text-center">Approval Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyTrends.map((trend, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-3 font-medium">{trend.month}</td>
                    <td className="px-4 py-3 text-right">{trend.applications}</td>
                    <td className="px-4 py-3 text-right text-green-600">{trend.approvals}</td>
                    <td className="px-4 py-3 text-right text-red-600">{trend.rejections}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(trend.premium)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={
                        trend.approvals / trend.applications > 0.7 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }>
                        {Math.round((trend.approvals / trend.applications) * 100)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Strategic Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline">Review Underwriting Guidelines</Button>
          <Button variant="outline">Approve High-Value Policies (&gt;5M ETB)</Button>
          <Button variant="outline">Department Performance Report</Button>
          <Button variant="outline">Risk Assessment Review</Button>
          <Button variant="outline">Quarterly Strategy Meeting</Button>
          <Button variant="outline">Team Training Schedule</Button>
        </CardContent>
      </Card>
    </div>
  );
}
