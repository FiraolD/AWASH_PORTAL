import * as React from 'react';
import { Search, Eye, MessageCircle, Clock, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface ActiveClaim {
  id: string;
  claimNumber: string;
  customerName: string;
  type: string;
  amount: number;
  status: string;
  progress: number;
  adjusterName: string;
  submittedDate: string;
}

export default function ActiveClaimsPage() {
  const [claims, setClaims] = React.useState<ActiveClaim[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { token } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchActiveClaims();
  }, []);

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchActiveClaims = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/claims/active`, {
        headers: getAuthHeaders()
      });
      setClaims(response.data);
    } catch (error) {
      console.error('Failed to fetch active claims:', error);
      toast.error('Failed to load active claims');
    } finally {
      setLoading(false);
    }
  };

  const getProgressByStatus = (status: string): number => {
    switch(status) {
      case 'SUBMITTED': return 25;
      case 'UNDER_REVIEW': return 50;
      case 'APPROVED': return 75;
      case 'PAID': return 100;
      default: return 0;
    }
  };

  const filteredClaims = claims.filter(claim =>
    claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading active claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Active Claims</h1>
          <p className="text-gray-500 mt-1">Track and manage claims in progress</p>
        </div>
        <Button onClick={fetchActiveClaims} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Active Claims ({claims.length})</CardTitle>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search claims..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredClaims.length === 0 ? <div className="text-center py-8 text-gray-500">No active claims found</div> : (
            filteredClaims.map((claim) => (
              <div key={claim.id} className="p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div><p className="font-semibold text-[#111827]">{claim.claimNumber}</p><p className="text-sm text-gray-500">{claim.customerName} • {claim.type}</p></div>
                  <Badge className="bg-blue-100 text-blue-800">{claim.status.replace('_', ' ')}</Badge>
                </div>
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm"><span>Progress</span><span className="font-semibold">{getProgressByStatus(claim.status)}%</span></div>
                  <Progress value={getProgressByStatus(claim.status)} className="h-2" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-gray-500"><Clock className="h-4 w-4" /><span>Adjuster: {claim.adjusterName || 'Unassigned'}</span></div>
                  <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => navigate(`/claims-admin/queue`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="sm"><MessageCircle className="h-4 w-4" /></Button></div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}