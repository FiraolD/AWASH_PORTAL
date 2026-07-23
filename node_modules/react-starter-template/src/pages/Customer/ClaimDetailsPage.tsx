import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, FileText, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, MapPin, DollarSign, User, Phone, Mail, Car, Users, Cloud,
  Key, Hash, Wrench, Truck, Briefcase, CreditCard, Home, Loader2, Copy, Check,
  Shield, RefreshCw, MessageSquare, FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { Separator } from '../../components/ui/Separator';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import axiosInstance from '../../lib/axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface VehicleDetail {
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  engineNumber?: string;
  chassisNumber?: string;
  vehicleType?: string;
  vehicleValue?: number;
  registrationNumber?: string;
}

interface InjuredPerson {
  name: string;
  age: number;
  injuryType: string;
  hospitalName: string;
}

interface ClaimDetail {
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
  timeOfAccident?: string;
  vehicleDamageDetails?: string;
  
  // Witness Information
  witnessName?: string;
  witnessPhone?: string;
  witnessStatement?: string;
  
  // Driver Information
  driverFullName?: string;
  driverAge?: number;
  driverOccupation?: string;
  driverLicenseNumber?: string;
  driverLicenseIssueDate?: string;
  driverLicenseExpiryDate?: string;
  
  // Injured Persons
  injuredPersons?: InjuredPerson[];
  
  // Environmental Conditions
  roadConditions?: string;
  weatherConditions?: string;
  responsibleParty?: string;
  
  // Officer Review
  proximateCause?: string;
  officerRemarks?: string;
  reviewedAt?: string;
  assignedOfficer?: string | null;   // UUID of assigned officer
  assignedOfficerName?: string;
  
  // Policy Info
  policyNumber?: string;
  policyType?: string;
  coverageAmount?: number;
  premium?: number;
  effectiveDate?: string;
  expirationDate?: string;
  
  // Vehicle Details
  vehicleDetails?: VehicleDetail;
  vehicles?: VehicleDetail[];
  
  // Customer Info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
}


const StatusBadge = ({ status }: { status?: string }) => {
  const s = status?.toLowerCase();
  if (s === 'submitted') {
    return <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">Submitted</Badge>;
  }
  if (s === 'under_review') {
    return <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">Under Review</Badge>;
  }
  if (s === 'approved') {
    return <Badge className="bg-green-100 text-green-800 text-sm px-3 py-1">Approved</Badge>;
  }
  if (s === 'paid') {
    return <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">Paid</Badge>;
  }
  if (s === 'rejected') {
    return <Badge className="bg-red-100 text-red-800 text-sm px-3 py-1">Rejected</Badge>;
  }
  return <Badge className="bg-gray-100 text-gray-800 text-sm px-3 py-1">{status || 'Unknown'}</Badge>;
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value?: string | number; icon?: any }) => (
  <div className="flex items-start gap-2 p-2 border-b last:border-0">
    {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />}
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium text-sm">{value || 'N/A'}</p>
    </div>
  </div>
);

export default function ClaimDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token, user } = useAuthStore();
  const [claim, setClaim] = useState<ClaimDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [updating, setUpdating] = useState(false);

  // UUID validation regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const copyClaimNumber = () => {
    if (claim?.claimNumber) {
      navigator.clipboard.writeText(claim.claimNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Claim number copied!');
    }
  };

    const fetchClaimDetails = async () => {
    // Extra safety: if id is invalid, don't fetch
    if (!id || !uuidRegex.test(id)) {
      navigate('/claims', { replace: true });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/claims/${id}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('Failed to fetch claim details');
      const data = await response.json();
      setClaim(data);
    } catch (error) {
      console.error('Failed to fetch claim details:', error);
      toast.error('Failed to load claim details');
    } finally {
      setLoading(false);
    }
  };
  const updateStatus = async (newStatus: string) => {
    if (!claim) return;
    setUpdating(true);
    try {
      await axiosInstance.patch(`/claims/${claim.id}/status`, {
        status: newStatus,
        notes: `Status updated to ${newStatus} by officer`
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Claim ${newStatus.toLowerCase()} successfully`);
      await fetchClaimDetails();
    } catch (error: any) {
      console.error('Failed to update status:', error);
      toast.error(error.response?.data?.error || 'Failed to update claim status');
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    // Validate UUID immediately on mount
    if (!id || !uuidRegex.test(id)) {
      toast.error('Invalid claim ID');
      navigate('/claims', { replace: true });
      return;
    }
    fetchClaimDetails();
  }, [id]);

  const getStatusIcon = () => {
    const s = claim?.status?.toLowerCase();
    if (s === 'submitted') return <Clock className="h-16 w-16 text-yellow-500" />;
    if (s === 'under_review') return <AlertCircle className="h-16 w-16 text-blue-500" />;
    if (s === 'approved') return <CheckCircle2 className="h-16 w-16 text-green-500" />;
    if (s === 'paid') return <FileCheck className="h-16 w-16 text-purple-500" />;
    if (s === 'rejected') return <XCircle className="h-16 w-16 text-red-500" />;
    return <FileText className="h-16 w-16 text-gray-500" />;
  };

  // Check if current user is the assigned officer
  const isAssignedOfficer = claim?.assignedOfficer === user?.id;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#1A3E6F] mx-auto mb-4" />
          <p className="text-gray-500">Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-red-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-700">Claim Not Found</h2>
        <p className="text-gray-500 mt-2">The claim you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => navigate('/claims')} className="mt-6 bg-[#1A3E6F]">
          Back to Claims
        </Button>
      </div>
    );
  }

  const hasVehicleDetails = claim.vehicleDetails || (claim.vehicles && claim.vehicles.length > 0);
  const hasDriverInfo = claim.driverFullName || claim.driverLicenseNumber;
  const hasWitnessInfo = claim.witnessName || claim.witnessPhone;
  const hasEnvironmentalInfo = claim.roadConditions || claim.weatherConditions;
  const hasInjuredPersons = claim.injuredPersons && claim.injuredPersons.length > 0;
  const hasOfficerReview = claim.proximateCause || claim.officerRemarks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button variant="ghost" onClick={() => navigate('/claims')} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Claims
        </Button>
        <div className="flex items-center gap-3">
          <StatusBadge status={claim.status} />
          {isAssignedOfficer && (
            <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
              <Shield className="h-3 w-3" /> Assigned to You
            </Badge>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <Card className="bg-gradient-to-r from-[#1A3E6F] to-[#2a5a9f] text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <p className="text-sm opacity-80">Claim Reference Number</p>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-mono tracking-wider">{claim.claimNumber}</h1>
                  <button 
                    onClick={copyClaimNumber}
                    className="p-1 hover:bg-white/20 rounded transition-colors"
                    title="Copy claim number"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-sm opacity-80 mt-1">
                  Submitted on {new Date(claim.submittedDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Estimated Amount</p>
              <p className="text-2xl font-bold">ETB {claim.estimatedAmount?.toLocaleString() || '0'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Actions (only if assigned) */}
      {isAssignedOfficer && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Officer Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {claim.status === 'SUBMITTED' && (
                <Button 
                  onClick={() => updateStatus('UNDER_REVIEW')} 
                  disabled={updating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Clock className="h-4 w-4 mr-2" />}
                  Start Review
                </Button>
              )}
              {(claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW') && (
                <>
                  <Button 
                    onClick={() => updateStatus('APPROVED')} 
                    disabled={updating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                  <Button 
                    onClick={() => updateStatus('REJECTED')} 
                    disabled={updating}
                    variant="destructive"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                </>
              )}
              {claim.status === 'APPROVED' && (
                <Button 
                  onClick={() => updateStatus('PAID')} 
                  disabled={updating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                  Mark as Paid
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={fetchClaimDetails} 
                disabled={updating}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
            </div>
            {updating && <p className="text-sm text-gray-600 mt-2">Processing...</p>}
          </CardContent>
        </Card>
      )}

      {!isAssignedOfficer && claim.assignedOfficer && (
        <Card className="border-2 border-gray-200 bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertCircle className="h-5 w-5" />
              <p>You are not assigned to this claim. Review actions are disabled.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incident">Incident Details</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle Info</TabsTrigger>
          <TabsTrigger value="review">Officer Review</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* Policy Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Policy Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Policy Number" value={claim.policyNumber} icon={FileText} />
                <InfoRow label="Policy Type" value={claim.policyType} icon={FileText} />
                <InfoRow label="Coverage Amount" value={`ETB ${claim.coverageAmount?.toLocaleString()}`} icon={DollarSign} />
                <InfoRow label="Risk Item" value={claim.riskItem} icon={AlertCircle} />
                {claim.effectiveDate && (
                  <InfoRow label="Effective Date" value={new Date(claim.effectiveDate).toLocaleDateString()} icon={Calendar} />
                )}
                {claim.expirationDate && (
                  <InfoRow label="Expiration Date" value={new Date(claim.expirationDate).toLocaleDateString()} icon={Calendar} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Your Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Full Name" value={`${claim.firstName || ''} ${claim.lastName || ''}`.trim()} icon={User} />
                <InfoRow label="Email" value={claim.email} icon={Mail} />
                <InfoRow label="Phone" value={claim.phone} icon={Phone} />
                <InfoRow label="Address" value={claim.address} icon={Home} />
              </div>
            </CardContent>
          </Card>

          {/* Claim Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Claim Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Nature of Loss" value={claim.natureOfLoss} icon={AlertCircle} />
                <InfoRow label="Incident Date" value={new Date(claim.incidentDate).toLocaleDateString()} icon={Calendar} />
                <InfoRow label="Incident Location" value={claim.location} icon={MapPin} />
                <InfoRow label="Estimated Amount" value={`ETB ${claim.estimatedAmount?.toLocaleString()}`} icon={DollarSign} />
                <InfoRow label="Submitted Date" value={new Date(claim.submittedDate).toLocaleString()} icon={Clock} />
                <InfoRow label="Last Updated" value={new Date(claim.updatedAt).toLocaleString()} icon={Clock} />
              </div>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-gray-500 mb-2">Incident Description</p>
                <p className="text-gray-700">{claim.incidentDescription}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Incident Details */}
        <TabsContent value="incident" className="space-y-4">
          {/* Accident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Accident Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow label="Place of Accident" value={claim.location} icon={MapPin} />
                <InfoRow label="Date of Accident" value={new Date(claim.incidentDate).toLocaleDateString()} icon={Calendar} />
                {claim.timeOfAccident && (
                  <InfoRow label="Time of Accident" value={claim.timeOfAccident} icon={Clock} />
                )}
                <InfoRow label="Nature of Loss" value={claim.natureOfLoss} icon={AlertCircle} />
              </div>
            </CardContent>
          </Card>

          {/* Driver Information */}
          {hasDriverInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Driver Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Driver Full Name" value={claim.driverFullName} icon={User} />
                  <InfoRow label="Driver Age" value={claim.driverAge?.toString()} icon={Calendar} />
                  <InfoRow label="Driver Occupation" value={claim.driverOccupation} icon={Briefcase} />
                  <InfoRow label="Driver License Number" value={claim.driverLicenseNumber} icon={CreditCard} />
                  {claim.driverLicenseIssueDate && (
                    <InfoRow label="License Issue Date" value={new Date(claim.driverLicenseIssueDate).toLocaleDateString()} icon={Calendar} />
                  )}
                  {claim.driverLicenseExpiryDate && (
                    <InfoRow label="License Expiry Date" value={new Date(claim.driverLicenseExpiryDate).toLocaleDateString()} icon={Calendar} />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vehicle Damage */}
          {claim.vehicleDamageDetails && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="h-5 w-5" />
                  Damage Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{claim.vehicleDamageDetails}</p>
              </CardContent>
            </Card>
          )}

          {/* Injured Persons */}
          {hasInjuredPersons && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Injured Persons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {claim.injuredPersons?.map((person, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <p className="font-semibold">{person.name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2 text-sm">
                        <InfoRow label="Age" value={person.age?.toString()} />
                        <InfoRow label="Injury Type" value={person.injuryType} />
                        <InfoRow label="Hospital" value={person.hospitalName} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Witness Information */}
          {hasWitnessInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Witness Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Witness Name" value={claim.witnessName} icon={User} />
                  <InfoRow label="Witness Phone" value={claim.witnessPhone} icon={Phone} />
                </div>
                {claim.witnessStatement && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-500 mb-1">Witness Statement</p>
                    <p className="text-gray-700">{claim.witnessStatement}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Environmental Conditions */}
          {hasEnvironmentalInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Environmental Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow label="Road Conditions" value={claim.roadConditions} />
                  <InfoRow label="Weather Conditions" value={claim.weatherConditions} />
                  <InfoRow label="Responsible Party (Your Opinion)" value={claim.responsibleParty} />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Vehicle Information */}
        <TabsContent value="vehicle" className="space-y-4">
          {hasVehicleDetails ? (
            <>
              {/* Main Vehicle Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Car className="h-5 w-5" />
                    Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(claim.vehicles && claim.vehicles.length > 0 ? claim.vehicles : [claim.vehicleDetails]).map((vehicle, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoRow label="Make" value={vehicle?.make} icon={Car} />
                        <InfoRow label="Model" value={vehicle?.model} icon={Car} />
                        <InfoRow label="Year" value={vehicle?.year?.toString()} icon={Calendar} />
                        <InfoRow label="Vehicle Type" value={vehicle?.vehicleType} icon={Truck} />
                        <InfoRow label="Plate Number" value={vehicle?.plateNumber || vehicle?.registrationNumber} icon={Key} />
                        <InfoRow label="Engine Number" value={vehicle?.engineNumber} icon={Wrench} />
                        <InfoRow label="Chassis Number (VIN)" value={vehicle?.chassisNumber} icon={Hash} />
                        <InfoRow label="Vehicle Value" value={`ETB ${vehicle?.vehicleValue?.toLocaleString()}`} icon={DollarSign} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No vehicle information available for this claim</p>
                <p className="text-sm text-gray-400 mt-1">This claim may be related to a non-motor policy type.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: Officer Review */}
        <TabsContent value="review" className="space-y-4">
          {hasOfficerReview ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Officer Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Proximate Cause of Loss</p>
                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">{claim.proximateCause}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Officer Remarks</p>
                    <p className="text-gray-700 mt-1 bg-gray-50 p-3 rounded-lg">{claim.officerRemarks}</p>
                  </div>
                  {claim.assignedOfficerName && (
                    <InfoRow label="Assigned Officer" value={claim.assignedOfficerName} icon={User} />
                  )}
                  {claim.reviewedAt && (
                    <InfoRow label="Review Date" value={new Date(claim.reviewedAt).toLocaleString()} icon={Calendar} />
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Your claim is being reviewed by our claims officer.</p>
                <p className="text-sm text-gray-400 mt-1">You will receive an update once the review is complete.</p>
              </CardContent>
            </Card>
          )}

          {/* Claim Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Claim Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Claim Submitted</p>
                    <p className="text-sm text-gray-500">{new Date(claim.submittedDate).toLocaleString()}</p>
                  </div>
                </div>
                
                {claim.reviewedAt && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Claim Reviewed</p>
                      <p className="text-sm text-gray-500">{new Date(claim.reviewedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {claim.status === 'APPROVED' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Claim Approved</p>
                      <p className="text-sm text-gray-500">{new Date(claim.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {claim.status === 'PAID' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Claim Paid</p>
                      <p className="text-sm text-gray-500">{new Date(claim.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                {claim.status === 'REJECTED' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">Claim Rejected</p>
                      <p className="text-sm text-gray-500">{new Date(claim.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}