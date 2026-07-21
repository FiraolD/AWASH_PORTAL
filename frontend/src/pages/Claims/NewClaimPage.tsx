import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, AlertCircle, Loader2, CheckCircle, Shield,
  Calendar, ClipboardList, Car, Heart, Flame, Plane, User, FileCheck,
  Hospital, Plus, Info, Users, UserCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import axiosInstance from '../../lib/axios';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { formatCurrency } from '../../lib/utils';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface PolicyBeneficiary {
  id: string;
  fullName: string;
  relationship: string;
  percentage?: number;
}

interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  productName: string;
  coverageAmount: number;
  effectiveDate: string;
  expirationDate: string;
  status: string;
  productId?: string;
  productCode?: string;
  policyHolderName?: string;
  beneficiaries?: PolicyBeneficiary[];
}

interface CustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
  section?: string;
}

// ----------------------------------------------------------------------------
// Default fields by product type (fallback if backend returns nothing)
// ----------------------------------------------------------------------------
const DEFAULT_FIELDS_BY_TYPE: Record<string, CustomField[]> = {
  MOTOR: [
    { name: 'vehicle_make', label: 'Vehicle Make', type: 'text', required: true, section: 'Vehicle' },
    { name: 'vehicle_model', label: 'Vehicle Model', type: 'text', required: true, section: 'Vehicle' },
    { name: 'vehicle_year', label: 'Vehicle Year', type: 'number', required: true, section: 'Vehicle' },
    { name: 'plate_number', label: 'Plate Number', type: 'text', required: true, section: 'Vehicle' },
    { name: 'engine_number', label: 'Engine Number', type: 'text', required: false, section: 'Vehicle' },
    { name: 'chassis_number', label: 'Chassis Number', type: 'text', required: false, section: 'Vehicle' },
    { name: 'driver_name', label: 'Driver Full Name', type: 'text', required: true, section: 'Driver' },
    { name: 'driver_license', label: 'Driver License Number', type: 'text', required: true, section: 'Driver' },
    { name: 'accident_location', label: 'Accident Location', type: 'text', required: true, section: 'Incident' },
    { name: 'road_conditions', label: 'Road Conditions', type: 'select', required: false, options: ['Dry', 'Wet', 'Icy', 'Gravel', 'Other'], section: 'Incident' },
    { name: 'weather_conditions', label: 'Weather Conditions', type: 'select', required: false, options: ['Clear', 'Rain', 'Snow', 'Fog', 'Other'], section: 'Incident' },
    { name: 'damage_description', label: 'Damage Description', type: 'textarea', required: true, section: 'Incident' },
    { name: 'witness_name', label: 'Witness Name', type: 'text', required: false, section: 'Witness' },
    { name: 'witness_phone', label: 'Witness Phone', type: 'text', required: false, section: 'Witness' },
  ],
  HEALTH: [
    { name: 'patient_name', label: 'Patient Full Name', type: 'text', required: true, section: 'Patient' },
    { name: 'patient_age', label: 'Patient Age', type: 'number', required: true, section: 'Patient' },
    { name: 'patient_gender', label: 'Patient Gender', type: 'select', required: true, options: ['Male', 'Female', 'Other'], section: 'Patient' },
    { name: 'diagnosis', label: 'Diagnosis / Condition', type: 'textarea', required: true, section: 'Medical' },
    { name: 'admission_date', label: 'Admission Date', type: 'date', required: false, section: 'Medical' },
    { name: 'discharge_date', label: 'Discharge Date', type: 'date', required: false, section: 'Medical' },
    { name: 'treatment_type', label: 'Treatment Type', type: 'select', required: true, options: ['Inpatient', 'Outpatient', 'Emergency', 'Surgery', 'Consultation', 'Maternity', 'Other'], section: 'Medical' },
    { name: 'medical_expenses', label: 'Estimated Medical Expenses (ETB)', type: 'number', required: false, section: 'Financial' },
    { name: 'pre_existing_conditions', label: 'Pre-existing Conditions', type: 'textarea', required: false, section: 'Medical' },
    { name: 'attending_physician', label: 'Attending Physician Name', type: 'text', required: false, section: 'Medical' },
  ],
  FIRE: [
    { name: 'property_address', label: 'Property Address', type: 'text', required: true, section: 'Property' },
    { name: 'property_type', label: 'Property Type', type: 'select', required: true, options: ['Residential', 'Commercial', 'Industrial', 'Warehouse', 'Other'], section: 'Property' },
    { name: 'fire_date', label: 'Date of Fire Incident', type: 'date', required: true, section: 'Incident' },
    { name: 'fire_cause', label: 'Suspected Cause', type: 'select', required: false, options: ['Electrical', 'Gas Leak', 'Arson', 'Natural', 'Unknown', 'Other'], section: 'Incident' },
    { name: 'damaged_areas', label: 'Damaged Areas / Rooms', type: 'textarea', required: true, section: 'Incident' },
    { name: 'fire_department_report', label: 'Fire Department Report Number', type: 'text', required: false, section: 'Incident' },
    { name: 'estimated_loss', label: 'Estimated Loss (ETB)', type: 'number', required: true, section: 'Financial' },
    { name: 'police_report', label: 'Police Report Number', type: 'text', required: false, section: 'Incident' },
  ],
  TRAVEL: [
    { name: 'destination', label: 'Travel Destination', type: 'text', required: true, section: 'Travel' },
    { name: 'travel_date', label: 'Travel Start Date', type: 'date', required: true, section: 'Travel' },
    { name: 'return_date', label: 'Return Date', type: 'date', required: true, section: 'Travel' },
    { name: 'incident_type', label: 'Incident Type', type: 'select', required: true, options: ['Flight Cancellation', 'Lost Baggage', 'Medical Emergency', 'Trip Interruption', 'Passport Loss', 'Theft', 'Other'], section: 'Incident' },
    { name: 'incident_location', label: 'Incident Location (City/Country)', type: 'text', required: true, section: 'Incident' },
    { name: 'claim_amount', label: 'Claim Amount (ETB)', type: 'number', required: true, section: 'Financial' },
    { name: 'supporting_documents', label: 'Supporting Documents Description', type: 'textarea', required: false, section: 'Documents' },
  ],
  LIFE: [
    { name: 'insured_name', label: 'Insured Person Full Name', type: 'text', required: true, section: 'Personal' },
    { name: 'insured_dob', label: 'Date of Birth', type: 'date', required: true, section: 'Personal' },
    { name: 'insured_gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female', 'Other'], section: 'Personal' },
    { name: 'event_type', label: 'Event Type', type: 'select', required: true, options: ['Death', 'Critical Illness', 'Disability', 'Maturity'], section: 'Event' },
    { name: 'event_date', label: 'Event Date', type: 'date', required: true, section: 'Event' },
    { name: 'cause_of_event', label: 'Cause / Details', type: 'textarea', required: true, section: 'Event' },
    { name: 'beneficiary_name', label: 'Beneficiary Full Name', type: 'text', required: true, section: 'Beneficiary' },
    { name: 'beneficiary_relationship', label: 'Relationship to Insured', type: 'text', required: true, section: 'Beneficiary' },
    { name: 'beneficiary_phone', label: 'Beneficiary Phone', type: 'text', required: false, section: 'Beneficiary' },
  ],
};

const INSURANCE_ICONS: Record<string, any> = {
  MOTOR: Car,
  HEALTH: Heart,
  FIRE: Flame,
  TRAVEL: Plane,
  LIFE: User,
  default: Shield,
};

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------
export default function NewClaimPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // Core states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [submissionComplete, setSubmissionComplete] = useState(false);
  const [createdClaimNumber, setCreatedClaimNumber] = useState('');

  // Policies
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Dynamic custom fields
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Common fields
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentDescription, setIncidentDescription] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState<number>(0);

  // Hospital fields (Health insurance)
  const [hospitalList, setHospitalList] = useState<string[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [otherHospital, setOtherHospital] = useState('');
  const [showOtherHospital, setShowOtherHospital] = useState(false);

  // Beneficiary fields
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const [claimForSelf, setClaimForSelf] = useState(true);

  // ----------------------------------------------------------------------------
  // Fetch active policies
  // ----------------------------------------------------------------------------
  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await axiosInstance.get('/policies/my-policies');
      const activePolicies = (res.data || []).filter((p: Policy) => p.status === 'ACTIVE');
      setPolicies(activePolicies);
    } catch (error) {
      toast.error('Failed to load policies');
    }
  };

  // ----------------------------------------------------------------------------
  // Fetch custom fields for the selected policy's product
  // ----------------------------------------------------------------------------
  const fetchFieldsForPolicy = async (policy: Policy) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/products/${policy.productId || policy.productCode}`);
      const product = res.data;
      
      if (product.customFields && product.customFields.length > 0) {
        setCustomFields(product.customFields);
        setLoading(false);
        return;
      }
      if (product.fields && product.fields.length > 0) {
        setCustomFields(product.fields);
        setLoading(false);
        return;
      }
    } catch {
      console.warn('Could not fetch fields from backend, using defaults');
    }

    const defaults = DEFAULT_FIELDS_BY_TYPE[policy.type] || [];
    setCustomFields(defaults);
    
    if (defaults.length === 0) {
      toast.info('No specific fields required for this product type');
    }
    setLoading(false);
  };

  // ----------------------------------------------------------------------------
  // Fetch hospitals (for Health insurance)
  // ----------------------------------------------------------------------------
  const fetchHospitals = async () => {
    setLoadingHospitals(true);
    try {
      const res = await axiosInstance.get('/settings/hospitals');
      const hospitals = res.data || [];
      setHospitalList(hospitals);
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
      setHospitalList([
        'Tikur Anbessa Specialized Hospital',
        "St. Paul's Hospital Millennium Medical College",
        'Yekatit 12 Hospital Medical College',
        'Zewditu Memorial Hospital',
        'Alert Hospital',
        'Menelik II Referral Hospital',
        'Gandhi Memorial Hospital',
        'Betezata General Hospital',
        'Hayat Hospital',
        'Korean Hospital',
        'Landmark General Hospital',
        'Nordic Medical Center',
        'Myungsung Christian Medical Center',
        'Bethzatha Hospital',
        'St. Gabriel General Hospital',
      ]);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Handle policy selection
  // ----------------------------------------------------------------------------
  const handlePolicySelect = async (policy: Policy) => {
    setSelectedPolicy(policy);
    setFieldValues({});
    setFieldErrors({});
    setEstimatedAmount(policy.coverageAmount || 0);
    
    // Auto-populate policy holder name
    if (policy.policyHolderName) {
      setFieldValues(prev => ({
        ...prev,
        patient_name: policy.policyHolderName,
        insured_name: policy.policyHolderName,
        driver_name: policy.policyHolderName,
        claimant_name: policy.policyHolderName,
      }));
    }

    // Reset beneficiary selection
    setSelectedBeneficiary('');
    setClaimForSelf(true);
    
    // Fetch hospitals for Health insurance
    if (policy.type === 'HEALTH') {
      await fetchHospitals();
      setSelectedHospital('');
      setOtherHospital('');
      setShowOtherHospital(false);
    }
    
    await fetchFieldsForPolicy(policy);
    setStep(2);
  };

  // ----------------------------------------------------------------------------
  // Field handlers
  // ----------------------------------------------------------------------------
  const handleFieldChange = (fieldName: string, value: any) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  // ----------------------------------------------------------------------------
  // Beneficiary handlers
  // ----------------------------------------------------------------------------
  const handleClaimForChange = (isSelf: boolean) => {
    setClaimForSelf(isSelf);
    if (isSelf) {
      setSelectedBeneficiary('');
      if (selectedPolicy?.policyHolderName) {
        handleFieldChange('patient_name', selectedPolicy.policyHolderName);
        handleFieldChange('insured_name', selectedPolicy.policyHolderName);
      }
    } else {
      handleFieldChange('patient_name', '');
      handleFieldChange('insured_name', '');
    }
  };

  const handleBeneficiarySelect = (beneficiaryId: string) => {
    setSelectedBeneficiary(beneficiaryId);
    if (beneficiaryId && selectedPolicy?.beneficiaries) {
      const beneficiary = selectedPolicy.beneficiaries.find(b => b.id === beneficiaryId);
      if (beneficiary) {
        handleFieldChange('patient_name', beneficiary.fullName);
        handleFieldChange('insured_name', beneficiary.fullName);
        handleFieldChange('beneficiary_name', beneficiary.fullName);
        handleFieldChange('beneficiary_relationship', beneficiary.relationship);
      }
    }
  };

  // ----------------------------------------------------------------------------
  // Validation
  // ----------------------------------------------------------------------------
  const validateFields = () => {
    const errors: Record<string, string> = {};
    
    if (!incidentDate) errors.incidentDate = 'Incident date is required';
    if (!incidentDescription || incidentDescription.trim().length < 10) {
      errors.incidentDescription = 'Please provide a detailed description (min 10 characters)';
    }

    customFields.forEach(field => {
      if (field.required) {
        const value = fieldValues[field.name];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    });

    if (selectedPolicy?.type === 'HEALTH') {
      const hospitalValue = showOtherHospital ? otherHospital : selectedHospital;
      if (!hospitalValue || hospitalValue.trim() === '') {
        errors['hospital_name'] = 'Hospital / clinic name is required';
      }
    }

    // Validate beneficiary selection
    if (!claimForSelf && selectedPolicy?.beneficiaries && selectedPolicy.beneficiaries.length > 0) {
      if (!selectedBeneficiary) {
        errors['beneficiary'] = 'Please select a beneficiary';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ----------------------------------------------------------------------------
  // Render a single custom field
  // ----------------------------------------------------------------------------
  const renderField = (field: CustomField) => {
    const value = fieldValues[field.name] ?? '';
    const error = fieldErrors[field.name];

    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder || field.label}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            className={error ? 'border-red-500' : ''}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => handleFieldChange(field.name, val)}>
            <SelectTrigger className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder || field.label}
            value={value}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            className={error ? 'border-red-500' : ''}
            rows={3}
          />
        );
      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={e => handleFieldChange(field.name, e.target.checked)}
              className="h-4 w-4"
            />
            <Label>{field.label}</Label>
          </div>
        );
      default:
        return <Input value={value} onChange={e => handleFieldChange(field.name, e.target.value)} />;
    }
  };

  // ----------------------------------------------------------------------------
  // Render beneficiary selector
  // ----------------------------------------------------------------------------
  const renderBeneficiarySelector = () => {
    const beneficiaries = selectedPolicy?.beneficiaries || [];
    
    if (beneficiaries.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Claim For
          </CardTitle>
          <CardDescription>
            Select who this claim is being filed for
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              type="button"
              variant={claimForSelf ? 'default' : 'outline'}
              onClick={() => handleClaimForChange(true)}
              className="flex-1"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Myself (Policy Holder)
            </Button>
            <Button
              type="button"
              variant={!claimForSelf ? 'default' : 'outline'}
              onClick={() => handleClaimForChange(false)}
              className="flex-1"
            >
              <Users className="h-4 w-4 mr-2" />
              Beneficiary
            </Button>
          </div>

          {!claimForSelf && (
            <div>
              <Label>Select Beneficiary <span className="text-red-500">*</span></Label>
              <Select value={selectedBeneficiary} onValueChange={handleBeneficiarySelect}>
                <SelectTrigger className={fieldErrors['beneficiary'] ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Choose a beneficiary..." />
                </SelectTrigger>
                <SelectContent>
                  {beneficiaries.map(ben => (
                    <SelectItem key={ben.id} value={ben.id}>
                      {ben.fullName} ({ben.relationship})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors['beneficiary'] && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors['beneficiary']}</p>
              )}
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-lg text-sm">
            <p className="text-gray-500">Claim is being filed for:</p>
            <p className="font-medium">
              {claimForSelf
                ? selectedPolicy?.policyHolderName || 'Policy Holder'
                : selectedBeneficiary
                  ? selectedPolicy?.beneficiaries?.find(b => b.id === selectedBeneficiary)?.fullName
                  : 'Select a beneficiary'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ----------------------------------------------------------------------------
  // Render hospital dropdown
  // ----------------------------------------------------------------------------
  const renderHospitalField = () => {
    return (
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Hospital / Clinic Name <span className="text-red-500">*</span>
        </Label>
        
        {loadingHospitals ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading hospital list...
          </div>
        ) : (
          <>
            <Select 
              value={selectedHospital} 
              onValueChange={(val) => {
                setSelectedHospital(val);
                setShowOtherHospital(val === 'OTHER');
                if (val !== 'OTHER') {
                  setOtherHospital('');
                  handleFieldChange('hospital_name', val);
                } else {
                  handleFieldChange('hospital_name', '');
                }
              }}
            >
              <SelectTrigger className={fieldErrors['hospital_name'] ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select hospital / clinic..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {hospitalList.map((hospital) => (
                  <SelectItem key={hospital} value={hospital}>
                    {hospital}
                  </SelectItem>
                ))}
                <SelectItem value="OTHER" className="text-blue-600 font-medium border-t">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Other (specify below)
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {showOtherHospital && (
              <div className="mt-3">
                <Label>Please specify hospital name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Enter hospital / clinic name..."
                  value={otherHospital}
                  onChange={(e) => {
                    setOtherHospital(e.target.value);
                    handleFieldChange('hospital_name', e.target.value);
                  }}
                  className="mt-1"
                />
              </div>
            )}
          </>
        )}
        
        {fieldErrors['hospital_name'] && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors['hospital_name']}</p>
        )}
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // Render custom fields grouped by section
  // ----------------------------------------------------------------------------
  const renderCustomFieldsGrouped = () => {
    const fieldsToRender = customFields.filter(field => {
      if (selectedPolicy?.type === 'HEALTH' && field.name === 'hospital_name') {
        return false;
      }
      return true;
    });

    if (fieldsToRender.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <Info className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No additional fields required for this claim type.</p>
          </CardContent>
        </Card>
      );
    }

    const groups: Record<string, CustomField[]> = {};
    fieldsToRender.forEach(field => {
      const section = field.section || 'General';
      if (!groups[section]) groups[section] = [];
      groups[section].push(field);
    });

    return Object.entries(groups).map(([section, fields]) => (
      <Card key={section}>
        <CardHeader>
          <CardTitle className="text-lg capitalize">
            {section === 'General' ? 'Additional Details' : `${section} Information`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map(field => (
              <div key={field.name} className={field.type === 'textarea' ? 'col-span-full' : ''}>
                <Label className={field.required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ""}>
                  {field.label}
                </Label>
                {renderField(field)}
                {fieldErrors[field.name] && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors[field.name]}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    ));
  };

  // ----------------------------------------------------------------------------
  // Submit claim
  // ----------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!selectedPolicy) return;
    if (!validateFields()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        policyId: selectedPolicy.id,
        incidentDate,
        incidentDescription,
        estimatedAmount: estimatedAmount || 0,
        natureOfLoss: selectedPolicy.type,
        claimFor: claimForSelf ? 'self' : 'beneficiary',
        beneficiaryId: claimForSelf ? null : selectedBeneficiary,
        fieldValues: {
          ...fieldValues,
          ...(selectedPolicy.type === 'HEALTH' && {
            hospital_name: showOtherHospital ? otherHospital : selectedHospital
          })
        },
      };

      const res = await axiosInstance.post('/claims', payload);
      setCreatedClaimNumber(res.data.claimNumber || '');
      setSubmissionComplete(true);
      toast.success('Claim submitted successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Product type icon
  // ----------------------------------------------------------------------------
  const ProductIcon = selectedPolicy
    ? (INSURANCE_ICONS[selectedPolicy.type] || INSURANCE_ICONS.default)
    : Shield;

  // ============================================================================
  // SUCCESS SCREEN
  // ============================================================================
  if (submissionComplete) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
        </Button>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Claim Submitted Successfully!</h2>
            <p className="text-green-700 mb-6">Your claim has been registered and is being processed.</p>
            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <p className="text-sm text-gray-500 mb-2">Your Claim Number</p>
              <p className="text-2xl font-bold text-[#1A3E6F]">{createdClaimNumber}</p>
              <p className="text-xs text-gray-400 mt-2">Please save this number for future reference</p>
            </div>
            <Button onClick={() => navigate('/customer/claims')} className="bg-[#1A3E6F]">
              View My Claims
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Register a New Claim</h1>
        <p className="text-gray-500 mt-1">Submit a claim for your active policy</p>
      </div>

      {/* ================================================================ */}
      {/* STEP 1: SELECT POLICY */}
      {/* ================================================================ */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Select an Active Policy</h2>
          {policies.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No active policies found</p>
                <Button className="mt-4" onClick={() => navigate('/customer/buy-policy')}>
                  Buy a Policy
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {policies.map(policy => {
                const Icon = INSURANCE_ICONS[policy.type] || INSURANCE_ICONS.default;
                return (
                  <Card
                    key={policy.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300"
                    onClick={() => handlePolicySelect(policy)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Icon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">{policy.policyNumber}</p>
                          <Badge className="bg-green-100 text-green-800">{policy.productName}</Badge>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="text-gray-500">Coverage:</span> {formatCurrency(policy.coverageAmount)}</p>
                        <p><span className="text-gray-500">Type:</span> {policy.type}</p>
                        <p><span className="text-gray-500">Valid Until:</span> {new Date(policy.expirationDate).toLocaleDateString()}</p>
                        {policy.policyHolderName && (
                          <p><span className="text-gray-500">Policy Holder:</span> {policy.policyHolderName}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* STEP 2: FILL CLAIM FORM */}
      {/* ================================================================ */}
      {step === 2 && selectedPolicy && (
        <div className="space-y-6">
          {/* Policy info banner */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              ← Change Policy
            </Button>
            <Badge className="bg-blue-100 text-blue-800 text-sm">
              <ProductIcon className="h-3 w-3 mr-1" />
              {selectedPolicy.productName}
            </Badge>
            <span className="text-sm text-gray-500">
              Policy: {selectedPolicy.policyNumber}
            </span>
            {selectedPolicy.policyHolderName && (
              <span className="text-sm text-gray-500">
                | Holder: {selectedPolicy.policyHolderName}
              </span>
            )}
          </div>

          {/* Beneficiary Selector */}
          {renderBeneficiarySelector()}

          {/* Common Incident Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Incident Details
              </CardTitle>
              <CardDescription>
                Provide the basic information about what happened
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Incident Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className={fieldErrors.incidentDate ? 'border-red-500' : ''}
                  />
                  {fieldErrors.incidentDate && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.incidentDate}</p>
                  )}
                </div>
                <div>
                  <Label>Estimated Claim Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={estimatedAmount || ''}
                    onChange={(e) => setEstimatedAmount(parseFloat(e.target.value))}
                    placeholder="Auto-filled from policy coverage"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Policy coverage: {formatCurrency(selectedPolicy.coverageAmount)}
                  </p>
                </div>
              </div>
              <div>
                <Label>Incident Description <span className="text-red-500">*</span></Label>
                <Textarea
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Describe what happened in detail (min. 10 characters)..."
                  rows={4}
                  className={fieldErrors.incidentDescription ? 'border-red-500' : ''}
                />
                {fieldErrors.incidentDescription && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.incidentDescription}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Hospital Dropdown for Health Insurance */}
          {selectedPolicy.type === 'HEALTH' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-red-500" />
                  Medical Facility
                </CardTitle>
                <CardDescription>
                  Select the hospital or clinic where treatment was received
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderHospitalField()}
              </CardContent>
            </Card>
          )}

          {/* Dynamic Custom Fields (grouped by section) */}
          {renderCustomFieldsGrouped()}

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button variant="outline" onClick={() => setStep(1)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileCheck className="h-4 w-4 mr-2" />
              )}
              {submitting ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}