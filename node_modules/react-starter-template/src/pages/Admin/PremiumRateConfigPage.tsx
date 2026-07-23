import * as React from 'react';
import { 
  DollarSign, Plus, Edit2, Trash2, RefreshCw, TrendingUp, TrendingDown, 
  Shield, FileText, Heart, Home, Car, Plane, Percent, X, Check,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { usePremiumRatesStore, PremiumRate } from '../../stores/premiumRatesStore';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import axiosInstance from '../../lib/axios';

interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  is_active: boolean;
}

interface Peril {
  id: string;
  productId: string;
  perilName: string;
  description: string;
  premiumRate: number;
  calculationType: string;
  minCoverage: number | null;
  maxCoverage: number | null;
  isDefault: boolean;
  isOptional: boolean;
  displayOrder: number;
  isActive: boolean;
}

interface Rider {
  id: string;
  productId: string;
  riderName: string;
  description: string;
  premiumRate: number;
  calculationType: string;
  minCoverage: number | null;
  maxCoverage: number | null;
  maxLimit: number | null;
  isOptional: boolean;
  displayOrder: number;
  isActive: boolean;
}

export default function PremiumRateConfigPage() {
  const { rates, products, isLoading, fetchRates, fetchProducts, createRate, updateRate, deleteRate, toggleRateStatus } = usePremiumRatesStore();
  const [selectedProductId, setSelectedProductId] = React.useState<string>('');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [perils, setPerils] = React.useState<Peril[]>([]);
  const [riders, setRiders] = React.useState<Rider[]>([]);
  const [activeTab, setActiveTab] = React.useState('rates');
  
  // Rate form state
  const [isRateDialogOpen, setIsRateDialogOpen] = React.useState(false);
  const [editingRate, setEditingRate] = React.useState<PremiumRate | null>(null);
  const [rateForm, setRateForm] = React.useState({
    coverage_tier: '',
    base_rate: 0,
    min_coverage: 0,
    max_coverage: '',
    risk_factor: 1.0,
    is_active: true
  });

  // Peril form state
  const [isPerilDialogOpen, setIsPerilDialogOpen] = React.useState(false);
  const [editingPeril, setEditingPeril] = React.useState<Peril | null>(null);
  const [perilForm, setPerilForm] = React.useState({
    perilName: '',
    description: '',
    premiumRate: 0,
    calculationType: 'PERCENTAGE',
    minCoverage: '',
    maxCoverage: '',
    isDefault: false,
    isOptional: true,
    displayOrder: 0,
    isActive: true
  });

  // Rider form state
  const [isRiderDialogOpen, setIsRiderDialogOpen] = React.useState(false);
  const [editingRider, setEditingRider] = React.useState<Rider | null>(null);
  const [riderForm, setRiderForm] = React.useState({
    riderName: '',
    description: '',
    premiumRate: 0,
    calculationType: 'PERCENTAGE',
    minCoverage: '',
    maxCoverage: '',
    maxLimit: '',
    isOptional: true,
    displayOrder: 0,
    isActive: true
  });

  React.useEffect(() => {
    fetchProducts();
  }, []);

  React.useEffect(() => {
    if (selectedProductId) {
      fetchRatesForProduct();
      fetchPerilsForProduct();
      fetchRidersForProduct();
    }
  }, [selectedProductId]);

  const fetchRatesForProduct = async () => {
    try {
      const response = await axiosInstance.get(`/premium-rates/product/${selectedProductId}`);
      // Update rates in store or local state
    } catch (error) {
      console.error('Failed to fetch rates:', error);
    }
  };

  const fetchPerilsForProduct = async () => {
    try {
      const response = await axiosInstance.get(`/perils/product/${selectedProductId}`);
      setPerils(response.data);
    } catch (error) {
      console.error('Failed to fetch perils:', error);
      setPerils([]);
    }
  };

  const fetchRidersForProduct = async () => {
    try {
      const response = await axiosInstance.get(`/riders/product/${selectedProductId}`);
      setRiders(response.data);
    } catch (error) {
      console.error('Failed to fetch riders:', error);
      setRiders([]);
    }
  };

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
  };

  // Rate CRUD
  const handleRateSubmit = async () => {
    if (!rateForm.coverage_tier || rateForm.base_rate <= 0 || rateForm.min_coverage <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        product_id: selectedProductId,
        coverage_tier: rateForm.coverage_tier,
        base_rate: rateForm.base_rate,
        min_coverage: rateForm.min_coverage,
        max_coverage: rateForm.max_coverage ? parseFloat(rateForm.max_coverage) : null,
        risk_factor: rateForm.risk_factor,
        is_active: rateForm.is_active
      };

      if (editingRate) {
        await updateRate(editingRate.id, payload);
        toast.success('Rate updated successfully');
      } else {
        await createRate(payload);
        toast.success('Rate created successfully');
      }
      setIsRateDialogOpen(false);
      resetRateForm();
      fetchRates();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save rate');
    }
  };

  // Peril CRUD
  const handlePerilSubmit = async () => {
    if (!perilForm.perilName || perilForm.premiumRate <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        productId: selectedProductId,
        perilName: perilForm.perilName,
        description: perilForm.description,
        premiumRate: perilForm.premiumRate,
        calculationType: perilForm.calculationType,
        minCoverage: perilForm.minCoverage ? parseFloat(perilForm.minCoverage) : null,
        maxCoverage: perilForm.maxCoverage ? parseFloat(perilForm.maxCoverage) : null,
        isDefault: perilForm.isDefault,
        isOptional: perilForm.isOptional,
        displayOrder: perilForm.displayOrder,
        isActive: perilForm.isActive
      };

      if (editingPeril) {
        await axiosInstance.put(`/perils/${editingPeril.id}`, payload);
        toast.success('Peril updated successfully');
      } else {
        await axiosInstance.post('/perils', payload);
        toast.success('Peril created successfully');
      }
      setIsPerilDialogOpen(false);
      resetPerilForm();
      fetchPerilsForProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save peril');
    }
  };

  // Rider CRUD
  const handleRiderSubmit = async () => {
    if (!riderForm.riderName || riderForm.premiumRate <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        productId: selectedProductId,
        riderName: riderForm.riderName,
        description: riderForm.description,
        premiumRate: riderForm.premiumRate,
        calculationType: riderForm.calculationType,
        minCoverage: riderForm.minCoverage ? parseFloat(riderForm.minCoverage) : null,
        maxCoverage: riderForm.maxCoverage ? parseFloat(riderForm.maxCoverage) : null,
        maxLimit: riderForm.maxLimit ? parseFloat(riderForm.maxLimit) : null,
        isOptional: riderForm.isOptional,
        displayOrder: riderForm.displayOrder,
        isActive: riderForm.isActive
      };

      if (editingRider) {
        await axiosInstance.put(`/riders/${editingRider.id}`, payload);
        toast.success('Rider updated successfully');
      } else {
        await axiosInstance.post('/riders', payload);
        toast.success('Rider created successfully');
      }
      setIsRiderDialogOpen(false);
      resetRiderForm();
      fetchRidersForProduct();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save rider');
    }
  };

  const resetRateForm = () => {
    setEditingRate(null);
    setRateForm({
      coverage_tier: '',
      base_rate: 0,
      min_coverage: 0,
      max_coverage: '',
      risk_factor: 1.0,
      is_active: true
    });
  };

  const resetPerilForm = () => {
    setEditingPeril(null);
    setPerilForm({
      perilName: '',
      description: '',
      premiumRate: 0,
      calculationType: 'PERCENTAGE',
      minCoverage: '',
      maxCoverage: '',
      isDefault: false,
      isOptional: true,
      displayOrder: 0,
      isActive: true
    });
  };

  const resetRiderForm = () => {
    setEditingRider(null);
    setRiderForm({
      riderName: '',
      description: '',
      premiumRate: 0,
      calculationType: 'PERCENTAGE',
      minCoverage: '',
      maxCoverage: '',
      maxLimit: '',
      isOptional: true,
      displayOrder: 0,
      isActive: true
    });
  };

  const getProductIcon = (code: string) => {
    switch (code) {
      case 'AUTO': return <Car className="h-5 w-5" />;
      case 'HOME': return <Home className="h-5 w-5" />;
      case 'LIFE': return <Heart className="h-5 w-5" />;
      case 'HEALTH': return <Heart className="h-5 w-5" />;
      case 'TRAVEL': return <Plane className="h-5 w-5" />;
      default: return <DollarSign className="h-5 w-5" />;
    }
  };

  // Filter rates for selected product
  const productRates = rates.filter(r => r.product_id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Premium Rate Configuration</h1>
          <p className="text-gray-500 mt-1">Configure base rates, perils, and riders for each product</p>
        </div>
        <Button onClick={() => { fetchProducts(); fetchRates(); }} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Product Selector */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium">Select Product</Label>
          <Select value={selectedProductId} onValueChange={handleProductSelect}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a product to configure" />
            </SelectTrigger>
            <SelectContent>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    {getProductIcon(product.code)}
                    <span>{product.name}</span>
                    <Badge variant="outline" className="ml-2">{product.code}</Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProduct && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="rates" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Base Rates
            </TabsTrigger>
            <TabsTrigger value="perils" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Perils
            </TabsTrigger>
            <TabsTrigger value="riders" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Riders
            </TabsTrigger>
          </TabsList>

          {/* ==================== BASE RATES TAB ==================== */}
          <TabsContent value="rates" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#1A3E6F]" onClick={resetRateForm}>
                    <Plus className="mr-2 h-4 w-4" /> Add Rate Tier
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingRate ? 'Edit Rate Tier' : 'Add Rate Tier'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Coverage Tier *</Label>
                      <Input 
                        value={rateForm.coverage_tier}
                        onChange={(e) => setRateForm({...rateForm, coverage_tier: e.target.value})}
                        placeholder="e.g., Basic, Standard, Premium"
                      />
                    </div>
                    <div>
                      <Label>Base Rate (%) *</Label>
                      <Input 
                        type="number"
                        step="0.001"
                        value={rateForm.base_rate}
                        onChange={(e) => setRateForm({...rateForm, base_rate: parseFloat(e.target.value)})}
                        placeholder="e.g., 0.035 = 3.5%"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Coverage (ETB) *</Label>
                        <Input 
                          type="number"
                          value={rateForm.min_coverage}
                          onChange={(e) => setRateForm({...rateForm, min_coverage: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div>
                        <Label>Max Coverage (ETB)</Label>
                        <Input 
                          type="number"
                          value={rateForm.max_coverage}
                          onChange={(e) => setRateForm({...rateForm, max_coverage: e.target.value})}
                          placeholder="Leave empty for unlimited"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Risk Factor</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        value={rateForm.risk_factor}
                        onChange={(e) => setRateForm({...rateForm, risk_factor: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Active</Label>
                      <Switch 
                        checked={rateForm.is_active}
                        onCheckedChange={(val) => setRateForm({...rateForm, is_active: val})}
                      />
                    </div>
                    <Button onClick={handleRateSubmit} className="w-full bg-[#1A3E6F]">
                      {editingRate ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {productRates.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No rate tiers configured for {selectedProduct.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Rate Tier" to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {productRates.map((rate) => (
                  <Card key={rate.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{rate.coverage_tier}</h3>
                          <p className="text-sm text-gray-500">
                            Coverage: ETB {rate.min_coverage.toLocaleString()} - {rate.max_coverage ? rate.max_coverage.toLocaleString() : 'Unlimited'}
                          </p>
                          <div className="flex gap-4 mt-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              Rate: {(rate.base_rate * 100).toFixed(2)}%
                            </Badge>
                            <Badge className="bg-purple-100 text-purple-800">
                              Risk: {rate.risk_factor}x
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingRate(rate);
                            setRateForm({
                              coverage_tier: rate.coverage_tier,
                              base_rate: rate.base_rate,
                              min_coverage: rate.min_coverage,
                              max_coverage: rate.max_coverage?.toString() || '',
                              risk_factor: rate.risk_factor,
                              is_active: rate.is_active
                            });
                            setIsRateDialogOpen(true);
                          }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRate(rate.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== PERILS TAB ==================== */}
          <TabsContent value="perils" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isPerilDialogOpen} onOpenChange={setIsPerilDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#1A3E6F]" onClick={resetPerilForm}>
                    <Plus className="mr-2 h-4 w-4" /> Add Peril
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingPeril ? 'Edit Peril' : 'Add Peril'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Peril Name *</Label>
                      <Input 
                        value={perilForm.perilName}
                        onChange={(e) => setPerilForm({...perilForm, perilName: e.target.value})}
                        placeholder="e.g., Collision, Theft, Fire"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={perilForm.description}
                        onChange={(e) => setPerilForm({...perilForm, description: e.target.value})}
                        placeholder="Describe what this peril covers"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Premium Rate *</Label>
                        <div className="relative">
                          <Input 
                            type="number"
                            step="0.001"
                            value={perilForm.premiumRate}
                            onChange={(e) => setPerilForm({...perilForm, premiumRate: parseFloat(e.target.value)})}
                            className="pl-8"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {perilForm.calculationType === 'PERCENTAGE' ? '%' : 'ETB'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label>Calculation Type</Label>
                        <Select 
                          value={perilForm.calculationType}
                          onValueChange={(val) => setPerilForm({...perilForm, calculationType: val})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage of Coverage</SelectItem>
                            <SelectItem value="FIXED">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Min Coverage (ETB)</Label>
                        <Input 
                          type="number"
                          value={perilForm.minCoverage}
                          onChange={(e) => setPerilForm({...perilForm, minCoverage: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Max Coverage (ETB)</Label>
                        <Input 
                          type="number"
                          value={perilForm.maxCoverage}
                          onChange={(e) => setPerilForm({...perilForm, maxCoverage: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Default Peril (auto-included)</Label>
                      <Switch 
                        checked={perilForm.isDefault}
                        onCheckedChange={(val) => setPerilForm({...perilForm, isDefault: val})}
                      />
                    </div>
                    <Button onClick={handlePerilSubmit} className="w-full bg-[#1A3E6F]">
                      {editingPeril ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {perils.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No perils configured for {selectedProduct.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Peril" to configure covered risks</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {perils.map((peril) => (
                  <Card key={peril.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{peril.perilName}</h3>
                            {peril.isDefault && <Badge className="bg-green-100 text-green-800">Default</Badge>}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{peril.description}</p>
                          <div className="flex gap-4 mt-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              {peril.calculationType === 'PERCENTAGE' 
                                ? `${(peril.premiumRate * 100).toFixed(2)}% of coverage` 
                                : `ETB ${peril.premiumRate.toLocaleString()} fixed`}
                            </Badge>
                            {peril.minCoverage && (
                              <Badge variant="outline">Min: ETB {peril.minCoverage.toLocaleString()}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingPeril(peril);
                            setPerilForm({
                              perilName: peril.perilName,
                              description: peril.description || '',
                              premiumRate: peril.premiumRate,
                              calculationType: peril.calculationType,
                              minCoverage: peril.minCoverage?.toString() || '',
                              maxCoverage: peril.maxCoverage?.toString() || '',
                              isDefault: peril.isDefault,
                              isOptional: peril.isOptional,
                              displayOrder: peril.displayOrder,
                              isActive: peril.isActive
                            });
                            setIsPerilDialogOpen(true);
                          }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            if (confirm('Delete this peril?')) {
                              await axiosInstance.delete(`/perils/${peril.id}`);
                              fetchPerilsForProduct();
                              toast.success('Peril deleted');
                            }
                          }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== RIDERS TAB ==================== */}
          <TabsContent value="riders" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isRiderDialogOpen} onOpenChange={setIsRiderDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#1A3E6F]" onClick={resetRiderForm}>
                    <Plus className="mr-2 h-4 w-4" /> Add Rider
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingRider ? 'Edit Rider' : 'Add Rider'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Rider Name *</Label>
                      <Input 
                        value={riderForm.riderName}
                        onChange={(e) => setRiderForm({...riderForm, riderName: e.target.value})}
                        placeholder="e.g., Accidental Death Benefit, Dental Coverage"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={riderForm.description}
                        onChange={(e) => setRiderForm({...riderForm, description: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Premium Rate *</Label>
                        <div className="relative">
                          <Input 
                            type="number"
                            step="0.001"
                            value={riderForm.premiumRate}
                            onChange={(e) => setRiderForm({...riderForm, premiumRate: parseFloat(e.target.value)})}
                            className="pl-8"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {riderForm.calculationType === 'PERCENTAGE' ? '%' : 'ETB'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <Label>Calculation Type</Label>
                        <Select 
                          value={riderForm.calculationType}
                          onValueChange={(val) => setRiderForm({...riderForm, calculationType: val})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentage of Coverage</SelectItem>
                            <SelectItem value="FIXED">Fixed Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Maximum Limit (ETB)</Label>
                      <Input 
                        type="number"
                        value={riderForm.maxLimit}
                        onChange={(e) => setRiderForm({...riderForm, maxLimit: e.target.value})}
                        placeholder="Maximum payout limit"
                      />
                    </div>
                    <Button onClick={handleRiderSubmit} className="w-full bg-[#1A3E6F]">
                      {editingRider ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {riders.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No riders configured for {selectedProduct.name}</p>
                  <p className="text-sm text-gray-400 mt-1">Click "Add Rider" to configure optional coverages</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {riders.map((rider) => (
                  <Card key={rider.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{rider.riderName}</h3>
                          <p className="text-sm text-gray-600 mt-1">{rider.description}</p>
                          <div className="flex gap-4 mt-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              {rider.calculationType === 'PERCENTAGE' 
                                ? `${(rider.premiumRate * 100).toFixed(2)}% of coverage` 
                                : `ETB ${rider.premiumRate.toLocaleString()} fixed`}
                            </Badge>
                            {rider.maxLimit && (
                              <Badge className="bg-purple-100 text-purple-800">
                                Max: ETB {rider.maxLimit.toLocaleString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setEditingRider(rider);
                            setRiderForm({
                              riderName: rider.riderName,
                              description: rider.description || '',
                              premiumRate: rider.premiumRate,
                              calculationType: rider.calculationType,
                              minCoverage: rider.minCoverage?.toString() || '',
                              maxCoverage: rider.maxCoverage?.toString() || '',
                              maxLimit: rider.maxLimit?.toString() || '',
                              isOptional: rider.isOptional,
                              displayOrder: rider.displayOrder,
                              isActive: rider.isActive
                            });
                            setIsRiderDialogOpen(true);
                          }}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            if (confirm('Delete this rider?')) {
                              await axiosInstance.delete(`/riders/${rider.id}`);
                              fetchRidersForProduct();
                              toast.success('Rider deleted');
                            }
                          }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedProductId && (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Select a product from the dropdown above to configure rates</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}