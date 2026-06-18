import React, { useEffect, useState } from 'react';
import { 
  DollarSign, MessageSquare, CheckCircle, Eye, Send, Loader2, Zap, 
  Shield, ThumbsUp, XCircle, Ban, User, Phone, Mail, Home, 
  Car, Heart, Briefcase, FileText, Calendar, Clock, AlertCircle,
  Info, ChevronDown, ChevronUp, Package, Truck, Building, ShieldCheck,
  MapPin, Hash, Calendar as CalendarIcon, Wrench, Key, FileCheck,
  Users, Baby, Briefcase as BriefcaseIcon, CreditCard, Flag
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  createdAt: string;
}

interface VehicleDetail {
  make: string;
  model: string;
  year: number;
  registrationNumber: string;
  vehicleValue: number;
  engineNumber?: string;
  chassisNumber?: string;
  plateNumber?: string;
  fuelType?: string;
  seatingCapacity?: number;
  color?: string;
}

interface PolicyDetail {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  adjustedPremium?: number;
  totalPremium?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  effectiveDate?: string;
  expirationDate?: string;
  premiumFrequency?: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;
    dateOfBirth?: string;
    occupation?: string;
    nationality?: string;
    idNumber?: string;
  };
  productDetails?: {
    vehicles?: VehicleDetail[];
    propertyType?: string;
    propertyAddress?: string;
    propertyValue?: number;
    constructionType?: string;
    yearBuilt?: number;
    securityFeatures?: string[];
    floorArea?: number;
    numberOfRooms?: number;
    healthConditions?: string[];
    beneficiaries?: Array<{
      name: string;
      relationship: string;
      percentage: number;
      dateOfBirth?: string;
    }>;
    travelDestination?: string;
    travelDates?: {
      from: string;
      to: string;
    };
    sumInsured?: number;
    purpose?: string;
    previousClaims?: Array<{
      year: number;
      amount: number;
      description: string;
    }>;
  };
  selectedPerils?: Array<{
    id: string;
    perilName: string;
    description: string;
    premium: number;
  }>;
  selectedRiders?: Array<{
    id: string;
    riderName: string;
    description: string;
    premium: number;
    maxLimit?: number;
  }>;
  underwriterNotes?: string;
  negotiationHistory?: Array<{
    timestamp: string;
    action: string;
    notes: string;
    from?: number;
    to?: number;
    underwriterName?: string;
  }>;
}

export default function UnderwriterReviewQueue() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [policyDetails, setPolicyDetails] = useState<PolicyDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [adjustedPremium, setAdjustedPremium] = useState('');
  const [underwriterNotes, setUnderwriterNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'adjust' | 'direct_approve' | 'reject'>('adjust');
  const [expandedSections, setExpandedSections] = useState({
    customerInfo: true,
    riskInputs: true,
    coverageDetails: true,
    vehicles: true,
    propertyDetails: true,
    perils: true,
    riders: true,
    additionalInfo: true,
    previousClaims: true
  });

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed.state?.token;
        if (token) return { Authorization: `Bearer ${token}` };
      } catch (e) {}
    }
    return {};
  };

  const getUserRole = (): string => {
    const stored = localStorage.getItem('awash-auth-storage');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const token = parsed.state?.token;
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.role || '';
        }
      } catch (e) {}
    }
    return '';
  };

  const userRole = getUserRole();

  const canDirectApprove = [
    'MANAGER_UNDERWRITING', 'UNDERWRITING_ADMIN',
    'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING', 'MASTER_ADMIN'
  ].includes(userRole);

  const canReject = [
    'MANAGER_UNDERWRITING', 'UNDERWRITING_ADMIN',
    'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING', 'SENIOR_UNDERWRITER_OFFICER', 'MASTER_ADMIN'
  ].includes(userRole);
  const canReviewAdjust = [
    'MANAGER_UNDERWRITING', 'UNDERWRITING_ADMIN',
    'HEAD_UNDERWRITING', 'SUPERVISOR_UNDERWRITING', 'SENIOR_UNDERWRITING_OFFICER', 'UNDERWRITER_OFFICER I','UNDERWRITER_OFFICER II', 'MASTER_ADMIN'
  ].includes(userRole);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/underwriting/pending-review`, {
        headers: getAuthHeaders()
      });
      setPolicies(response.data);
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicyDetails = async (policyId: string) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_URL}/underwriting/policies/${policyId}`, {
        headers: getAuthHeaders()
      });
      setPolicyDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch policy details:', error);
      toast.error('Failed to load policy details');
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleDirectApprove = async () => {
    if (!underwriterNotes.trim()) {
      toast.error('Please add approval notes before confirming');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/underwriting/policies/${selectedPolicy?.id}/direct-approve`,
        { comments: underwriterNotes },
        { headers: getAuthHeaders() }
      );
      
      toast.success('Policy approved successfully! Policy is now ACTIVE.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setUnderwriterNotes('');
      fetchPolicies();
    } catch (error: any) {
      console.error('Failed to approve policy:', error);
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to approve policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPolicy = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/underwriting/policies/${selectedPolicy?.id}/reject`,
        { reason: rejectReason, comments: rejectReason },
        { headers: getAuthHeaders() }
      );
      
      toast.success('Policy rejected successfully.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setRejectReason('');
      fetchPolicies();
    } catch (error: any) {
      console.error('Failed to reject policy:', error);
      toast.error(error.response?.data?.details || error.response?.data?.error || 'Failed to reject policy');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustedPremium || parseFloat(adjustedPremium) <= 0) {
      toast.error('Please enter a valid premium amount');
      return;
    }
    
    if (!underwriterNotes.trim()) {
      toast.error('Please add notes explaining the premium adjustment');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/underwriting/policies/${selectedPolicy?.id}/adjust`, {
        adjusted_premium: parseFloat(adjustedPremium),
        underwriter_notes: underwriterNotes
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Premium adjustment submitted! Customer will be notified.');
      setSelectedPolicy(null);
      setPolicyDetails(null);
      setAdjustedPremium('');
      setUnderwriterNotes('');
      fetchPolicies();
    } catch (error) {
      console.error('Failed to submit adjustment:', error);
      toast.error('Failed to submit adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = async (policy: Policy, type: 'adjust' | 'direct_approve' | 'reject') => {
    setSelectedPolicy(policy);
    setActionType(type);
    setAdjustedPremium(policy.premium?.toString() || '');
    setUnderwriterNotes('');
    setRejectReason('');
    await fetchPolicyDetails(policy.id);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, icon: Icon, section, count, bgColor = "bg-gray-50" }: any) => (
    <button
      onClick={() => toggleSection(section)}
      className={`w-full flex items-center justify-between p-3 ${bgColor} rounded-lg hover:bg-gray-100 transition-colors`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#1A3E6F]" />
        <span className="font-medium">{title}</span>
        {count !== undefined && count > 0 && (
          <Badge className="bg-[#1A3E6F] text-white ml-2">{count}</Badge>
        )}
      </div>
      {expandedSections[section] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );

  const InfoRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-start gap-2 p-2 border-b last:border-0">
      {Icon && <Icon className="h-4 w-4 text-gray-400 mt-0.5" />}
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-medium text-sm">{value || 'N/A'}</p>
      </div>
    </div>
  );

  const getPolicyTypeIcon = (type: string) => {
    switch(type?.toUpperCase()) {
      case 'MOTOR': return <Car className="h-5 w-5" />;
      case 'AUTO': return <Car className="h-5 w-5" />;
      case 'PROPERTY': return <Building className="h-5 w-5" />;
      case 'HOME': return <Home className="h-5 w-5" />;
      case 'LIFE': return <Heart className="h-5 w-5" />;
      case 'HEALTH': return <Heart className="h-5 w-5" />;
      case 'TRAVEL': return <Briefcase className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING_UNDERWRITING: 'bg-yellow-100 text-yellow-800',
      UNDER_REVIEW: 'bg-blue-100 text-blue-800',
      AWAITING_CUSTOMER_APPROVAL: 'bg-purple-100 text-purple-800',
      PENDING_FINAL_APPROVAL: 'bg-orange-100 text-orange-800',
      ACTIVE: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Underwriting Review Queue</h1>
        <p className="text-gray-500 mt-1">Review pending policies - Approve, Reject, or Adjust premium</p>
        <div className="text-xs text-gray-400 mt-2">Logged in as: <span className="font-medium">{userRole}</span></div>
      </div>

      {policies.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-3" />
            <p className="text-gray-500">No policies pending review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <Card key={policy.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getPolicyTypeIcon(policy.type)}
                      <h3 className="font-semibold text-lg">{policy.policyNumber}</h3>
                      <Badge className={getStatusBadge(policy.status)}>
                        {policy.status?.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Type</p>
                        <p className="font-medium">{policy.type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Coverage Amount</p>
                        <p className="font-medium">ETB {policy.coverageAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Requested Premium</p>
                        <p className="font-medium">ETB {policy.premium?.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      <p className="text-gray-500">Customer</p>
                      <p className="font-medium">{policy.customer_name}</p>
                      <p className="text-gray-500 text-xs">{policy.customer_email} | {policy.customer_phone}</p>
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      Submitted: {new Date(policy.createdAt).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => openActionModal(policy, 'direct_approve')} className="bg-green-600 hover:bg-green-700">
                      <Zap className="h-4 w-4 mr-2" /> Direct Approve
                    </Button>
                    <Button onClick={() => openActionModal(policy, 'reject')} variant="destructive" className="bg-red-600 hover:bg-red-700">
                      <Ban className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button onClick={() => openActionModal(policy, 'adjust')} variant="outline">
                      <Eye className="h-4 w-4 mr-2" /> Review & Adjust
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Modal with Complete Policy Details */}
      {selectedPolicy && policyDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto" onClick={() => setSelectedPolicy(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                {getPolicyTypeIcon(policyDetails.type)}
                <h3 className="text-lg font-semibold">
                  {actionType === 'direct_approve' && 'Direct Approve Policy'}
                  {actionType === 'reject' && 'Reject Policy'}
                  {actionType === 'adjust' && `Review Policy: ${policyDetails.policyNumber}`}
                </h3>
                <Badge className={getStatusBadge(policyDetails.status)}>{policyDetails.status?.replace(/_/g, ' ')}</Badge>
              </div>
              <button onClick={() => setSelectedPolicy(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Risk Assessment Summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Risk Assessment Summary</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-amber-700">Coverage Amount</p>
                        <p className="font-bold">ETB {policyDetails.coverageAmount?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Premium</p>
                        <p className="font-bold">ETB {policyDetails.premium?.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Premium Ratio</p>
                        <p className="font-bold">{((policyDetails.premium / policyDetails.coverageAmount) * 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-amber-700">Risk Level</p>
                        <Badge className={policyDetails.coverageAmount > 1000000 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {policyDetails.coverageAmount > 1000000 ? 'High' : 'Medium'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Information Section */}
              <SectionHeader title="Customer Information" icon={User} section="customerInfo" />
              {expandedSections.customerInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  <InfoRow label="Full Name" value={`${policyDetails.customer?.firstName} ${policyDetails.customer?.lastName}`} icon={User} />
                  <InfoRow label="Email" value={policyDetails.customer?.email} icon={Mail} />
                  <InfoRow label="Phone" value={policyDetails.customer?.phone} icon={Phone} />
                  <InfoRow label="Address" value={policyDetails.customer?.address} icon={Home} />
                  <InfoRow label="Date of Birth" value={policyDetails.customer?.dateOfBirth ? new Date(policyDetails.customer.dateOfBirth).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
                  <InfoRow label="Occupation" value={policyDetails.customer?.occupation} icon={BriefcaseIcon} />
                  <InfoRow label="Nationality" value={policyDetails.customer?.nationality} icon={Flag} />
                  <InfoRow label="ID Number" value={policyDetails.customer?.idNumber} icon={CreditCard} />
                </div>
              )}

              {/* Risk Related Inputs Section - Motor Vehicle Details */}
              {policyDetails.productDetails?.vehicles && policyDetails.productDetails.vehicles.length > 0 && (
                <>
                  <SectionHeader title="Risk Related Inputs - Motor Vehicle Details" icon={Car} section="riskInputs" count={policyDetails.productDetails.vehicles.length} bgColor="bg-blue-50" />
                  {expandedSections.riskInputs && (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                      {policyDetails.productDetails.vehicles.map((vehicle, idx) => (
                        <div key={idx} className="border border-blue-200 rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-blue-800 mb-3">Vehicle {idx + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoRow label="Make" value={vehicle.make} icon={Car} />
                            <InfoRow label="Model" value={vehicle.model} icon={Car} />
                            <InfoRow label="Year of Manufacture" value={vehicle.year} icon={CalendarIcon} />
                            <InfoRow label="Registration Number" value={vehicle.registrationNumber} icon={Key} />
                            <InfoRow label="Plate Number" value={vehicle.plateNumber || vehicle.registrationNumber} icon={Hash} />
                            <InfoRow label="Engine Number" value={vehicle.engineNumber} icon={Wrench} />
                            <InfoRow label="Chassis Number" value={vehicle.chassisNumber} icon={Truck} />
                            <InfoRow label="Vehicle Value" value={`ETB ${vehicle.vehicleValue?.toLocaleString()}`} icon={DollarSign} />
                            <InfoRow label="Fuel Type" value={vehicle.fuelType || 'N/A'} icon={Flag} />
                            <InfoRow label="Seating Capacity" value={vehicle.seatingCapacity || 'N/A'} icon={Users} />
                            <InfoRow label="Color" value={vehicle.color || 'N/A'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Property Details Section */}
              {policyDetails.productDetails?.propertyAddress && (
                <>
                  <SectionHeader title="Property Details" icon={Building} section="propertyDetails" />
                  {expandedSections.propertyDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                      <InfoRow label="Property Type" value={policyDetails.productDetails.propertyType} icon={Building} />
                      <InfoRow label="Property Address" value={policyDetails.productDetails.propertyAddress} icon={MapPin} />
                      <InfoRow label="Property Value" value={`ETB ${policyDetails.productDetails.propertyValue?.toLocaleString()}`} icon={DollarSign} />
                      <InfoRow label="Construction Type" value={policyDetails.productDetails.constructionType} />
                      <InfoRow label="Year Built" value={policyDetails.productDetails.yearBuilt} icon={CalendarIcon} />
                      <InfoRow label="Floor Area" value={policyDetails.productDetails.floorArea ? `${policyDetails.productDetails.floorArea} sqm` : 'N/A'} />
                      <InfoRow label="Number of Rooms" value={policyDetails.productDetails.numberOfRooms} />
                      <InfoRow label="Security Features" value={policyDetails.productDetails.securityFeatures?.join(', ') || 'None'} icon={Shield} />
                    </div>
                  )}
                </>
              )}

              {/* Coverage Details Section */}
              <SectionHeader title="Coverage Details" icon={ShieldCheck} section="coverageDetails" />
              {expandedSections.coverageDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                  <InfoRow label="Policy Type" value={policyDetails.type} icon={FileText} />
                  <InfoRow label="Coverage Amount" value={`ETB ${policyDetails.coverageAmount?.toLocaleString()}`} icon={DollarSign} />
                  <InfoRow label="Requested Premium" value={`ETB ${policyDetails.premium?.toLocaleString()}`} icon={DollarSign} />
                  <InfoRow label="Premium Frequency" value={policyDetails.premiumFrequency} icon={Calendar} />
                  <InfoRow label="Effective Date" value={policyDetails.effectiveDate ? new Date(policyDetails.effectiveDate).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
                  <InfoRow label="Expiration Date" value={policyDetails.expirationDate ? new Date(policyDetails.expirationDate).toLocaleDateString() : 'N/A'} icon={CalendarIcon} />
                </div>
              )}

              {/* Selected Perils */}
              {policyDetails.selectedPerils && policyDetails.selectedPerils.length > 0 && (
                <>
                  <SectionHeader title="Selected Perils / Risks" icon={AlertCircle} section="perils" count={policyDetails.selectedPerils.length} />
                  {expandedSections.perils && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.selectedPerils.map((peril) => (
                        <div key={peril.id} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{peril.perilName}</p>
                            <p className="text-xs text-gray-500">{peril.description}</p>
                          </div>
                          <p className="font-medium text-amber-600">ETB {peril.premium?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Selected Riders */}
              {policyDetails.selectedRiders && policyDetails.selectedRiders.length > 0 && (
                <>
                  <SectionHeader title="Selected Riders / Add-ons" icon={Package} section="riders" count={policyDetails.selectedRiders.length} />
                  {expandedSections.riders && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.selectedRiders.map((rider) => (
                        <div key={rider.id} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{rider.riderName}</p>
                            <p className="text-xs text-gray-500">{rider.description}</p>
                            {rider.maxLimit && <p className="text-xs text-gray-500">Max Limit: ETB {rider.maxLimit.toLocaleString()}</p>}
                          </div>
                          <p className="font-medium text-amber-600">ETB {rider.premium?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Previous Claims History */}
              {policyDetails.productDetails?.previousClaims && policyDetails.productDetails.previousClaims.length > 0 && (
                <>
                  <SectionHeader title="Previous Claims History" icon={FileCheck} section="previousClaims" count={policyDetails.productDetails.previousClaims.length} />
                  {expandedSections.previousClaims && (
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      {policyDetails.productDetails.previousClaims.map((claim, idx) => (
                        <div key={idx} className="flex justify-between items-start border-b last:border-0 pb-2">
                          <div>
                            <p className="font-medium">{claim.year}</p>
                            <p className="text-xs text-gray-500">{claim.description}</p>
                          </div>
                          <p className="font-medium text-red-600">ETB {claim.amount?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Review History */}
              {policyDetails.negotiationHistory && policyDetails.negotiationHistory.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Review History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {policyDetails.negotiationHistory.map((item, idx) => (
                      <div key={idx} className="text-sm p-2 bg-white rounded border">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.action}</span>
                          <span className="text-xs text-gray-500">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        {item.notes && <p className="text-xs text-gray-600 mt-1">{item.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Specific Forms */}
              {actionType === 'direct_approve' && (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-medium text-green-800">Direct Approval</p>
                    <p className="text-sm text-green-700">This will approve the policy immediately. The policy will become ACTIVE.</p>
                  </div>
                  <div>
                    <Label>Approval Notes <span className="text-red-500">*</span></Label>
                    <Textarea value={underwriterNotes} onChange={(e) => setUnderwriterNotes(e.target.value)} placeholder="Add approval notes..." rows={3} className="mt-1" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleDirectApprove} disabled={submitting} className="flex-1 bg-green-600">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4 mr-2" />}
                      Confirm Direct Approval
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">Cancel</Button>
                  </div>
                </>
              )}

              {actionType === 'reject' && (
                <>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="font-medium text-red-800">Reject Policy</p>
                    <p className="text-sm text-red-700">This will reject the policy application. The customer will be notified.</p>
                  </div>
                  <div>
                    <Label>Rejection Reason <span className="text-red-500">*</span></Label>
                    <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Provide clear reason for rejection..." rows={3} className="mt-1" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleRejectPolicy} disabled={submitting} className="flex-1 bg-red-600">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                      Confirm Rejection
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">Cancel</Button>
                  </div>
                </>
              )}

              {actionType === 'adjust' && (
                <>
                  <div>
                    <Label>Adjusted Premium (ETB) <span className="text-red-500">*</span></Label>
                    <Input type="number" value={adjustedPremium} onChange={(e) => setAdjustedPremium(e.target.value)} className="mt-1" />
                    <p className="text-xs text-gray-500 mt-1">Original: ETB {policyDetails.premium?.toLocaleString()}</p>
                  </div>
                  <div>
                    <Label>Message to Customer <span className="text-red-500">*</span></Label>
                    <Textarea value={underwriterNotes} onChange={(e) => setUnderwriterNotes(e.target.value)} placeholder="Explain the premium adjustment..." rows={3} className="mt-1" />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleSubmitAdjustment} disabled={submitting} className="flex-1 bg-blue-600">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Submit Adjustment
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPolicy(null)} className="flex-1">Cancel</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}