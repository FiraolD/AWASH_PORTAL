import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, AlertTriangle, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function ClaimsHeadDashboard() {
  const [stats] = useState({
    totalClaimsYTD: 2847,
    totalPaidYTD: 15200000,
    lossRatio: 68.5,
    averageSettlementTime: 5.2,
    customerSatisfaction: 87,
    pendingLitigation: 3
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Head of Claims Dashboard</h1>
        <p className="text-gray-500 mt-1">Strategic overview of claims department</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Claims (YTD)</p>
                <p className="text-3xl font-bold">{stats.totalClaimsYTD.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">↑ 12% vs last year</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Total Paid (YTD)</p>
                <p className="text-3xl font-bold">ETB {(stats.totalPaidYTD / 1000000).toFixed(0)}M</p>
                <p className="text-sm text-yellow-600 mt-1">↑ 8% vs budget</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-600">Loss Ratio</p>
                <p className="text-3xl font-bold">{stats.lossRatio}%</p>
                <p className="text-sm text-red-600 mt-1">↑ 3% from target</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Avg Settlement Time</p>
                <p className="text-2xl font-bold">{stats.averageSettlementTime} days</p>
              </div>
              <Calendar className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Customer Satisfaction</p>
                <p className="text-2xl font-bold">{stats.customerSatisfaction}%</p>
              </div>
              <Award className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">Pending Litigation</p>
                <p className="text-2xl font-bold text-red-600">{stats.pendingLitigation}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline">View Department Reports</Button>
          <Button variant="outline">Approve High-Value Claims</Button>
          <Button variant="outline">Review Litigation Cases</Button>
          <Button variant="outline">Export Monthly Report</Button>
        </CardContent>
      </Card>
    </div>
  );
}