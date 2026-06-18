// frontend/src/pages/customer/PolicyDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download, 
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Home,
  Car,
  Heart,
  Briefcase,
  FileCheck,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface PolicyDetail {
  id: string;
  policyNumber: string;
  type: string;
  status: string;
  coverageAmount: number;
  premium: number;
  createdAt: string;
  effectiveDate: string;
  expirationDate: string;
  policyDocumentPath?: string;
  productDetails?: {
    vehicles?: Array<{
      make: string;
      model: string;
      year: number;
      registrationNumber: string;
      vehicleValue: number;
      engineNumber?: string;
      chassisNumber?: string;
    }>;
  };
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  productName?: string;
}

export default function PolicyDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = useAuthStore();
  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

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

  const fetchPolicyDetails = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/policies/${id}/details`, {
        headers: getAuthHeaders()
      });
      setPolicy(response.data);
    } catch (error) {
      console.error('Failed to fetch policy details:', error);
      toast.error('Failed to load policy details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPolicy = async () => {
    if (!policy?.policyDocumentPath) {
      toast.error('No policy document available for download');
      return;
    }
    
    setDownloading(true);
    try {
      const response = await axios.get(`${API_URL}/policies/${id}/download`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `policy_${policy.policyNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Policy document downloaded successfully');
    } catch (error) {
      console.error('Failed to download policy:', error);
      toast.error('Failed to download policy document');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchPolicyDetails();
    }
  }, [id]);

  const getStatusBadge = (status: string) => {
    const statusUpper = status?.toUpperCase() || '';
    if (statusUpper === 'ACTIVE') {
      return <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">Active</Badge>;
    }
    if (statusUpper === 'PENDING_UNDERWRITING') {
      return <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">Pending Underwriting</Badge>;
    }
    if (statusUpper === 'AWAITING_CUSTOMER_APPROVAL') {
      return <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">Awaiting Your Approval</Badge>;
    }
    if (statusUpper === 'PENDING_FINAL_APPROVAL') {
      return <Badge className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1">Pending Final Approval</Badge>;
    }
    if (statusUpper === 'REJECTED_BY_CUSTOMER' || statusUpper === 'REJECTED_BY_UNDERWRITER') {
      return <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">Rejected</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 text-sm px-3 py-1">{status}</Badge>;
  };

  const getPolicyTypeIcon = (type: string) => {
    const typeUpper = type?.toUpperCase() || '';
    if (typeUpper === 'AUTO' || typeUpper === 'MTCM' || typeUpper === 'MOTOR') {
      return <Car className="h-6 w-6 text-blue-500" />;
    }
    if (typeUpper === 'HOME' || typeUpper === 'PROPERTY') {
      return <Home className="h-6 w-6 text-green-500" />;
    }
    if (typeUpper === 'LIFE') {
      return <Heart className="h-6 w-6 text-purple-500" />;
    }
    if (typeUpper === 'HEALTH') {
      return <Heart className="h-6 w-6 text-red-500" />;
    }
    return <ShieldCheck className="h-6 w-6 text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1A3E6F] mx-auto mb-4" />
          <p className="text-gray-500">Loading policy details...</p>
        </div>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700">Policy Not Found</h2>
        <p className="text-gray-500 mt-2">The policy you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/customer/policies')} className="mt-6 bg-[#1A3E6F]">
          Back to Policies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
        </Button>
        {policy.policyDocumentPath && (
          <Button 
            variant="outline" 
            onClick={handleDownloadPolicy}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Policy
          </Button>
        )}
      </div>

      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-[#1A3E6F] to-[#2C5282] text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 bg-white/10 rounded-xl">
              {getPolicyTypeIcon(policy.type)}
            </div>
            <div>
              <p className="text-sm opacity-80">Policy Number</p>
              <h1 className="text-2xl font-bold font-mono tracking-wider">{policy.policyNumber}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(policy.status)}
                <span className="text-sm opacity-80">Issued on {new Date(policy.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="coverage">Coverage Details</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Policy Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Policy Number</p>
                  <p className="font-medium">{policy.policyNumber}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Policy Type</p>
                  <p className="font-medium capitalize">{policy.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium">{getStatusBadge(policy.status)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Product Name</p>
                  <p className="font-medium">{policy.productName || policy.type}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Coverage Amount</p>
                  <p className="text-2xl font-bold text-[#1A3E6F]">ETB {policy.coverageAmount?.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Annual Premium</p>
                  <p className="text-2xl font-bold text-green-600">ETB {policy.premium?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Policy Dates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Effective Date</p>
                  <p className="font-medium">{policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Expiration Date</p>
                  <p className="font-medium">{policy.expirationDate ? new Date(policy.expirationDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Policyholder Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Policyholder Name</p>
                  <p className="font-medium">{policy.firstName} {policy.lastName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{policy.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{policy.phone || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Coverage Details */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Coverage Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Coverage Amount</p>
                  <p className="text-2xl font-bold text-blue-900">ETB {policy.coverageAmount?.toLocaleString()}</p>
                  <p className="text-xs text-blue-600 mt-1">This is the maximum amount payable for a covered loss</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-800 font-medium">Annual Premium</p>
                  <p className="text-2xl font-bold text-green-900">ETB {policy.premium?.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1">Payment due annually on the effective date</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Vehicles */}
        <TabsContent value="vehicles" className="space-y-4">
          {policy.productDetails?.vehicles && policy.productDetails.vehicles.length > 0 ? (
            policy.productDetails.vehicles.map((vehicle, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle {idx + 1}: {vehicle.make} {vehicle.model}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Make</p>
                      <p className="font-medium">{vehicle.make}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Model</p>
                      <p className="font-medium">{vehicle.model}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Year</p>
                      <p className="font-medium">{vehicle.year}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Registration Number</p>
                      <p className="font-medium">{vehicle.registrationNumber}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Engine Number</p>
                      <p className="font-medium">{vehicle.engineNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Chassis Number</p>
                      <p className="font-medium">{vehicle.chassisNumber || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-500">Vehicle Value</p>
                      <p className="font-medium">ETB {vehicle.vehicleValue?.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No vehicle information available</p>
                <p className="text-sm text-gray-400 mt-1">This policy may not be a motor policy.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}