// frontend/src/pages/customer/PolicyDetailsPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, ShieldCheck, Calendar, DollarSign, FileText, Download,
  CheckCircle2, AlertCircle, Clock, CreditCard, Home, Car, Heart,
  Briefcase, FileCheck, Loader2, ChevronRight, User, Plane, Package,
  Ship, MapPin, Phone, Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Separator } from '../../components/ui/Separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RiskObjectField {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'date';
}

interface RiskObjectConfig {
  type: string;
  label: string;
  icon: React.ReactNode;
  dataKey: string; // Key in productDetails that holds the array
  fields: RiskObjectField[];
}

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
  productDetails?: any;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  productName?: string;
  selectedPerils?: any[];
  selectedRiders?: any[];
  adjustedPremium?: number;
  totalPremium?: number;
}

// ---------------------------------------------------------------------------
// Risk Object Configurations by Product Type
// ---------------------------------------------------------------------------
const RISK_OBJECT_CONFIGS: Record<string, RiskObjectConfig> = {
  MOTOR: {
    type: 'MOTOR',
    label: 'Vehicles',
    icon: <Car className="h-5 w-5" />,
    dataKey: 'vehicles',
    fields: [
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'yearOfMake', label: 'Year' },
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'engineNumber', label: 'Engine Number' },
      { key: 'chassisNumber', label: 'Chassis Number' },
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'usage', label: 'Usage' },
      { key: 'vehicleValue', label: 'Vehicle Value', type: 'currency' },
    ],
  },
  MTCM: {
    type: 'MTCM',
    label: 'Vehicles',
    icon: <Car className="h-5 w-5" />,
    dataKey: 'vehicles',
    fields: [
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'yearOfMake', label: 'Year' },
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'engineNumber', label: 'Engine Number' },
      { key: 'chassisNumber', label: 'Chassis Number' },
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'usage', label: 'Usage' },
      { key: 'vehicleValue', label: 'Vehicle Value', type: 'currency' },
    ],
  },
  AUTO: {
    type: 'AUTO',
    label: 'Vehicles',
    icon: <Car className="h-5 w-5" />,
    dataKey: 'vehicles',
    fields: [
      { key: 'make', label: 'Make' },
      { key: 'model', label: 'Model' },
      { key: 'yearOfMake', label: 'Year' },
      { key: 'plateNumber', label: 'Plate Number' },
      { key: 'engineNumber', label: 'Engine Number' },
      { key: 'chassisNumber', label: 'Chassis Number' },
      { key: 'vehicleType', label: 'Vehicle Type' },
      { key: 'usage', label: 'Usage' },
      { key: 'vehicleValue', label: 'Vehicle Value', type: 'currency' },
    ],
  },
  HEALTH: {
    type: 'HEALTH',
    label: 'Insured Persons',
    icon: <User className="h-5 w-5" />,
    dataKey: 'insuredPersons',
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age' },
      { key: 'idNumber', label: 'ID Number' },
      { key: 'relationship', label: 'Relationship to Policy Holder' },
      { key: 'medicalConditions', label: 'Pre-existing Conditions' },
      {key: 'height', label: 'Height' },
      {key: 'weight', label: 'Weight' },
      {key: 'bloodPressure', label: 'Blood Pressure' },
      {key: 'occupation', label: 'Occupation' },
      {key: 'smokerStatus', label: 'Smoker Status' },      
      { key: 'relationship', label: 'Relationship to Policy Holder' },
      { key: 'medicalConditions', label: 'Pre-existing Conditions' },
    ],
  },
  LIFE: {
    type: 'LIFE',
    label: 'Insured Person',
    icon: <Heart className="h-5 w-5" />,
    dataKey: 'insuredPersons',
    fields: [
      { key: 'fullName', label: 'Full Name' },
      { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
      { key: 'gender', label: 'Gender' },
      { key: 'age', label: 'Age' },
      { key: 'idNumber', label: 'ID Number' },
      { key: 'relationship', label: 'Relationship to Policy Holder' },
      { key: 'medicalConditions', label: 'Pre-existing Conditions' },
      {key: 'height', label: 'Height' },
      {key: 'weight', label: 'Weight' },
      {key: 'bloodPressure', label: 'Blood Pressure' },
      {key: 'occupation', label: 'Occupation' },
      {key: 'smokerStatus', label: 'Smoker Status' },      
      { key: 'relationship', label: 'Relationship to Policy Holder' },
      { key: 'medicalConditions', label: 'Pre-existing Conditions' },
      { key: 'beneficiaryName', label: 'Beneficiary Name' },
      { key: 'beneficiaryRelationship', label: 'Beneficiary Relationship' },
      { key: 'beneficiaryPhone', label: 'Beneficiary Phone' },
    ],
  },
  FIRE: {
    type: 'FIRE',
    label: 'Property Details',
    icon: <Home className="h-5 w-5" />,
    dataKey: 'properties',
    fields: [
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'constructionType', label: 'Construction Type' },
      { key: 'yearBuilt', label: 'Year Built' },
      { key: 'numberOfFloors', label: 'Number of Floors' },
      { key: 'propertyValue', label: 'Property Value', type: 'currency' },
    ],
  },
  PROPERTY: {
    type: 'PROPERTY',
    label: 'Property Details',
    icon: <Home className="h-5 w-5" />,
    dataKey: 'properties',
    fields: [
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'propertyValue', label: 'Property Value', type: 'currency' },
    ],
  },
  HOME: {
    type: 'HOME',
    label: 'Property Details',
    icon: <Home className="h-5 w-5" />,
    dataKey: 'properties',
    fields: [
      { key: 'propertyAddress', label: 'Property Address' },
      { key: 'propertyType', label: 'Property Type' },
      { key: 'propertyValue', label: 'Property Value', type: 'currency' },
    ],
  },
  TRAVEL: {
    type: 'TRAVEL',
    label: 'Travel Details',
    icon: <Plane className="h-5 w-5" />,
    dataKey: 'trips',
    fields: [
      { key: 'destination', label: 'Destination' },
      { key: 'departureDate', label: 'Departure Date', type: 'date' },
      { key: 'returnDate', label: 'Return Date', type: 'date' },
      { key: 'tripDuration', label: 'Trip Duration (Days)' },
      { key: 'numberOfTravelers', label: 'Number of Travelers' },
      { key: 'travelPurpose', label: 'Travel Purpose' },
    ],
  },
  MARINE: {
    type: 'MARINE',
    label: 'Cargo Details',
    icon: <Ship className="h-5 w-5" />,
    dataKey: 'cargo',
    fields: [
      { key: 'cargoType', label: 'Cargo Type' },
      { key: 'cargoDescription', label: 'Description' },
      { key: 'cargoValue', label: 'Cargo Value', type: 'currency' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'vesselName', label: 'Vessel Name' },
    ],
  },
  GENERIC: {
    type: 'GENERIC',
    label: 'Covered Risks',
    icon: <ShieldCheck className="h-5 w-5" />,
    dataKey: 'riskObjects',
    fields: [],
  },
};

// ---------------------------------------------------------------------------
// Helper: Get risk config for a product type
// ---------------------------------------------------------------------------
const getRiskConfig = (type: string): RiskObjectConfig => {
  const upperType = type?.toUpperCase() || '';
  return RISK_OBJECT_CONFIGS[upperType] || RISK_OBJECT_CONFIGS.GENERIC;
};

// ---------------------------------------------------------------------------
// Helper: Extract risk objects from productDetails
// ---------------------------------------------------------------------------
const extractRiskObjects = (type: string, productDetails: any): any[] => {
  if (!productDetails) return [];
  
  const config = getRiskConfig(type);
  
  // Direct key lookup
  if (config.dataKey && productDetails[config.dataKey]) {
    return Array.isArray(productDetails[config.dataKey]) 
      ? productDetails[config.dataKey] 
      : [productDetails[config.dataKey]];
  }
  
  // Fallback: check common keys
  const commonKeys = ['vehicles', 'insuredPersons', 'properties', 'trips', 'cargo', 'riskObjects', 'persons'];
  for (const key of commonKeys) {
    if (productDetails[key]) {
      return Array.isArray(productDetails[key]) ? productDetails[key] : [productDetails[key]];
    }
  }
  
  // If productDetails itself has risk object fields (not nested)
  const directKeys = ['make', 'model', 'fullName', 'propertyAddress', 'destination', 'cargoType'];
  if (directKeys.some(key => productDetails[key])) {
    return [productDetails];
  }
  
  return [];
};

// ---------------------------------------------------------------------------
// Helper: Format value
// ---------------------------------------------------------------------------
const formatRiskValue = (value: any, type?: string): string => {
  if (value === undefined || value === null || value === '') return 'N/A';
  if (type === 'currency') return `ETB ${Number(value).toLocaleString()}`;
  if (type === 'date') return new Date(value).toLocaleDateString();
  return String(value);
};

// ---------------------------------------------------------------------------
// Helper: Get product type icon
// ---------------------------------------------------------------------------
const getPolicyTypeIcon = (type: string) => {
  const typeUpper = type?.toUpperCase() || '';
  if (['AUTO', 'MTCM', 'MOTOR'].includes(typeUpper)) return <Car className="h-6 w-6 text-blue-500" />;
  if (['HOME', 'PROPERTY', 'FIRE'].includes(typeUpper)) return <Home className="h-6 w-6 text-green-500" />;
  if (['HEALTH'].includes(typeUpper)) return <Heart className="h-6 w-6 text-red-500" />;
  if (['LIFE'].includes(typeUpper)) return <Heart className="h-6 w-6 text-purple-500" />;
  if (['TRAVEL'].includes(typeUpper)) return <Plane className="h-6 w-6 text-cyan-500" />;
  if (['MARINE'].includes(typeUpper)) return <Ship className="h-6 w-6 text-blue-600" />;
  return <ShieldCheck className="h-6 w-6 text-gray-500" />;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
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
      
      const data = response.data;
      
      // Parse productDetails JSON if it's a string
      let productDetails = data.productDetails;
      if (typeof productDetails === 'string') {
        try { productDetails = JSON.parse(productDetails); } catch { productDetails = {}; }
      }
      
      setPolicy({
        ...data,
        productDetails,
      });
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
    const badges: Record<string, React.ReactNode> = {
      'ACTIVE': <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">Active</Badge>,
      'PENDING_UNDERWRITING': <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">Pending Underwriting</Badge>,
      'AWAITING_CUSTOMER_APPROVAL': <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">Awaiting Your Approval</Badge>,
      'PENDING_FINAL_APPROVAL': <Badge className="bg-indigo-100 text-indigo-800 text-sm px-3 py-1">Pending Final Approval</Badge>,
      'REJECTED': <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">Rejected</Badge>,
    };
    return badges[statusUpper] || <Badge className="bg-gray-100 text-gray-800 text-sm px-3 py-1">{status}</Badge>;
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

  const riskConfig = getRiskConfig(policy.type);
  const riskObjects = extractRiskObjects(policy.type, policy.productDetails);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
        </Button>
        {policy.policyDocumentPath && (
          <Button variant="outline" onClick={handleDownloadPolicy} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
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
          {/* Dynamic 3rd tab based on product type */}
          <TabsTrigger value="risks">
            {riskConfig.icon}
            <span className="ml-2">{riskConfig.label}</span>
          </TabsTrigger>
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
                <div>
                  <p className="text-xs text-gray-500">Policy Number</p>
                  <p className="font-medium">{policy.policyNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Policy Type</p>
                  <p className="font-medium capitalize">{policy.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium">{getStatusBadge(policy.status)}</p>
                </div>
                <div>
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
                <div>
                  <p className="text-xs text-gray-500">Coverage Amount</p>
                  <p className="text-2xl font-bold text-[#1A3E6F]">ETB {policy.coverageAmount?.toLocaleString()}</p>
                </div>
                <div>
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
                <div>
                  <p className="text-xs text-gray-500">Effective Date</p>
                  <p className="font-medium">{policy.effectiveDate ? new Date(policy.effectiveDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expiration Date</p>
                  <p className="font-medium">{policy.expirationDate ? new Date(policy.expirationDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Policyholder Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Policyholder Name</p>
                  <p className="font-medium">{policy.firstName} {policy.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="font-medium">{policy.email}</p>
                </div>
                <div>
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

          {/* Perils */}
          {policy.selectedPerils && policy.selectedPerils.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Covered Perils
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {policy.selectedPerils.map((peril: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{peril.perilName || peril.name}</p>
                        {peril.description && <p className="text-xs text-gray-500">{peril.description}</p>}
                      </div>
                      <Badge variant="outline">ETB {Number(peril.premium || 0).toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Riders */}
          {policy.selectedRiders && policy.selectedRiders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                  Optional Riders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {policy.selectedRiders.map((rider: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{rider.riderName || rider.name}</p>
                        {rider.description && <p className="text-xs text-gray-500">{rider.description}</p>}
                      </div>
                      <Badge variant="outline">ETB {Number(rider.premium || 0).toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Dynamic Risk Objects */}
        <TabsContent value="risks" className="space-y-4">
          {riskObjects.length > 0 ? (
            riskObjects.map((riskObj: any, idx: number) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {riskConfig.icon}
                    {riskConfig.label} {riskObjects.length > 1 ? `#${idx + 1}` : ''}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {riskConfig.fields.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {riskConfig.fields.map((field) => (
                        <div key={field.key}>
                          <p className="text-xs text-gray-500">{field.label}</p>
                          <p className="font-medium">{formatRiskValue(riskObj[field.key], field.type)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      No specific risk details available for this policy type.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  {riskConfig.icon}
                </div>
                <p className="text-gray-500">No {riskConfig.label.toLowerCase()} information available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}