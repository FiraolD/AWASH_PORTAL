import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, AlertCircle, MessageSquare, DollarSign, FileText, 
  CheckCircle, Clock, ChevronRight, CreditCard, Headphones,
  FileCheck, TrendingUp, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

// Interfaces defined OUTSIDE the component
interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  coverageAmount: number;
  premium: number;
}

interface Claim {
  id: string;
  claimNumber: string;
  status: string;
  incidentDate: string;
  estimatedAmount: number;
  submittedDate?: string;
}

interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  createdAt?: string;
}

interface PolicyOffer {
  id: string;
  policyNumber: string;
  adjustedPremium: number;
  originalPremium?: number;
  status: string;
  createdAt?: string;
}

// SINGLE export default - remove the duplicate
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [offers, setOffers] = useState<PolicyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activePolicies: 0,
    pendingClaims: 0,
    openTickets: 0,
    totalPaid: 0,
    totalPremium: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    setLoading(true);
    try {
      console.log('=== FETCHING DASHBOARD DATA ===');
      
      // Fetch policies
      const policiesResponse = await axiosInstance.get('/policies/my-policies', {
        headers: getAuthHeaders()
      });
      const policiesData = policiesResponse.data || [];
      setPolicies(policiesData);
      console.log('Policies data:', policiesData);
      
      // Fetch claims - using /claims endpoint
      const claimsResponse = await axiosInstance.get('/claims', {
        headers: getAuthHeaders()
      });
      const claimsData = claimsResponse.data || [];
      setClaims(claimsData);
      console.log('Claims data:', claimsData);
      
      // Fetch tickets
      const ticketsResponse = await axiosInstance.get('/support/tickets', {
        headers: getAuthHeaders()
      });
      const ticketsData = ticketsResponse.data || [];
      setTickets(ticketsData);
      console.log('Tickets data:', ticketsData);
      
      // Fetch pending offers
      const offersResponse = await axiosInstance.get('/policies/pending-decision', {
        headers: getAuthHeaders()
      });
      const offersData = offersResponse.data || [];
      setOffers(offersData);
      console.log('Offers data:', offersData);
      
      // Calculate stats
      const activePoliciesCount = policiesData.filter((p: Policy) => {
        const status = p.status?.toUpperCase();
        return status === 'ACTIVE';
      }).length;
      
      const pendingClaimsCount = claimsData.filter((c: Claim) => {
        const status = c.status?.toUpperCase();
        return ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(status);
      }).length;
      
      const openTicketsCount = ticketsData.filter((t: SupportTicket) => {
        const status = t.status?.toUpperCase();
        return status === 'OPEN' || status === 'IN_PROGRESS';
      }).length;
      
      const totalPremium = policiesData.reduce((sum: number, p: Policy) => {
        const premium = typeof p.premium === 'number' ? p.premium : parseFloat(p.premium) || 0;
        return sum + premium;
      }, 0);
      
      console.log('Calculated stats:', {
        activePoliciesCount,
        pendingClaimsCount,
        openTicketsCount,
        totalPremium
      });
      
      setStats({
        activePolicies: activePoliciesCount,
        pendingClaims: pendingClaimsCount,
        openTickets: openTicketsCount,
        totalPaid: 0,
        totalPremium: totalPremium
      });
      
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const pendingOffers = offers.filter(offer => {
    const status = offer.status?.toUpperCase();
    return status === 'AWAITING_CUSTOMER_APPROVAL' || status === 'PENDING';
  }).length;

  const getStatusColor = (status: string) => {
    const statusUpper = status?.toUpperCase() || '';
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING_UNDERWRITING: 'bg-yellow-100 text-yellow-800',
      AWAITING_CUSTOMER_APPROVAL: 'bg-purple-100 text-purple-800',
      PENDING_FINAL_APPROVAL: 'bg-indigo-100 text-indigo-800',
      REJECTED: 'bg-red-100 text-red-800',
      SUBMITTED: 'bg-blue-100 text-blue-800',
      UNDER_REVIEW: 'bg-orange-100 text-orange-800',
      APPROVED: 'bg-green-100 text-green-800',
      PAID: 'bg-emerald-100 text-emerald-800',
      OPEN: 'bg-red-100 text-red-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800'
    };
    return colors[statusUpper] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status: string, type: 'policy' | 'claim' | 'ticket' = 'policy') => {
    const statusUpper = status?.toUpperCase() || '';
    
    const policyTexts: Record<string, string> = {
      ACTIVE: 'Active',
      AWAITING_CUSTOMER_APPROVAL: 'Awaiting Your Approval',
      PENDING_FINAL_APPROVAL: 'Pending Final Approval',
      PENDING_UNDERWRITING: 'Pending Underwriting',
      REJECTED: 'Rejected'
    };
    
    const claimTexts: Record<string, string> = {
      SUBMITTED: 'Submitted',
      UNDER_REVIEW: 'Under Review',
      APPROVED: 'Approved',
      PAID: 'Paid',
      REJECTED: 'Rejected'
    };
    
    const ticketTexts: Record<string, string> = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      RESOLVED: 'Resolved',
      CLOSED: 'Closed'
    };
    
    if (type === 'policy') return policyTexts[statusUpper] || status;
    if (type === 'claim') return claimTexts[statusUpper] || status;
    return ticketTexts[statusUpper] || status;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A3E6F]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#1A3E6F] to-[#2C5282] rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName || 'Customer'}!</h1>
        <p className="text-blue-100 mt-1">Here's an overview of your insurance portfolio</p>
        {pendingOffers > 0 && (
          <div className="mt-3 flex items-center gap-2 bg-yellow-500/20 rounded-lg p-2">
            <Clock className="h-4 w-4 text-yellow-300" />
            <p className="text-sm">You have {pendingOffers} pending policy offer{pendingOffers !== 1 ? 's' : ''} waiting for your response</p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Policies</p>
                <p className="text-2xl font-bold text-[#1A3E6F]">{stats.activePolicies}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
            {stats.totalPremium > 0 && (
              <p className="text-xs text-gray-400 mt-2">Total Premium: ETB {stats.totalPremium.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        
        <Link to="/customer/claims">
          <Card className="hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Claims</p>
                  <p className={`text-2xl font-bold ${stats.pendingClaims > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                    {stats.pendingClaims}
                  </p>
                </div>
                <AlertCircle className={`h-8 w-8 ${stats.pendingClaims > 0 ? 'text-yellow-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/customer/support">
          <Card className="hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open Tickets</p>
                  <p className={`text-2xl font-bold ${stats.openTickets > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                    {stats.openTickets}
                  </p>
                </div>
                <MessageSquare className={`h-8 w-8 ${stats.openTickets > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/customer/policy-offers">
          <Card className={`hover:shadow-lg transition-all cursor-pointer ${pendingOffers > 0 ? 'border-purple-500 border-2' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Offers</p>
                  <p className={`text-2xl font-bold ${pendingOffers > 0 ? 'text-purple-600' : 'text-gray-400'}`}>
                    {pendingOffers}
                  </p>
                </div>
                <DollarSign className={`h-8 w-8 ${pendingOffers > 0 ? 'text-purple-500' : 'text-gray-300'}`} />
              </div>
              {pendingOffers > 0 && (
                <p className="text-xs text-purple-600 mt-2">Action required!</p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
{/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/customer/policies/new">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed hover:border-blue-400 hover:bg-blue-50">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <p className="font-medium">Buy New Policy</p>
              <p className="text-sm text-gray-500">Get covered today</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/customer/claims/new">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed hover:border-yellow-400 hover:bg-yellow-50">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="font-medium">File a Claim</p>
              <p className="text-sm text-gray-500">Submit new claim</p>
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/customer/support/new">
          <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed hover:border-green-400 hover:bg-green-50">
            <CardContent className="p-6 text-center">
              <Headphones className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="font-medium">Contact Support</p>
              <p className="text-sm text-gray-500">Get help</p>
            </CardContent>
          </Card>
        </Link>
      </div>
      {/* Pending Offers Section */}
      {pendingOffers > 0 && (
        <Card className="border-purple-500 border-2 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between bg-purple-50 rounded-t-xl">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Policy Offers
            </CardTitle>
            <Link to="/customer/policy-offers">
              <Button variant="outline" size="sm" className="border-purple-500 text-purple-600 hover:bg-purple-100">
                Review All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {offers.slice(0, 3).map((offer) => (
                <div key={offer.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <p className="font-medium">{offer.policyNumber}</p>
                    <p className="text-sm text-gray-500">
                      {offer.originalPremium ? `Original: ETB ${offer.originalPremium.toLocaleString()}` : 'New premium offer available'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-purple-600">
                      ETB {offer.adjustedPremium?.toLocaleString()}
                    </p>
                    <Link to="/customer/policy-offers">
                      <Button size="sm" className="mt-1 bg-purple-600 hover:bg-purple-700">
                        Review Offer
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Policies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Policies
          </CardTitle>
          <Link to="/customer/policies">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No policies found</p>
              <Link to="/customer/policies/new">
                <Button className="mt-3 bg-[#1A3E6F]">Buy Your First Policy</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {policies.slice(0, 5).map((policy) => (
                <div 
                  key={policy.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/customer/policies/${policy.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-800">{policy.policyNumber}</p>
                    <p className="text-sm text-gray-500">{policy.type}</p>
                    <p className="text-xs text-gray-400">Coverage: ETB {policy.coverageAmount?.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">ETB {policy.premium?.toLocaleString()}</p>
                    <Badge className={getStatusColor(policy.status)}>{getStatusText(policy.status, 'policy')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Claims */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recent Claims
          </CardTitle>
          <Link to="/customer/claims">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-8">
              <FileCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No claims filed</p>
              <Link to="/customer/claims/new">
                <Button className="mt-3 bg-[#1A3E6F]">File a Claim</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.slice(0, 5).map((claim) => (
                <Link to={`/customer/claims/${claim.id}`} key={claim.id}>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-800">{claim.claimNumber}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(claim.incidentDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">ETB {claim.estimatedAmount?.toLocaleString() || '0'}</p>
                      <Badge className={getStatusColor(claim.status)}>
                        {getStatusText(claim.status, 'claim')}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Support Tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Recent Support Tickets
          </CardTitle>
          <Link to="/customer/support">
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-8">
              <Headphones className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No support tickets</p>
              <Link to="/customer/support/new">
                <Button className="mt-3 bg-[#1A3E6F]">Contact Support</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.slice(0, 5).map((ticket) => (
                <Link to={`/customer/support/${ticket.id}`} key={ticket.id}>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-800">{ticket.ticketNumber}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{ticket.subject}</p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(ticket.status)}>
                        {getStatusText(ticket.status, 'ticket')}
                      </Badge>
                      {ticket.priority === 'high' && (
                        <p className="text-xs text-red-500 mt-1">High Priority</p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      
    </div>
  );
}