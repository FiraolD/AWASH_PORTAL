import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, DollarSign, Calendar, AlertCircle, Loader2,
  CheckCircle, FileText, Eye, Copy, Info, ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Switch } from '../../components/ui/Switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuthStore } from '../../stores/authStore';
import PolicyDocuments from '../../components/PolicyDocuments';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface CustomField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  requires_approval: boolean;
  is_active: boolean;
  customFields?: CustomField[];
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

// ----------------------------------------------------------------------------
// Multi‑Select Dropdown Component
// ----------------------------------------------------------------------------
interface MultiSelectProps {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}) => {
  const handleToggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selected.length > 0 ? `${selected.length} selected` : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
          {options.map(option => (
            <div
              key={option.value}
              className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
              onClick={() => handleToggle(option.value)}
            >
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
                onClick={e => e.stopPropagation()}
              />
              <Label className="flex-1 cursor-pointer select-none">{option.label}</Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ----------------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------------
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
  const [submissionComplete, setSubmissionComplete] = React.useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = React.useState<CustomField[]>([]);
  const [fieldValues, setFieldValues] = React.useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [fetchingFields, setFetchingFields] = React.useState(false);

  // Perils & Riders (optional)
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
    productDetails: {} as Record<string, any>,
  });

  // ----------------------------------------------------------------------------
  // Data fetching
  // ----------------------------------------------------------------------------
  React.useEffect(() => {
    fetchProducts();
  }, []);

  React.useEffect(() => {
    if (formData.coverageAmount >= 100000 && formData.productType) {
      calculatePremium();
    }
  }, [formData.coverageAmount, formData.productType, formData.termMonths, selectedPerils, selectedRiders, fieldValues]);

  React.useEffect(() => {
    if (formData.productId && formData.productType) {
      fetchPerilsAndRiders();
    }
  }, [formData.productId, formData.productType]);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/products/available');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

const fetchCustomFields = async (productId: string, productType: string) => {
  setFetchingFields(true);
  try {
    // Attempt 1: Direct product endpoint
    try {
      const res = await axiosInstance.get(`/products/${productId}`);
      const product = res.data;
      
      // Check multiple possible property names
      let fields = product.customFields || product.fields || product.formFields || product.productFields;
      
      if (Array.isArray(fields) && fields.length > 0) {
        console.log('[fetchCustomFields] Found fields in product:', fields);
        setCustomFields(normalizeFields(fields));
        return;
      }
    } catch { /* ignore */ }

    // Attempt 2: Dedicated fields endpoint
    try {
      const res = await axiosInstance.get(`/products/${productId}/fields`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        console.log('[fetchCustomFields] Found fields via /fields endpoint:', res.data);
        setCustomFields(normalizeFields(res.data));
        return;
      }
    } catch { /* ignore */ }

    // Attempt 3: Fields by product type code
    if (productType) {
      try {
        const res = await axiosInstance.get(`/policies/fields/${productType}`);
        if (Array.isArray(res.data) && res.data.length > 0) {
          console.log('[fetchCustomFields] Found fields via type endpoint:', res.data);
          setCustomFields(normalizeFields(res.data));
          return;
        }
      } catch { /* ignore */ }
    }

    // If no fields found
    console.warn('[fetchCustomFields] No fields found for product:', productId);
    setCustomFields([]);
  } catch (error) {
    console.error('[fetchCustomFields] Error:', error);
    toast.error('Could not load product fields');
    setCustomFields([]);
  } finally {
    setFetchingFields(false);
  }
};

// Normalize field definitions to match our expected format
const normalizeFields = (fields: any[]): CustomField[] => {
  return fields.map((field: any) => ({
    name: field.name || field.fieldName || field.key || field.id || '',
    label: field.label || field.displayName || field.title || field.name || field.fieldName || 'Unnamed Field',
    type: normalizeFieldType(field.type || field.fieldType || 'text'),
    required: field.required || field.isRequired || false,
    options: field.options || field.choices || field.selectOptions || [],
    placeholder: field.placeholder || field.hint || ''
  }));
};

const normalizeFieldType = (type: string): CustomField['type'] => {
  const typeMap: Record<string, CustomField['type']> = {
    'string': 'text',
    'integer': 'number',
    'decimal': 'number',
    'float': 'number',
    'boolean': 'checkbox',
    'datetime': 'date',
    'dropdown': 'select',
    'choice': 'select',
    'enum': 'select',
    'multiline': 'textarea',
  };
  return typeMap[type.toLowerCase()] || 'text';
};

  const fetchPerilsAndRiders = async () => {
    try {
      const [perilsRes, ridersRes] = await Promise.all([
        axiosInstance.get(`/policies/perils/${formData.productType}`),
        axiosInstance.get(`/policies/riders/${formData.productType}`),
      ]);
      setAvailablePerils(perilsRes.data);
      setAvailableRiders(ridersRes.data);
      // Set default perils (those that are marked as default)
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
      const response = await axiosInstance.post('/policies/calculate-premium', {
        productType: formData.productType,
        coverageAmount: formData.coverageAmount,
        termMonths: formData.termMonths,
        productDetails: fieldValues,
        selectedPerils,
        selectedRiders,
      });
      setPremiumResult(response.data);
    } catch (error) {
      console.error('Premium calculation failed:', error);
      toast.error('Failed to calculate premium');
    } finally {
      setCalculating(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Product selection & custom fields
  // ----------------------------------------------------------------------------
  const handleProductSelect = async (product: Product) => {
    setFormData({
      ...formData,
      productType: product.code,
      productId: product.id,
    });
    setFieldValues({});
    setFieldErrors({});

    // If product already contains customFields (rare), use them
    if (product.customFields && product.customFields.length > 0) {
      setCustomFields(product.customFields);
      setStep(2);
      return;
    }

    // Otherwise, fetch them dynamically
    await fetchCustomFields(product.id, product.code);
    setStep(2);
  };

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

  const validateCustomFields = () => {
    const errors: Record<string, string> = {};
    customFields.forEach(field => {
      if (field.required) {
        const value = fieldValues[field.name];
        if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
          errors[field.name] = `${field.label} is required`;
        }
      }
    });
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ----------------------------------------------------------------------------
  // Render field helper
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
              {field.options?.map(opt => (
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
  // Submission
  // ----------------------------------------------------------------------------
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
    if (!validateCustomFields()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: formData.productType,
        coverageAmount: formData.coverageAmount,
        premiumFrequency: formData.termMonths === 12 ? 'ANNUALLY' : formData.termMonths === 3 ? 'QUARTERLY' : 'MONTHLY',
        effectiveDate: formData.effectiveDate,
        expirationDate: new Date(new Date(formData.effectiveDate).setFullYear(new Date(formData.effectiveDate).getFullYear() + 1)).toISOString().split('T')[0],
        productDetails: fieldValues,
        selectedPerils,
        selectedRiders,
      };

      const response = await axiosInstance.post('/policies', payload);
      setCreatedPolicyId(response.data.policyId);
      setCreatedPolicyNumber(response.data.policyNumber);
      setSubmissionComplete(true);
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

  // ----------------------------------------------------------------------------
  // Success page (unchanged from earlier correct version)
  // ----------------------------------------------------------------------------
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
                <button onClick={copyPolicyNumber} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Copy policy number">
                  <Copy className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Please save this policy number for future reference</p>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleViewPolicies} className="bg-[#1A3E6F] hover:bg-[#153358]">View My Policies</Button>
              <Button variant="outline" onClick={() => setShowDocuments(true)}>
                <FileText className="mr-2 h-4 w-4" /> View Policy Documents
              </Button>
            </div>
          </CardContent>
        </Card>

        {createdPolicyId && (
          <PolicyDocuments policyId={createdPolicyId} policyNumber={createdPolicyNumber} open={showDocuments} onClose={handleDocumentsClose} />
        )}
      </div>
    );
  }

  // ----------------------------------------------------------------------------
  // Main render
  // ----------------------------------------------------------------------------
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

            {/* Dynamic Custom Fields */}
            {fetchingFields ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                  <span>Loading product details...</span>
                </CardContent>
              </Card>
            ) : customFields.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Policy Details
                  </CardTitle>
                  <CardDescription>
                    Fill in the required information for your {selectedProduct.name} policy
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {customFields.map(field => (
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
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  No additional details required for this product.
                </CardContent>
              </Card>
            )}

            {/* Perils Section (Optional) */}
            {availablePerils.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Perils Coverage</CardTitle>
                  <CardDescription>
                    Select which perils you want to be covered for (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MultiSelect
                    placeholder="No perils selected..."
                    options={availablePerils.map(p => ({
                      label: `${p.perilName} (${p.calculationType === 'PERCENTAGE' ? (p.premiumRate * 100).toFixed(2) + '%' : 'ETB ' + p.premiumRate.toLocaleString()})`,
                      value: p.id,
                    }))}
                    selected={selectedPerils}
                    onChange={setSelectedPerils}
                  />
             
                </CardContent>
              </Card>
            )}

            {/* Riders Section (Optional) */}
            {availableRiders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Optional Riders</CardTitle>
                  <CardDescription>
                    Enhance your coverage with optional riders (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MultiSelect
                    placeholder="No riders selected..."
                    options={availableRiders.map(r => ({
                      label: `${r.riderName} (${r.calculationType === 'PERCENTAGE' ? (r.premiumRate * 100).toFixed(2) + '%' : 'ETB ' + r.premiumRate.toLocaleString()})`,
                      value: r.id,
                    }))}
                    selected={selectedRiders}
                    onChange={setSelectedRiders}
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Premium Summary (unchanged) */}
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

                {/* Custom fields in review */}
                {customFields.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Additional Details</h4>
                    <div className="space-y-2 text-sm">
                      {customFields.map(field => (
                        <div key={field.name} className="flex justify-between">
                          <span className="text-gray-600">{field.label}:</span>
                          <span>
                            {field.type === 'checkbox'
                              ? fieldValues[field.name] ? 'Yes' : 'No'
                              : fieldValues[field.name] || 'N/A'}
                          </span>
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
                      <p className="text-xs text-yellow-700 mt-1">
                        Please review the policy documents carefully. By purchasing this policy, you agree to all terms, conditions, exclusions, and disclaimers.
                      </p>
                      <button onClick={() => setShowDocuments(true)} className="text-xs text-blue-600 hover:underline mt-2 flex items-center gap-1">
                        <Eye className="h-3 w-3" /> View Policy Documents
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 mt-4">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
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

                <Button variant="outline" className="w-full" onClick={() => setStep(2)}>
                  Back to Edit
                </Button>
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