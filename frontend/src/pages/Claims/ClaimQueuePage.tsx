import * as React from 'react';
import { Clock, CheckCircle, XCircle, Eye, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Claim {
  id: string;
  claimNumber: string;
  customerName: string;
  customerEmail: string;
  type: string;
  amount: number;
  status: string;
  submittedDate: string;
  description: string;
}

export default function ClaimQueuePage() {
  const [claims, setClaims] = React.useState<Claim[]>([]);
  const [stats, setStats] = React.useState({ submitted: 0, underReview: 0, approved: 0, paid: 0 });
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedClaim, setSelectedClaim] = React.useState<Claim | null>(null);
  const [reviewNotes, setReviewNotes] = React.useState('');
  const [isReviewOpen, setIsReviewOpen] = React.useState(false);
  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchData();
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [claimsRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/claims/queue`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/claims/queue/stats`, { headers: getAuthHeaders() })
      ]);
      setClaims(claimsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedClaim) return;
    
    try {
      await axios.patch(`${API_URL}/claims/${selectedClaim.id}/status`,
        { status, notes: reviewNotes },
        { headers: getAuthHeaders() }
      );
      toast.success(`Claim ${status.toLowerCase()}`);
      setIsReviewOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update claim status');
    }
  };

  const openReviewDialog = (claim: Claim) => {
    setSelectedClaim(claim);
    setReviewNotes('');
    setIsReviewOpen(true);
  };

  const filteredClaims = claims.filter(claim =>
    claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'SUBMITTED': return <Badge className="bg-yellow-100 text-yellow-800">Submitted</Badge>;
      case 'UNDER_REVIEW': return <Badge className="bg-blue-100 text-blue-800">Under Review</Badge>;
      case 'APPROVED': return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'PAID': return <Badge className="bg-purple-100 text-purple-800">Paid</Badge>;
      case 'DENIED': return <Badge className="bg-red-100 text-red-800">Denied</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claim Queue</h1>
          <p className="text-gray-500 mt-1">Process and manage incoming claims</p>
        </div>
        <Button onClick={fetchData} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Submitted</p><p className="text-2xl font-bold">{stats.submitted}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Under Review</p><p className="text-2xl font-bold">{stats.underReview}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Approved</p><p className="text-2xl font-bold">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-gray-500">Paid</p><p className="text-2xl font-bold">{stats.paid}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Claims Queue ({claims.length})</CardTitle>
            <div className="relative w-64"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClaims.length === 0 ? <div className="text-center py-8 text-gray-500">No claims found</div> : (
            <div className="space-y-3">
              {filteredClaims.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:shadow-md">
                  <div><p className="font-semibold">{claim.claimNumber}</p><p className="text-sm text-gray-500">{claim.customerName} • {claim.type}</p></div>
                  <div className="text-right"><p className="font-semibold text-[#1A3E6F]">ETB {claim.amount?.toLocaleString() || 0}</p><p className="text-xs text-gray-400">{new Date(claim.submittedDate).toLocaleDateString()}</p></div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(claim.status)}
                    <Button size="sm" variant="outline" onClick={() => openReviewDialog(claim)}><Eye className="mr-2 h-4 w-4" /> Review</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Review Claim</DialogTitle></DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div><p className="text-sm text-gray-500">Claim #</p><p className="font-semibold">{selectedClaim.claimNumber}</p></div>
              <div><p className="text-sm text-gray-500">Customer</p><p className="font-semibold">{selectedClaim.customerName}</p><p className="text-sm">{selectedClaim.customerEmail}</p></div>
              <div><p className="text-sm text-gray-500">Description</p><p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedClaim.description}</p></div>
              <div><p className="text-sm text-gray-500">Amount</p><p className="font-semibold text-[#1A3E6F]">ETB {selectedClaim.amount?.toLocaleString() || 0}</p></div>
              <div><p className="text-sm text-gray-500">Review Notes</p><Textarea rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Add notes..." /></div>
              <div className="flex gap-3">
                {selectedClaim.status === 'SUBMITTED' && <Button className="flex-1 bg-blue-600" onClick={() => updateStatus('UNDER_REVIEW')}><Clock className="mr-2 h-4 w-4" /> Start Review</Button>}
                {selectedClaim.status === 'UNDER_REVIEW' && <><Button className="flex-1 bg-green-600" onClick={() => updateStatus('APPROVED')}><CheckCircle className="mr-2 h-4 w-4" /> Approve</Button><Button variant="outline" className="flex-1 border-red-200 text-red-600" onClick={() => updateStatus('DENIED')}><XCircle className="mr-2 h-4 w-4" /> Deny</Button></>}
                {selectedClaim.status === 'APPROVED' && <Button className="flex-1 bg-purple-600" onClick={() => updateStatus('PAID')}>Mark as Paid</Button>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}