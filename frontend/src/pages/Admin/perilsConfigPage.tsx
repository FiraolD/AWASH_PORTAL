import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, RefreshCw, TrendingUp, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  code: string;
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

export default function PerilsConfigPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [perils, setPerils] = useState<Peril[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPeril, setEditingPeril] = useState<Peril | null>(null);
  const [formData, setFormData] = useState({
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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      fetchPerils();
    }
  }, [selectedProductId]);

  const fetchProducts = async () => {
    try {
      const response = await axiosInstance.get('/products');
      setProducts(response.data);
      if (response.data.length > 0) {
        setSelectedProductId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchPerils = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/perils/product/${selectedProductId}`);
      setPerils(response.data);
    } catch (error) {
      console.error('Failed to fetch perils:', error);
      toast.error('Failed to load perils');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.perilName || formData.premiumRate <= 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        productId: selectedProductId,
        perilName: formData.perilName,
        description: formData.description,
        premiumRate: parseFloat(formData.premiumRate.toString()),
        calculationType: formData.calculationType,
        minCoverage: formData.minCoverage ? parseFloat(formData.minCoverage) : null,
        maxCoverage: formData.maxCoverage ? parseFloat(formData.maxCoverage) : null,
        isDefault: formData.isDefault,
        isOptional: formData.isOptional,
        displayOrder: parseInt(formData.displayOrder.toString()),
        isActive: formData.isActive
      };

      if (editingPeril) {
        await axiosInstance.put(`/perils/${editingPeril.id}`, payload);
        toast.success('Peril updated successfully');
      } else {
        await axiosInstance.post('/perils', payload);
        toast.success('Peril created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchPerils();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save peril');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this peril?')) return;
    try {
      await axiosInstance.delete(`/perils/${id}`);
      toast.success('Peril deleted successfully');
      fetchPerils();
    } catch (error) {
      toast.error('Failed to delete peril');
    }
  };

  const handleEdit = (peril: Peril) => {
    setEditingPeril(peril);
    setFormData({
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
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPeril(null);
    setFormData({
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

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Perils Configuration</h1>
          <p className="text-gray-500 mt-1">Configure covered perils and their premium rates</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPerils} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A3E6F]" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" /> Add Peril
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPeril ? 'Edit Peril' : 'Add New Peril'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product</Label>
                  <Input value={selectedProduct?.name} disabled className="bg-gray-50" />
                </div>
                <div>
                  <Label>Peril Name *</Label>
                  <Input 
                    value={formData.perilName}
                    onChange={(e) => setFormData({...formData, perilName: e.target.value})}
                    placeholder="e.g., Collision, Theft, Fire"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
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
                        value={formData.premiumRate}
                        onChange={(e) => setFormData({...formData, premiumRate: parseFloat(e.target.value)})}
                        className="pl-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {formData.calculationType === 'PERCENTAGE' ? '%' : 'ETB'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label>Calculation Type</Label>
                    <Select 
                      value={formData.calculationType}
                      onValueChange={(val) => setFormData({...formData, calculationType: val})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENTAGE">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" /> Percentage of Coverage
                          </div>
                        </SelectItem>
                        <SelectItem value="FIXED">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Fixed Amount
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Coverage (ETB)</Label>
                    <Input 
                      type="number"
                      value={formData.minCoverage}
                      onChange={(e) => setFormData({...formData, minCoverage: e.target.value})}
                      placeholder="Minimum coverage amount"
                    />
                  </div>
                  <div>
                    <Label>Max Coverage (ETB)</Label>
                    <Input 
                      type="number"
                      value={formData.maxCoverage}
                      onChange={(e) => setFormData({...formData, maxCoverage: e.target.value})}
                      placeholder="Maximum coverage amount"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Default Peril</Label>
                    <Switch 
                      checked={formData.isDefault}
                      onCheckedChange={(val) => setFormData({...formData, isDefault: val})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Optional (Customer can opt out)</Label>
                    <Switch 
                      checked={formData.isOptional}
                      onCheckedChange={(val) => setFormData({...formData, isOptional: val})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Display Order</Label>
                    <Input 
                      type="number"
                      value={formData.displayOrder}
                      onChange={(e) => setFormData({...formData, displayOrder: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch 
                      checked={formData.isActive}
                      onCheckedChange={(val) => setFormData({...formData, isActive: val})}
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSubmit} className="flex-1 bg-[#1A3E6F]">
                    {editingPeril ? 'Update' : 'Create'}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Product Selector */}
      <Card>
        <CardContent className="p-4">
          <Label>Select Product</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map(product => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Perils List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {selectedProduct?.name} - Covered Perils
          </CardTitle>
          <CardDescription>Configure premium rates for each peril</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : perils.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No perils configured for this product</p>
              <p className="text-sm mt-1">Click "Add Peril" to create coverage options</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-3">Peril Name</th>
                    <th className="text-left py-3">Description</th>
                    <th className="text-center py-3">Premium Rate</th>
                    <th className="text-center py-3">Type</th>
                    <th className="text-center py-3">Default</th>
                    <th className="text-center py-3">Status</th>
                    <th className="text-center py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {perils.map((peril) => (
                    <tr key={peril.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium">{peril.perilName}</td>
                      <td className="py-3 text-sm text-gray-600">{peril.description || '-'}</td>
                      <td className="py-3 text-center">
                        <Badge className="bg-blue-100 text-blue-800">
                          {peril.calculationType === 'PERCENTAGE' 
                            ? `${(peril.premiumRate * 100).toFixed(2)}%` 
                            : `ETB ${peril.premiumRate.toLocaleString()}`}
                        </Badge>
                      </td>
                      <td className="py-3 text-center text-sm">{peril.calculationType}</td>
                      <td className="py-3 text-center">
                        {peril.isDefault && <Badge className="bg-green-100 text-green-800">Default</Badge>}
                      </td>
                      <td className="py-3 text-center">
                        <Badge className={peril.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {peril.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                       </td>
                      <td className="py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(peril)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(peril.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How Peril Premiums Work</p>
            <p className="text-xs text-blue-700 mt-1">
              • <strong>Percentage Type:</strong> Premium = Coverage Amount × Rate<br />
              • <strong>Fixed Type:</strong> Premium = Fixed Amount (regardless of coverage)<br />
              • Default perils are automatically included in every policy<br />
              • Optional perils can be selected/deselected by customers<br />
              • Min/Max coverage limits determine when the peril applies
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}