import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, DollarSign, Calendar, AlertCircle, Loader2, CheckCircle, FileText, Eye, Car, Plus, Minus, Info, Copy, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useAuthStore } from '../../stores/authStore';
import PolicyDocuments from '../../components/PolicyDocuments';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  requires_approval: boolean;
  is_active: boolean;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  yearOfMake: string;
  plateNumber: string;
  engineNumber: string;
  chassisNumber: string;
  vehicleType: string;
  usage: string;
  vehicleValue: number;
}

interface Peril {
  id: string;
  perilName: string;
  description: string;
  premiumRate: number;
  calculationType: string;
  isDefault: boolean;
}

interface Rider {
  id: string;
  riderName: string;
  description: string;
  premiumRate: number;
  calculationType: string;
  maxLimit: number;
}

interface PremiumCalculation {
  basicPremium: number;
  vatAmount: number;
  drrAmount: number;
  totalPremium: number;
  monthlyPremium: number;
  perilPremium: number;
  riderPremium: number;
  coverageTier: string;
  baseRate: number;
  perilBreakdown?: any[];
  riderBreakdown?: any[];
}

export default function BuyNewPolicyPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = React.useState(false);
  const [calculating, setCalculating] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [premiumResult, setPremiumResult] = React.useState<PremiumCalculation | null>(null);
  const [step, setStep] = React.useState(1);
  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [showDocuments, setShowDocuments] = React.useState(false);
  const [createdPolicyId, setCreatedPolicyId] = React.useState('');
  const [createdPolicyNumber, setCreatedPolicyNumber] = React.useState('');
  const [submissionComplete, setSubmissionComplete] = React.useState(false); // NEW: Track submission status
  
  // Vehicle state
  const [vehicleCount, setVehicleCount] = React.useState<number>(1);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = React.useState<number>(0);
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([
    { id: '1', make: '', model: '', yearOfMake: '', plateNumber: '', engineNumber: '', chassisNumber: '', vehicleType: '', usage: '', vehicleValue: 0 }
  ]);
  const [vehicleErrors, setVehicleErrors] = React.useState<Record<string, string>>({});
  
  // Perils and Riders state
  const [availablePerils, setAvailablePerils] = React.useState<Peril[]>([]);
  const [availableRiders, setAvailableRiders] = React.useState<Rider[]>([]);
  const [selectedPerils, setSelectedPerils] = React.useState<string[]>([]);
  const [selectedRiders, setSelectedRiders] = React.useState<string[]>([]);
  
  const [formData, setFormData] = React.useState({
    productType: '',
    productId: '',
    coverageAmount: 500000,
    termMonths: 12,
    effectiveDate: new Date().toISOString().split('T')[0],
    productDetails: {} as Record<string, any>
  });

  const vehicleTypes = ['Sedan', 'SUV', 'Truck', 'Motorcycle', 'Van', 'Bus', 'Pickup', 'Luxury'];
  const usageOptions = ['Private', 'Commercial', 'Rental', 'Government', 'Taxi', 'Ride-sharing'];

  React.useEffect(() => {
    fetchProducts();
  }, []);

  React.useEffect(() => {
    if (formData.coverageAmount >= 100000 && formData.productType) {
      calculatePremium();
    }
  }, [formData.coverageAmount, formData.productType, formData.termMonths, vehicles, selectedPerils, selectedRiders]);

  React.useEffect(() => {
    if (formData.productId && formData.productType) {
      fetchPerilsAndRiders();
    }
  }, [formData.productId, formData.productType]);

  React.useEffect(() => {
    const newVehicles = [...vehicles];
    if (vehicleCount > vehicles.length) {
      for (let i = vehicles.length; i < vehicleCount; i++) {
        newVehicles.push({
          id: Date.now().toString() + i,
          make: '', model: '', yearOfMake: '', plateNumber: '', engineNumber: '', chassisNumber: '', vehicleType: '', usage: '', vehicleValue: 0
        });
      }
    } else if (vehicleCount < vehicles.length) {
      newVehicles.splice(vehicleCount);
    }
    setVehicles(newVehicles);
    
    if (selectedVehicleIndex >= vehicleCount) {
      setSelectedVehicleIndex(0);
    }
  }, [vehicleCount]);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/products/available');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchPerilsAndRiders = async () => {
    try {
      const [perilsRes, ridersRes] = await Promise.all([
        axiosInstance.get(`/policies/perils/${formData.productType}`),
        axiosInstance.get(`/policies/riders/${formData.productType}`)
      ]);
      setAvailablePerils(perilsRes.data);
      setAvailableRiders(ridersRes.data);
      
      const defaultPerilIds = perilsRes.data.filter((p: Peril) => p.isDefault).map((p: Peril) => p.id);
      setSelectedPerils(defaultPerilIds);
    } catch (error) {
      console.error('Failed to fetch perils/riders:', error);
    }
  };

  const calculatePremium = async () => {
    if (formData.coverageAmount < 100000) {
      toast.warning('Coverage amount must be at least ETB 100,000');
      return;
    }
    
    setCalculating(true);
    try {
      const vehicleData = vehicles.filter(v => v.make || v.model).map(v => ({
        vehicleValue: v.vehicleValue,
        vehicleType: v.vehicleType,
        usage: v.usage,
        yearOfMake: v.yearOfMake
      }));
      
      const response = await axiosInstance.post('/policies/calculate-premium', {
        productType: formData.productType,
        coverageAmount: formData.coverageAmount,
        termMonths: formData.termMonths,
        vehicles: vehicleData,
        selectedPerils: selectedPerils,
        selectedRiders: selectedRiders
      });
      setPremiumResult(response.data);
    } catch (error) {
      console.error('Premium calculation failed:', error);
      toast.error('Failed to calculate premium');
    } finally {
      setCalculating(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setFormData({ 
      ...formData, 
      productType: product.code,
      productId: product.id 
    });
    setStep(2);
  };

  const handleVehicleChange = (field: keyof Vehicle, value: any) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[selectedVehicleIndex] = {
      ...updatedVehicles[selectedVehicleIndex],
      [field]: value
    };
    setVehicles(updatedVehicles);
  };

  const validateVehicles = () => {
    const errors: Record<string, string> = {};
    const currentVehicle = vehicles[selectedVehicleIndex];
    
    if (!currentVehicle.make) errors.make = 'Make is required';
    if (!currentVehicle.model) errors.model = 'Model is required';
    if (!currentVehicle.yearOfMake) errors.yearOfMake = 'Year is required';
    if (!currentVehicle.plateNumber) errors.plateNumber = 'Plate number is required';
    if (!currentVehicle.vehicleValue || currentVehicle.vehicleValue < 100000) errors.vehicleValue = 'Value must be at least ETB 100,000';
    
    setVehicleErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const copyPolicyNumber = () => {
    if (createdPolicyNumber) {
      navigator.clipboard.writeText(createdPolicyNumber);
      toast.success('Policy number copied to clipboard!');
    }
  };

  const handleSubmit = async () => {
    if (!formData.productType || !formData.coverageAmount) {
      toast.error('Please select a product and enter coverage amount');
      return;
    }

    if (!premiumResult) {
      toast.error('Please wait for premium calculation');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    let allVehiclesValid = true;
    for (let i = 0; i < vehicles.length; i++) {
      setSelectedVehicleIndex(i);
      if (!validateVehicles()) {
        allVehiclesValid = false;
        toast.error(`Please complete all fields for Vehicle ${i + 1}`);
        break;
      }
    }
    if (!allVehiclesValid) return;

    setLoading(true);
    try {
      const payload = {
        type: formData.productType,
        coverageAmount: formData.coverageAmount,
        premiumFrequency: formData.termMonths === 12 ? 'ANNUALLY' : formData.termMonths === 3 ? 'QUARTERLY' : 'MONTHLY',
        effectiveDate: formData.effectiveDate,
        expirationDate: new Date(new Date(formData.effectiveDate).setFullYear(new Date(formData.effectiveDate).getFullYear() + 1)).toISOString().split('T')[0],
        productDetails: formData.productDetails,
        vehicles: vehicles,
        selectedPerils: selectedPerils,
        selectedRiders: selectedRiders
      };
      
      const response = await axiosInstance.post('/policies', payload);
      
      setCreatedPolicyId(response.data.policyId);
      setCreatedPolicyNumber(response.data.policyNumber);
      setSubmissionComplete(true); // Mark submission as complete
      
      toast.success('Policy application submitted successfully!');
      
    } catch (error: any) {
      console.error('Failed to create policy:', error);
      toast.error(error.response?.data?.error || 'Failed to submit policy application');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentsClose = () => {
    setShowDocuments(false);
    navigate('/customer/policies');
  };

  const handleViewPolicies = () => {
    navigate('/customer/policies');
  };

  const selectedProduct = products.find(p => p.code === formData.productType);
  const currentVehicle = vehicles[selectedVehicleIndex];

  // If submission is complete, show success page with policy number
  if (submissionComplete) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0 hover:bg-transparent">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
        </Button>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted Successfully!</h2>
            <p className="text-green-700 mb-6">Your policy application has been received and is pending review.</p>
            
            <div className="bg-white rounded-lg p-6 max-w-md mx-auto mb-6">
              <p className="text-sm text-gray-500 mb-2">Your Policy Number</p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-2xl font-bold text-[#1A3E6F]">{createdPolicyNumber}</p>
                <button 
                  onClick={copyPolicyNumber}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Copy policy number"
                >
                  <Copy className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Please save this policy number for future reference</p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button onClick={handleViewPolicies} className="bg-[#1A3E6F] hover:bg-[#153358]">
                View My Policies
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDocuments(true)}
              >
                <FileText className="mr-2 h-4 w-4" />
                View Policy Documents
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Policy Documents Modal */}
        {createdPolicyId && (
          <PolicyDocuments policyId={createdPolicyId} policyNumber={createdPolicyNumber} open={showDocuments} onClose={handleDocumentsClose} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate('/customer/policies')} className="p-0 hover:bg-transparent">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Policies
      </Button>

      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Buy New Policy</h1>
        <p className="text-gray-500 mt-1">Choose the right coverage for your needs</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-md">
        <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
          <span className="ml-2 text-sm">Select Product</span>
        </div>
        <div className="w-16 h-px bg-gray-300" />
        <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
          <span className="ml-2 text-sm">Customize</span>
        </div>
        <div className="w-16 h-px bg-gray-300" />
        <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</div>
          <span className="ml-2 text-sm">Review & Pay</span>
        </div>
      </div>

      {/* Step 1: Product Selection */}
      {step === 1 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-300" onClick={() => handleProductSelect(product)}>
              <CardContent className="p-6 text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{product.description}</p>
                <Button className="mt-4 w-full" variant="outline">Select Plan</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Customize Policy */}
      {step === 2 && selectedProduct && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Customization */}
            <Card>
              <CardHeader>
                <CardTitle>Customize Your {selectedProduct.name} Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Coverage Amount (ETB)</Label>
                  <Input 
                    type="number"
                    value={formData.coverageAmount}
                    onChange={(e) => setFormData({ ...formData, coverageAmount: parseInt(e.target.value) })}
                    min={100000}
                    step={50000}
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum: ETB 100,000</p>
                </div>
                <div>
                  <Label>Term (Months)</Label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={formData.termMonths}
                    onChange={(e) => setFormData({ ...formData, termMonths: parseInt(e.target.value) })}
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months (Quarterly)</option>
                    <option value="6">6 Months (Semi-Annual)</option>
                    <option value="12">12 Months (Annual - Save 10%)</option>
                  </select>
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <Input 
                    type="date"
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vehicles Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicles Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <Label className="text-sm font-medium flex items-center gap-2 text-blue-800">
                    <Info className="h-4 w-4" />
                    How many vehicles do you want to insure?
                  </Label>
                  <div className="flex items-center gap-4 mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVehicleCount(Math.max(1, vehicleCount - 1))}
                      disabled={vehicleCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-3xl font-bold min-w-[80px] text-center text-blue-600">
                      {vehicleCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVehicleCount(Math.min(5, vehicleCount + 1))}
                      disabled={vehicleCount >= 5}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-base font-medium text-gray-700">
                      {vehicleCount === 1 ? 'Vehicle' : 'Vehicles'}
                    </span>
                  </div>
                </div>

                {vehicleCount > 1 && (
                  <div>
                    <Label>Select Vehicle to Edit</Label>
                    <Select value={selectedVehicleIndex.toString()} onValueChange={(val) => setSelectedVehicleIndex(parseInt(val))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map((_, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            Vehicle {idx + 1} {vehicles[idx].make && vehicles[idx].model ? `- ${vehicles[idx].make} ${vehicles[idx].model}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Vehicle {selectedVehicleIndex + 1} Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Make *</Label>
                      <Input value={currentVehicle.make} onChange={(e) => handleVehicleChange('make', e.target.value)} placeholder="e.g., Toyota" />
                      {vehicleErrors.make && <p className="text-xs text-red-500 mt-1">{vehicleErrors.make}</p>}
                    </div>
                    <div>
                      <Label>Model *</Label>
                      <Input value={currentVehicle.model} onChange={(e) => handleVehicleChange('model', e.target.value)} placeholder="e.g., Camry" />
                      {vehicleErrors.model && <p className="text-xs text-red-500 mt-1">{vehicleErrors.model}</p>}
                    </div>
                    <div>
                      <Label>Year *</Label>
                      <Input type="number" value={currentVehicle.yearOfMake} onChange={(e) => handleVehicleChange('yearOfMake', e.target.value)} placeholder="e.g., 2023" />
                      {vehicleErrors.yearOfMake && <p className="text-xs text-red-500 mt-1">{vehicleErrors.yearOfMake}</p>}
                    </div>
                    <div>
                      <Label>Vehicle Type</Label>
                      <Select value={currentVehicle.vehicleType} onValueChange={(val) => handleVehicleChange('vehicleType', val)}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Usage</Label>
                      <Select value={currentVehicle.usage} onValueChange={(val) => handleVehicleChange('usage', val)}>
                        <SelectTrigger><SelectValue placeholder="Select usage" /></SelectTrigger>
                        <SelectContent>{usageOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Plate Number *</Label>
                      <Input value={currentVehicle.plateNumber} onChange={(e) => handleVehicleChange('plateNumber', e.target.value)} placeholder="e.g., AA-1234" />
                      {vehicleErrors.plateNumber && <p className="text-xs text-red-500 mt-1">{vehicleErrors.plateNumber}</p>}
                    </div>
                    <div>
                      <Label>Engine Number</Label>
                      <Input value={currentVehicle.engineNumber} onChange={(e) => handleVehicleChange('engineNumber', e.target.value)} placeholder="Engine number" />
                    </div>
                    <div>
                      <Label>Chassis Number</Label>
                      <Input value={currentVehicle.chassisNumber} onChange={(e) => handleVehicleChange('chassisNumber', e.target.value)} placeholder="Chassis number" />
                    </div>
                    <div>
                      <Label>Vehicle Value (ETB) *</Label>
                      <Input type="number" value={currentVehicle.vehicleValue || ''} onChange={(e) => handleVehicleChange('vehicleValue', parseFloat(e.target.value))} placeholder="Minimum ETB 100,000" />
                      {vehicleErrors.vehicleValue && <p className="text-xs text-red-500 mt-1">{vehicleErrors.vehicleValue}</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Perils Section */}
            {availablePerils.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Perils Coverage</CardTitle>
                  <CardDescription>Select which perils you want to be covered for</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availablePerils.map((peril) => (
                      <div key={peril.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{peril.perilName}</p>
                          <p className="text-sm text-gray-500">{peril.description}</p>
                          <p className="text-xs text-blue-600">
                            Premium: {peril.calculationType === 'PERCENTAGE' 
                              ? `${(peril.premiumRate * 100).toFixed(2)}% of coverage` 
                              : `ETB ${peril.premiumRate.toLocaleString()}`}
                          </p>
                        </div>
                        <Switch
                          checked={selectedPerils.includes(peril.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPerils([...selectedPerils, peril.id]);
                            } else {
                              setSelectedPerils(selectedPerils.filter(id => id !== peril.id));
                            }
                          }}
                          disabled={peril.isDefault}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Riders Section */}
            {availableRiders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Optional Riders</CardTitle>
                  <CardDescription>Enhance your coverage with optional riders</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {availableRiders.map((rider) => (
                      <div key={rider.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{rider.riderName}</p>
                          <p className="text-sm text-gray-500">{rider.description}</p>
                          <p className="text-xs text-blue-600">
                            Premium: {rider.calculationType === 'PERCENTAGE' 
                              ? `${(rider.premiumRate * 100).toFixed(2)}% of coverage` 
                              : `ETB ${rider.premiumRate.toLocaleString()}`}
                            {rider.maxLimit && ` (Max: ETB ${rider.maxLimit.toLocaleString()})`}
                          </p>
                        </div>
                        <Switch
                          checked={selectedRiders.includes(rider.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRiders([...selectedRiders, rider.id]);
                            } else {
                              setSelectedRiders(selectedRiders.filter(id => id !== rider.id));
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Premium Summary */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Premium Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {calculating ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Calculating...</p>
                  </div>
                ) : premiumResult ? (
                  <>
                    <div className="space-y-3">
                      <div className="flex justify-between pb-2 border-b">
                        <span className="text-gray-600">Basic Premium:</span>
                        <span className="font-medium">ETB {premiumResult.basicPremium?.toLocaleString()}</span>
                      </div>
                      
                      {premiumResult.perilPremium > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Perils Premium:</span>
                          <span>ETB {premiumResult.perilPremium?.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {premiumResult.riderPremium > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Riders Premium:</span>
                          <span>ETB {premiumResult.riderPremium?.toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT (15%):</span>
                        <span>ETB {premiumResult.vatAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>DRR (1%):</span>
                        <span>ETB {premiumResult.drrAmount?.toLocaleString()}</span>
                      </div>
                      
                      <div className="flex justify-between font-bold pt-2 border-t mt-2">
                        <span>Total Premium ({formData.termMonths} months):</span>
                        <span className="text-blue-600">ETB {premiumResult.totalPremium?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                        <span>Monthly Payment:</span>
                        <span className="font-semibold">ETB {premiumResult.monthlyPremium?.toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <Button className="w-full mt-4" onClick={() => setStep(3)}>
                      Continue to Review
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Enter coverage amount to calculate premium</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Review & Purchase */}
      {step === 3 && selectedProduct && premiumResult && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Your Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Policy Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">Product:</span><span>{selectedProduct.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Coverage Amount:</span><span>ETB {formData.coverageAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Term:</span><span>{formData.termMonths} months</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Effective Date:</span><span>{new Date(formData.effectiveDate).toLocaleDateString()}</span></div>
                  </div>
                </div>

                {vehicles.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Vehicles Covered ({vehicles.length})</h4>
                    <div className="space-y-2">
                      {vehicles.map((vehicle, idx) => (
                        <div key={idx} className="border-t pt-2 first:border-t-0 first:pt-0">
                          <p className="font-medium">Vehicle {idx + 1}: {vehicle.make} {vehicle.model} ({vehicle.yearOfMake})</p>
                          <p className="text-sm text-gray-600">Plate: {vehicle.plateNumber} | Value: ETB {vehicle.vehicleValue?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Before You Proceed</p>
                      <p className="text-xs text-yellow-700 mt-1">Please review the policy documents carefully. By purchasing this policy, you agree to all terms, conditions, exclusions, and disclaimers.</p>
                      <button onClick={() => setShowDocuments(true)} className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View Policy Documents
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <input type="checkbox" id="agreeToTerms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
                    I confirm that I have read, understood, and agree to be bound by the Policy Documents.
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-6">
              <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-gray-600">Basic Premium:</span><span>ETB {premiumResult.basicPremium?.toLocaleString()}</span></div>
                  {premiumResult.perilPremium > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Perils:</span><span>ETB {premiumResult.perilPremium?.toLocaleString()}</span></div>
                  )}
                  {premiumResult.riderPremium > 0 && (
                    <div className="flex justify-between text-sm"><span className="text-gray-600">Riders:</span><span>ETB {premiumResult.riderPremium?.toLocaleString()}</span></div>
                  )}
                  <div className="flex justify-between text-sm"><span className="text-gray-600">VAT (15%):</span><span>ETB {premiumResult.vatAmount?.toLocaleString()}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600">DRR (1%):</span><span>ETB {premiumResult.drrAmount?.toLocaleString()}</span></div>
                  <div className="flex justify-between font-bold pt-2 border-t mt-2">
                    <span>Total ({formData.termMonths} months):</span>
                    <span className="text-blue-600">ETB {premiumResult.totalPremium?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                    <span>Monthly Payment:</span>
                    <span className="font-semibold">ETB {premiumResult.monthlyPremium?.toLocaleString()}</span>
                  </div>
                </div>
                
                <Button onClick={handleSubmit} disabled={loading || !agreedToTerms} className="w-full bg-green-600 hover:bg-green-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  {loading ? 'Processing...' : 'Confirm & Purchase'}
                </Button>
                
                <Button variant="outline" className="w-full" onClick={() => setStep(2)}>Back to Edit</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Policy Documents Modal */}
      {createdPolicyId && (
        <PolicyDocuments policyId={createdPolicyId} policyNumber={createdPolicyNumber} open={showDocuments} onClose={handleDocumentsClose} />
      )}
    </div>
  );
}