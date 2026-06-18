import { useState } from 'react';
import { FileText, CheckCircle, Clock, AlertTriangle, Users, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';

export default function ClaimsOfficerDashboard() {
  const [stats] = useState({
    assignedClaims: 12,
    pendingReview: 5,
    approvedToday: 3,
    totalProcessed: 47
  });

  const [recentClaims] = useState([
    { id: 'CLM-001', customer: 'John Doe', amount: 50000, status: 'PENDING', daysOld: 2 },
    { id: 'CLM-002', customer: 'Jane Smith', amount: 125000, status: 'UNDER_REVIEW', daysOld: 1 },
    { id: 'CLM-003', customer: 'Mike Johnson', amount: 35000, status: 'PENDING', daysOld: 3 },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Officer Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage and process assigned claims</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Assigned Claims</p>
                <p className="text-2xl font-bold">{stats.assignedClaims}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved Today</p>
                <p className="text-2xl font-bold text-green-600">{stats.approvedToday}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Processed</p>
                <p className="text-2xl font-bold">{stats.totalProcessed}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Claims */}
      <Card>
        <CardHeader>
          <CardTitle>My Assigned Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentClaims.map((claim) => (
              <div key={claim.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">{claim.id}</p>
                  <p className="text-sm text-gray-500">{claim.customer}</p>
                </div>
                <div>
                  <p className="font-medium">ETB {claim.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{claim.daysOld} days old</p>
                </div>
                <Badge className={claim.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}>
                  {claim.status}
                </Badge>
                <Button size="sm">Process</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}