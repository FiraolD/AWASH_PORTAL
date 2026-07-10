import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Calendar, DollarSign, AlertCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/authStore';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface Claim {
  id: string;
  claimNumber: string;
  status: string;
  incidentDate: string;
  estimatedAmount: number;
  policyNumber: string;
  firstName: string;
  lastName: string;
}

export default function ClaimsPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.warning('Please enter a search term');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const response = await axiosInstance.get('/claims/search', {
        params: { q: searchTerm.trim() }
      });
      setClaims(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed. Please try again.');
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      SUBMITTED: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      PAID: 'bg-purple-100 text-purple-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">All Claims</h1>
        <p className="text-gray-500">Search for any claim by number, policy, or customer</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by claim number, policy number, or customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="bg-[#1A3E6F]">
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {hasSearched ? (claims.length > 0 ? `${claims.length} claim(s) found` : 'No claims found') : 'Search to find claims'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasSearched ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>Enter a search term to find claims</p>
            </div>
          ) : loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No claims match your search</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map((claim) => (
                <div
                  key={claim.id}
                  onClick={() => navigate(`/claims/${claim.id}`)}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer hover:border-[#1A3E6F]"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-[#1A3E6F]">{claim.claimNumber}</span>
                      <Badge className={getStatusBadge(claim.status)}>{claim.status}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>Customer: {claim.firstName} {claim.lastName}</span>
                      <span>Policy: {claim.policyNumber}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(claim.incidentDate).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ETB {claim.estimatedAmount?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}