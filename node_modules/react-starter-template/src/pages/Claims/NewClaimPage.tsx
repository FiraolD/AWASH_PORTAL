import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, FileText, AlertCircle, Plus, Minus, User, Car, Camera, MapPin, Calendar, Clock, FileCheck, Users, Flag, Cloud, Sun, Umbrella, Wind, CheckCircle, Copy, Download, Home, Phone, Mail, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useAuthStore } from '../../stores/authStore';
import { usePolicyStore } from '../../stores/policyStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const natureOfLossOptions = [
    'Accident - Collision',
    'Accident - Rollover',
    'Theft',
    'Vandalism',
    'Fire',
    'Flood',
    'Earthquake',
    'Storm Damage',
    'Burglary',
    'Medical Emergency',
    'Death',
    'Other'
];

const roadConditionsOptions = [
    'Dry',
    'Wet',
    'Icy',
    'Snowy',
    'Muddy',
    'Under Construction',
    'Poor Lighting',
    'Rough Road',
    'Slippery'
];

const weatherConditionsOptions = [
    'Clear',
    'Rainy',
    'Foggy',
    'Snowy',
    'Stormy',
    'Windy',
    'Cloudy',
    'Hail'
];

const responsiblePartyOptions = [
    'Claimant',
    'Third Party',
    'Both',
    'Unknown',
    'Under Investigation'
];

interface InjuredPerson {
    name: string;
    age: number;
    injuryType: string;
    hospitalName: string;
}

export default function NewClaimPage() {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { policies, fetchPolicies } = usePolicyStore();
    const [loading, setLoading] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [documents, setDocuments] = React.useState<File[]>([]);
    const [injuredPersons, setInjuredPersons] = React.useState<InjuredPerson[]>([]);
    const [showDriverInfo, setShowDriverInfo] = React.useState(false);
    const [showWitnessInfo, setShowWitnessInfo] = React.useState(false);
    const [showEnvironmentalInfo, setShowEnvironmentalInfo] = React.useState(false);
    const [submittedClaimNumber, setSubmittedClaimNumber] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    
    const [formData, setFormData] = React.useState({
        policyId: '',
        productType: '',
        productCode: '',
        riskItem: '',
        accidentPlace: '',
        accidentDate: '',
        accidentTime: '',
        reportingDate: new Date().toISOString().split('T')[0],
        reportingTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        natureOfLoss: '',
        briefDescription: '',
        estimatedAmount: '',
        
        // Witness Information
        witnessName: '',
        witnessPhone: '',
        witnessStatement: '',
        
        // Driver Information
        driverFullName: '',
        driverAge: '',
        driverOccupation: '',
        driverLicenseNumber: '',
        driverLicenseIssueDate: '',
        driverLicenseExpiryDate: '',
        
        // Damage Details
        vehicleDamageDetails: '',
        
        // Environmental Conditions
        roadConditions: '',
        weatherConditions: '',
        responsibleParty: ''
    });

    React.useEffect(() => {
        fetchPolicies();
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setDocuments([...documents, ...Array.from(e.target.files)]);
        }
    };

    const removeDocument = (index: number) => {
        setDocuments(documents.filter((_, i) => i !== index));
    };

    const addInjuredPerson = () => {
        setInjuredPersons([...injuredPersons, { name: '', age: 0, injuryType: '', hospitalName: '' }]);
    };

    const removeInjuredPerson = (index: number) => {
        setInjuredPersons(injuredPersons.filter((_, i) => i !== index));
    };

    const updateInjuredPerson = (index: number, field: keyof InjuredPerson, value: any) => {
        const updated = [...injuredPersons];
        updated[index] = { ...updated[index], [field]: value };
        setInjuredPersons(updated);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(submittedClaimNumber);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Claim number copied!');
    };
    // Add this helper function at the top of NewClaimPage.tsx
const extractProductCodeFromPolicyNumber = (policyNumber: string): string => {
    if (!policyNumber) return 'GEN';
    const parts = policyNumber.split('/');
    if (parts.length >= 2) {
        return parts[1]; // Return the product code part
    }
    return 'GEN';
};

// Then when a policy is selected, extract the product code:
const handlePolicySelect = (policy: any) => {
    const productCode = extractProductCodeFromPolicyNumber(policy.policyNumber);
    
    setFormData({
        ...formData,
        policyId: policy.id,
        productType: policy.type,
        productCode: productCode  // Use extracted product code from policy number
    });
};

    const getSelectedPolicy = () => {
        return policies?.find((p: any) => p.id === formData.policyId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.policyId || !formData.accidentPlace || !formData.accidentDate || !formData.natureOfLoss) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const selectedPolicy = getSelectedPolicy();
            const productCode = selectedPolicy?.type === 'AUTO' ? 'AUTO' : 
                               selectedPolicy?.type === 'HOME' ? 'HOME' : 
                               selectedPolicy?.type === 'LIFE' ? 'LIFE' : 
                               selectedPolicy?.type === 'HEALTH' ? 'HLTH' : 'GEN';
            
            const payload = {
                policyId: formData.policyId,
                productType: formData.productType,
                productCode: productCode,
                riskItem: formData.riskItem,
                incidentDate: formData.accidentDate,
                timeOfAccident: formData.accidentTime,
                incidentDescription: formData.briefDescription,
                location: formData.accidentPlace,
                estimatedAmount: formData.estimatedAmount || null,
                natureOfLoss: formData.natureOfLoss,
                
                // Witness Information
                witnessName: formData.witnessName,
                witnessPhone: formData.witnessPhone,
                witnessStatement: formData.witnessStatement,
                
                // Driver Information
                driverFullName: formData.driverFullName,
                driverAge: formData.driverAge ? parseInt(formData.driverAge) : null,
                driverOccupation: formData.driverOccupation,
                driverLicenseNumber: formData.driverLicenseNumber,
                driverLicenseIssueDate: formData.driverLicenseIssueDate,
                driverLicenseExpiryDate: formData.driverLicenseExpiryDate,
                
                // Damage Details
                vehicleDamageDetails: formData.vehicleDamageDetails,
                
                // Injured Persons
                injuredPersons: injuredPersons,
                
                // Environmental Conditions
                roadConditions: formData.roadConditions,
                weatherConditions: formData.weatherConditions,
                responsibleParty: formData.responsibleParty
            };
            
            const response = await axios.post(`${API_URL}/claims`, payload, {
                headers: getAuthHeaders()
            });
            
            const claimId = response.data.claimId;
            const claimNumber = response.data.claimNumber;
            
            // Upload documents if any
            if (documents.length > 0) {
                const formDataUpload = new FormData();
                documents.forEach((doc) => {
                    formDataUpload.append('documents', doc);
                });
                
                try {
                    await axios.post(`${API_URL}/claims/${claimId}/documents`, formDataUpload, {
                        headers: {
                            ...getAuthHeaders(),
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                } catch (uploadError) {
                    console.error('Failed to upload documents:', uploadError);
                }
            }
            
            setSubmittedClaimNumber(claimNumber);
            setSubmitted(true);
            
        } catch (error) {
            console.error('Failed to create claim:', error);
            toast.error('Failed to submit claim');
        } finally {
            setLoading(false);
        }
    };

    const selectedPolicy = getSelectedPolicy();

    // Success Screen
    if (submitted) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => navigate('/customer/claims')} className="p-0 hover:bg-transparent">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Claims
                </Button>

                <div className="max-w-2xl mx-auto">
                    <Card className="border-green-200 shadow-xl">
                        <CardContent className="p-8 text-center">
                            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-green-800 mb-2">Claim Submitted Successfully!</h2>
                            <p className="text-green-700 mb-6">Your claim has been received and is being processed.</p>
                            
                            {/* Claim Reference Number */}
                            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                                <p className="text-sm text-gray-500 mb-2">Claim Reference Number</p>
                                <div className="flex items-center justify-center gap-3">
                                    <p className="text-2xl font-bold text-[#1A3E6F] font-mono tracking-wider">
                                        {submittedClaimNumber}
                                    </p>
                                    <button 
                                        onClick={copyToClipboard}
                                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                        title="Copy claim number"
                                    >
                                        {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5 text-gray-500" />}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2">Please save this reference number for future tracking</p>
                            </div>
                            
                            {/* Important Messages */}
                            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    What happens next?
                                </h3>
                                <ul className="space-y-2 text-sm text-blue-700">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>A claims officer will be assigned to your case within 24 hours</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>You will receive an email confirmation with your claim details</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>Our team may contact you for additional information if needed</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <span>You can track your claim status in the Claims section</span>
                                    </li>
                                </ul>
                            </div>
                            
                            {/* Contact Information */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                    <Phone className="h-4 w-4" />
                                    Need assistance?
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Contact our claims support team at <strong>+251-11-XXX-XXXX</strong> or email <strong>claims@awashinsurance.com</strong>
                                </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex gap-4 justify-center">
                                <Button 
                                    onClick={() => navigate('/claims')} 
                                    className="bg-[#1A3E6F] hover:bg-[#153358]"
                                >
                                    View My Claims
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => window.print()}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Save Reference
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => navigate('/customer/claims')} className="p-0 hover:bg-transparent">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Claims
            </Button>

            <div>
                <h1 className="text-3xl font-bold text-[#1A3E6F]">File a New Claim</h1>
                <p className="text-gray-500 mt-1">Please provide accurate information about the incident</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Policy Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Select Policy *</Label>
                                        <select 
                                            className="w-full rounded-lg border border-gray-200 p-2"
                                            value={formData.policyId}
                                            onChange={(e) => {
                                                const selectedPolicy = policies?.find((p: any) => p.id === e.target.value);
                                                setFormData({
                                                    ...formData,
                                                    policyId: e.target.value,
                                                    productType: selectedPolicy?.type || '',
                                                });
                                            }}
                                            required
                                        >
                                            <option value="">Select a policy</option>
                                            {policies?.map((policy: any) => (
                                                <option key={policy.id} value={policy.id}>
                                                    {policy.policyNumber} - {policy.type} (ETB {policy.coverageAmount?.toLocaleString()})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Product Type</Label>
                                        <Input 
                                            value={formData.productType}
                                            disabled
                                            className="bg-gray-50"
                                            placeholder="Auto-filled from policy"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Risk Item (if multiple items in policy)</Label>
                                    <Input 
                                        value={formData.riskItem}
                                        onChange={(e) => setFormData({...formData, riskItem: e.target.value})}
                                        placeholder="Specify which insured item this claim relates to"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Accident/Incident Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Accident/Incident Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Place of Accident *</Label>
                                        <Input 
                                            value={formData.accidentPlace}
                                            onChange={(e) => setFormData({...formData, accidentPlace: e.target.value})}
                                            placeholder="e.g., Bole Road, Addis Ababa"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Date of Accident *</Label>
                                        <Input 
                                            type="date"
                                            value={formData.accidentDate}
                                            onChange={(e) => setFormData({...formData, accidentDate: e.target.value})}
                                            required
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Time of Accident</Label>
                                        <Input 
                                            type="time"
                                            value={formData.accidentTime}
                                            onChange={(e) => setFormData({...formData, accidentTime: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nature of Loss *</Label>
                                        <select 
                                            className="w-full rounded-lg border border-gray-200 p-2"
                                            value={formData.natureOfLoss}
                                            onChange={(e) => setFormData({...formData, natureOfLoss: e.target.value})}
                                            required
                                        >
                                            <option value="">Select nature of loss</option>
                                            {natureOfLossOptions.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Estimated Amount (ETB)</Label>
                                    <Input 
                                        type="number"
                                        value={formData.estimatedAmount}
                                        onChange={(e) => setFormData({...formData, estimatedAmount: e.target.value})}
                                        placeholder="Optional estimated claim amount"
                                        min={0}
                                        step={1000}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Brief Description *</Label>
                                    <Textarea 
                                        value={formData.briefDescription}
                                        onChange={(e) => setFormData({...formData, briefDescription: e.target.value})}
                                        placeholder="Please provide a detailed description of what happened..."
                                        rows={4}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Driver Information - Toggle Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle 
                                    className="cursor-pointer flex justify-between items-center"
                                    onClick={() => setShowDriverInfo(!showDriverInfo)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Car className="h-5 w-5" />
                                        Driver Information (if applicable)
                                    </span>
                                    <span>{showDriverInfo ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
                                </CardTitle>
                            </CardHeader>
                            {showDriverInfo && (
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Driver Full Name</Label>
                                            <Input 
                                                value={formData.driverFullName}
                                                onChange={(e) => setFormData({...formData, driverFullName: e.target.value})}
                                                placeholder="Full name of the driver"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Driver Age</Label>
                                            <Input 
                                                type="number"
                                                value={formData.driverAge}
                                                onChange={(e) => setFormData({...formData, driverAge: e.target.value})}
                                                placeholder="Age"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Driver Occupation</Label>
                                            <Input 
                                                value={formData.driverOccupation}
                                                onChange={(e) => setFormData({...formData, driverOccupation: e.target.value})}
                                                placeholder="Occupation"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Driver License Number</Label>
                                            <Input 
                                                value={formData.driverLicenseNumber}
                                                onChange={(e) => setFormData({...formData, driverLicenseNumber: e.target.value})}
                                                placeholder="License number"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>License Issue Date</Label>
                                            <Input 
                                                type="date"
                                                value={formData.driverLicenseIssueDate}
                                                onChange={(e) => setFormData({...formData, driverLicenseIssueDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>License Expiry Date</Label>
                                            <Input 
                                                type="date"
                                                value={formData.driverLicenseExpiryDate}
                                                onChange={(e) => setFormData({...formData, driverLicenseExpiryDate: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Vehicle Damage Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Damage Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Details of Damage to the Vehicle/Property</Label>
                                    <Textarea 
                                        value={formData.vehicleDamageDetails}
                                        onChange={(e) => setFormData({...formData, vehicleDamageDetails: e.target.value})}
                                        placeholder="Describe the extent of damage to the vehicle or property..."
                                        rows={3}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Injured Persons Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <span className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Injured Persons
                                    </span>
                                    <Button type="button" variant="outline" size="sm" onClick={addInjuredPerson}>
                                        <Plus className="h-4 w-4 mr-1" /> Add Person
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {injuredPersons.length === 0 ? (
                                    <p className="text-gray-500 text-sm text-center py-4">No injured persons added. Click "Add Person" to add.</p>
                                ) : (
                                    injuredPersons.map((person, idx) => (
                                        <div key={idx} className="border p-4 rounded-lg space-y-3 relative">
                                            <Button 
                                                type="button"
                                                variant="ghost" 
                                                size="sm"
                                                className="absolute top-2 right-2"
                                                onClick={() => removeInjuredPerson(idx)}
                                            >
                                                <X className="h-4 w-4 text-red-500" />
                                            </Button>
                                            <h4 className="font-medium">Person {idx + 1}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <Label>Full Name</Label>
                                                    <Input 
                                                        placeholder="Full name" 
                                                        value={person.name} 
                                                        onChange={(e) => updateInjuredPerson(idx, 'name', e.target.value)} 
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Age</Label>
                                                    <Input 
                                                        type="number" 
                                                        placeholder="Age" 
                                                        value={person.age} 
                                                        onChange={(e) => updateInjuredPerson(idx, 'age', parseInt(e.target.value))} 
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Injury Type</Label>
                                                    <Input 
                                                        placeholder="Type of injury" 
                                                        value={person.injuryType} 
                                                        onChange={(e) => updateInjuredPerson(idx, 'injuryType', e.target.value)} 
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Hospital Name</Label>
                                                    <Input 
                                                        placeholder="Hospital where treated" 
                                                        value={person.hospitalName} 
                                                        onChange={(e) => updateInjuredPerson(idx, 'hospitalName', e.target.value)} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Witness Information - Toggle Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle 
                                    className="cursor-pointer flex justify-between items-center"
                                    onClick={() => setShowWitnessInfo(!showWitnessInfo)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Witness Information (if any)
                                    </span>
                                    <span>{showWitnessInfo ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
                                </CardTitle>
                            </CardHeader>
                            {showWitnessInfo && (
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Witness Name</Label>
                                            <Input 
                                                value={formData.witnessName}
                                                onChange={(e) => setFormData({...formData, witnessName: e.target.value})}
                                                placeholder="Name of witness"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Witness Phone</Label>
                                            <Input 
                                                value={formData.witnessPhone}
                                                onChange={(e) => setFormData({...formData, witnessPhone: e.target.value})}
                                                placeholder="Phone number"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Witness Statement</Label>
                                        <Textarea 
                                            value={formData.witnessStatement}
                                            onChange={(e) => setFormData({...formData, witnessStatement: e.target.value})}
                                            placeholder="What did the witness say?"
                                            rows={2}
                                        />
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Environmental Conditions - Toggle Section */}
                        <Card>
                            <CardHeader>
                                <CardTitle 
                                    className="cursor-pointer flex justify-between items-center"
                                    onClick={() => setShowEnvironmentalInfo(!showEnvironmentalInfo)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Cloud className="h-5 w-5" />
                                        Environmental Conditions
                                    </span>
                                    <span>{showEnvironmentalInfo ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
                                </CardTitle>
                            </CardHeader>
                            {showEnvironmentalInfo && (
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Road Conditions</Label>
                                            <select 
                                                className="w-full rounded-lg border border-gray-200 p-2"
                                                value={formData.roadConditions}
                                                onChange={(e) => setFormData({...formData, roadConditions: e.target.value})}
                                            >
                                                <option value="">Select road conditions</option>
                                                {roadConditionsOptions.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Weather Conditions</Label>
                                            <select 
                                                className="w-full rounded-lg border border-gray-200 p-2"
                                                value={formData.weatherConditions}
                                                onChange={(e) => setFormData({...formData, weatherConditions: e.target.value})}
                                            >
                                                <option value="">Select weather conditions</option>
                                                {weatherConditionsOptions.map(option => (
                                                    <option key={option} value={option}>{option}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Who is in your opinion responsible?</Label>
                                        <select 
                                            className="w-full rounded-lg border border-gray-200 p-2"
                                            value={formData.responsibleParty}
                                            onChange={(e) => setFormData({...formData, responsibleParty: e.target.value})}
                                        >
                                            <option value="">Select responsible party</option>
                                            {responsiblePartyOptions.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                </CardContent>
                            )}
                        </Card>

                        {/* Documents */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Supporting Documents</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
                                    <input
                                        type="file"
                                        id="file-upload"
                                        multiple
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="file-upload">
                                        <Button 
                                            type="button"
                                            variant="outline" 
                                            onClick={() => document.getElementById('file-upload')?.click()}
                                        >
                                            <Upload className="mr-2 h-4 w-4" /> Upload Documents
                                        </Button>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Upload photos, police reports, or other evidence (max 10MB each)
                                    </p>
                                </div>
                                
                                {documents.length > 0 && (
                                    <div className="space-y-2">
                                        <Label>Uploaded Files ({documents.length})</Label>
                                        {documents.map((doc, index) => (
                                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-gray-500" />
                                                    <span className="text-sm">{doc.name}</span>
                                                    <span className="text-xs text-gray-400">
                                                        ({(doc.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                </div>
                                                <Button 
                                                    type="button"
                                                    variant="ghost" 
                                                    size="sm"
                                                    onClick={() => removeDocument(index)}
                                                >
                                                    <X className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="bg-blue-50 border-blue-100">
                            <CardContent className="p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-blue-800">Important Information</p>
                                        <p className="text-xs text-blue-700 mt-1">
                                            â€¢ Provide accurate information to expedite your claim<br />
                                            â€¢ Upload clear photos of the damage<br />
                                            â€¢ A claim officer will contact you within 48 hours<br />
                                            â€¢ Keep your policy number handy for reference<br />
                                            â€¢ Police report is required for theft or vandalism claims
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-gray-700">Reporting Information</p>
                                    <p className="text-xs text-gray-500">Reporting Date: {formData.reportingDate}</p>
                                    <p className="text-xs text-gray-500">Reporting Time: {formData.reportingTime}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {selectedPolicy && (
                            <Card>
                                <CardContent className="p-4">
                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-gray-700">Selected Policy Summary</p>
                                        <p className="text-xs text-gray-500">Policy: {selectedPolicy.policyNumber}</p>
                                        <p className="text-xs text-gray-500">Type: {selectedPolicy.type}</p>
                                        <p className="text-xs text-gray-500">Coverage: ETB {selectedPolicy.coverageAmount?.toLocaleString()}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full bg-[#1A3E6F]"
                            disabled={loading}
                        >
                            {loading ? 'Submitting...' : 'Submit Claim'}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
