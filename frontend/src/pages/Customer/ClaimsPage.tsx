// frontend/src/pages/customer/ClaimsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, Search, ChevronRight, AlertCircle, CheckCircle2, Clock, XCircle, DollarSign, Calendar, Eye, Car, Key, Truck } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  status: string;
  incidentDate: string;
  incidentDescription: string;
  location: string;
  estimatedAmount: number;
  natureOfLoss: string;
  submittedDate: string;
  createdAt: string;
  updatedAt: string;
  riskItem?: string;
  vehicleDetails?: {
    plateNumber?: string;
    engineNumber?: string;
    chassisNumber?: string;
    make?: string;
    model?: string;
    year?: number;
  };
  policyNumber?: string;
  policyType?: string;
}

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) {
    return <Badge variant="outline" className="font-black uppercase text-[9px]">Unknown</Badge>;
  }
  const s = status.toLowerCase();
  if (s === 'pending' || s === 'submitted') {
    return <Badge className="bg-yellow-100 text-yellow-800 font-black uppercase text-[9px]">Submitted</Badge>;
  }
  if (s === 'under_review') {
    return <Badge className="bg-blue-100 text-blue-800 font-black uppercase text-[9px]">Under Review</Badge>;
  }
  if (s === 'approved') {
    return <Badge className="bg-green-100 text-green-800 font-black uppercase text-[9px]">Approved</Badge>;
  }
  if (s === 'paid') {
    return <Badge className="bg-purple-100 text-purple-800 font-black uppercase text-[9px]">Paid</Badge>;
  }
  if (s === 'rejected') {
    return <Badge className="bg-red-100 text-red-800 font-black uppercase text-[9px]">Rejected</Badge>;
  }
  return <Badge className="font-black uppercase text-[9px]">{status}</Badge>;
};

export default function ClaimsPage() {
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/claims`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      // Enrich claims with vehicle details from policy productDetails
      const enrichedClaims = await Promise.all(data.map(async (claim: Claim) => {
        if (claim.policyId) {
          try {
            const policyResponse = await fetch(`${API_URL}/policies/${claim.policyId}`, {
              headers: getAuthHeaders()
            });
            const policy = await policyResponse.json();
            
            // Extract vehicle details from policy productDetails
            let vehicleDetails = {};
            if (policy.productDetails) {
              const productDetails = typeof policy.productDetails === 'string' 
                ? JSON.parse(policy.productDetails) 
                : policy.productDetails;
              
              if (productDetails.vehicles && productDetails.vehicles.length > 0) {
                const vehicle = productDetails.vehicles[0];
                vehicleDetails = {
                  plateNumber: vehicle.plateNumber || vehicle.registrationNumber,
                  engineNumber: vehicle.engineNumber,
                  chassisNumber: vehicle.chassisNumber,
                  make: vehicle.make,
                  model: vehicle.model,
                  year: vehicle.year || vehicle.yearOfMake
                };
              }
            }
            
            return {
              ...claim,
              policyNumber: policy.policyNumber,
              policyType: policy.type,
              vehicleDetails
            };
          } catch (err) {
            console.error('Failed to fetch policy details:', err);
            return claim;
          }
        }
        return claim;
      }));
      
      setClaims(enrichedClaims);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      toast.error('Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Enhanced search function that includes vehicle details
  const filteredClaims = claims.filter((claim) => {
    if (!claim.claimNumber) return false;
    
    const searchLower = search.toLowerCase();
    
    // Search by claim number
    if (claim.claimNumber.toLowerCase().includes(searchLower)) return true;
    
    // Search by incident description
    if (claim.incidentDescription && claim.incidentDescription.toLowerCase().includes(searchLower)) return true;
    
    // Search by nature of loss
    if (claim.natureOfLoss && claim.natureOfLoss.toLowerCase().includes(searchLower)) return true;
    
    // Search by policy number
    if (claim.policyNumber && claim.policyNumber.toLowerCase().includes(searchLower)) return true;
    
    // Search by risk item
    if (claim.riskItem && claim.riskItem.toLowerCase().includes(searchLower)) return true;
    
    // Search by location
    if (claim.location && claim.location.toLowerCase().includes(searchLower)) return true;
    
    // Search by vehicle details (plate number, engine number, chassis number)
    if (claim.vehicleDetails) {
      if (claim.vehicleDetails.plateNumber && claim.vehicleDetails.plateNumber.toLowerCase().includes(searchLower)) return true;
      if (claim.vehicleDetails.engineNumber && claim.vehicleDetails.engineNumber.toLowerCase().includes(searchLower)) return true;
      if (claim.vehicleDetails.chassisNumber && claim.vehicleDetails.chassisNumber.toLowerCase().includes(searchLower)) return true;
      if (claim.vehicleDetails.make && claim.vehicleDetails.make.toLowerCase().includes(searchLower)) return true;
      if (claim.vehicleDetails.model && claim.vehicleDetails.model.toLowerCase().includes(searchLower)) return true;
    }
    
    return false;
  });

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'submitted') return <Clock className="w-5 h-5 text-yellow-600" />;
    if (s === 'under_review') return <AlertCircle className="w-5 h-5 text-blue-600" />;
    if (s === 'approved') return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (s === 'paid') return <DollarSign className="w-5 h-5 text-purple-600" />;
    if (s === 'rejected') return <XCircle className="w-5 h-5 text-red-600" />;
    return <FilePlus className="w-5 h-5 text-gray-600" />;
  };

  const getVehicleInfo = (claim: Claim) => {
    if (!claim.vehicleDetails) return null;
    
    const parts = [];
    if (claim.vehicleDetails.plateNumber) parts.push(`Plate: ${claim.vehicleDetails.plateNumber}`);
    if (claim.vehicleDetails.engineNumber) parts.push(`Engine: ${claim.vehicleDetails.engineNumber.substring(0, 6)}...`);
    if (claim.vehicleDetails.chassisNumber) parts.push(`Chassis: ${claim.vehicleDetails.chassisNumber.substring(0, 6)}...`);
    if (claim.vehicleDetails.make && claim.vehicleDetails.model) {
      parts.push(`${claim.vehicleDetails.make} ${claim.vehicleDetails.model}`);
    }
    
    return parts.length > 0 ? parts.join(' • ') : null;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-black text-[#1a3668]">My Claims</h1>
          <p className="text-muted-foreground font-medium mt-1">Track and manage your insurance claims</p>
        </div>
        <Button 
          onClick={() => navigate('/customer/claims/new')} 
          className="bg-[#1a3668] hover:bg-[#1a3668]/90 text-white font-black h-14 px-8 rounded-xl shadow-xl shadow-[#1a3668]/20 transition-all active:scale-95"
        >
          <FilePlus className="w-5 h-5 mr-2" /> File New Claim
        </Button>
      </div>

      {/* Search Bar with hint */}
      <div>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-4.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by claim number, policy number, plate number, engine number, chassis number, or description..." 
            className="pl-12 h-14 bg-white border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-[#1a3668] shadow-sm font-medium" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <span className="font-semibold">Tip:</span> You can search by claim number, policy number, vehicle plate number, engine number, or chassis number
        </p>
      </div>

      {/* Claims List */}
      <div className="grid gap-4">
        {filteredClaims.length > 0 ? (
          filteredClaims.map((claim) => {
            const vehicleInfo = getVehicleInfo(claim);
            
            return (
              <Card 
                key={claim.id} 
                className="hover:border-[#1a3668]/30 transition-all duration-300 cursor-pointer border-slate-100 shadow-sm hover:shadow-xl overflow-hidden group rounded-2xl"
                onClick={() => navigate(`/customer/claims/${claim.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-6">
                    <div className="w-14 h-14 rounded-2xl bg-[#1a3668]/5 flex items-center justify-center text-[#1a3668] group-hover:bg-[#1a3668] group-hover:text-white transition-all">
                      {getStatusIcon(claim.status)}
                    </div>
                    <div className="ml-5 flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h3 className="text-lg font-black text-[#1a3668]">{claim.claimNumber}</h3>
                        <StatusBadge status={claim.status} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-500">Incident:</span>
                          <span className="font-medium">{new Date(claim.incidentDate).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-500">Amount:</span>
                          <span className="font-medium">ETB {claim.estimatedAmount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FilePlus className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-500">Policy:</span>
                          <span className="font-medium truncate">{claim.policyNumber || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {/* Vehicle Information Row */}
                      {vehicleInfo && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Car className="h-3 w-3" />
                          <span>{vehicleInfo}</span>
                        </div>
                      )}
                      
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-2">
                        {claim.incidentDescription || 'No description'}
                      </p>
                    </div>
                    <div className="text-right hidden md:block mr-6">
                      <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1">Submitted</p>
                      <p className="text-sm font-black text-[#1a3668]">{new Date(claim.submittedDate).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#1a3668] transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-24 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
            <AlertCircle className="w-16 h-16 text-slate-300 mx-auto mb-6" />
            <p className="text-[#1a3668] font-black text-xl">No claims found</p>
            <p className="text-muted-foreground">
              {search ? 'No claims match your search criteria.' : 'You haven\'t filed any claims yet.'}
            </p>
            {!search && (
              <Button 
                onClick={() => navigate('/customer/claims/new')}
                variant="outline" 
                className="mt-6"
              >
                <FilePlus className="w-4 h-4 mr-2" /> File Your First Claim
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}