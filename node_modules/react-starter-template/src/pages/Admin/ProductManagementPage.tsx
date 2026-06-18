import * as React from 'react';
import { Package, Plus, Edit2, Trash2, Eye, RefreshCw, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface Product {
  id: string;
  name: string;
  description: string;
  code: string;
  category: string;
  isActive: boolean;
  requiresApproval?: boolean;
  approvalFlow?: string;
  createdAt: string;
}

interface ProductField {
  id: string;
  product_id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  options: string[];
  displayOrder: number;
}

export default function ProductManagementPage() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  const [productFields, setProductFields] = React.useState<ProductField[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isProductDialogOpen, setIsProductDialogOpen] = React.useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = React.useState(false);
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);
  const [editingField, setEditingField] = React.useState<ProductField | null>(null);

  // Product form state
  const [productForm, setProductForm] = React.useState({
    name: '',
    description: '',
    code: '',
    category: '',
    is_active: true,
    requires_approval: false,
    approval_flow: ''
  });

// Keep the form state as is (it can stay snake_case internally)
const [fieldForm, setFieldForm] = React.useState({
  field_name: '',      // internal state stays snake_case
  field_label: '',
  field_type: 'text',
  is_required: false,
  options: [] as string[],
  display_order: 0
});

// But when sending to API, map to camelCase

  React.useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const fetchProductFields = async (productId: string) => {
    try {
      const response = await axiosInstance.get(`/products/${productId}/fields`);
      setProductFields(response.data);
    } catch (error) {
      console.error('Failed to fetch product fields:', error);
      setProductFields([]);
    }
  };

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product);
    await fetchProductFields(product.id);
  };

  const createProduct = async () => {
    if (!productForm.name || !productForm.code) {
      toast.error('Product name and code are required');
      return;
    }
    
    try {
      await axiosInstance.post('/products', productForm);
      toast.success('Product created successfully');
      setIsProductDialogOpen(false);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to create product:', error);
      toast.error(error.response?.data?.error || 'Failed to create product');
    }
  };

  const updateProduct = async () => {
    if (!editingProduct) return;
    try {
      await axiosInstance.put(`/products/${editingProduct.id}`, productForm);
      toast.success('Product updated successfully');
      setIsProductDialogOpen(false);
      resetProductForm();
      fetchProducts();
      if (selectedProduct?.id === editingProduct.id) {
        handleProductSelect({ ...selectedProduct, ...productForm } as Product);
      }
    } catch (error: any) {
      console.error('Failed to update product:', error);
      toast.error(error.response?.data?.error || 'Failed to update product');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await axiosInstance.delete(`/products/${id}`);
      toast.success('Product deleted successfully');
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
        setProductFields([]);
      }
      fetchProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      toast.error(error.response?.data?.error || 'Failed to delete product');
    }
  };

  const createField = async () => {
  if (!selectedProduct) return;
  if (!fieldForm.field_name || !fieldForm.field_label) {
    toast.error('Field name and label are required');
    return;
  }
  
  try {
    // CHANGE: Use camelCase property names
    await axiosInstance.post(`/products/${selectedProduct.id}/fields`, {
      fieldName: fieldForm.field_name,      // was: field_name
      fieldLabel: fieldForm.field_label,    // was: field_label
      fieldType: fieldForm.field_type,      // was: field_type
      isRequired: fieldForm.is_required,    // was: is_required
      options: fieldForm.options,
      displayOrder: fieldForm.display_order // was: display_order
    });
    
    toast.success('Field added successfully');
    setIsFieldDialogOpen(false);
    resetFieldForm();
    fetchProductFields(selectedProduct.id);
  } catch (error: any) {
    console.error('Failed to create field:', error);
    toast.error(error.response?.data?.error || 'Failed to create field');
  }
};

const updateField = async () => {
  if (!editingField || !selectedProduct) return;
  try {
    await axiosInstance.put(`/products/${selectedProduct.id}/fields/${editingField.id}`, {
      fieldName: fieldForm.field_name,
      fieldLabel: fieldForm.field_label,
      fieldType: fieldForm.field_type,
      isRequired: fieldForm.is_required,
      options: fieldForm.options,
      displayOrder: fieldForm.display_order
    });
    
    toast.success('Field updated successfully');
    setIsFieldDialogOpen(false);
    resetFieldForm();
    fetchProductFields(selectedProduct.id);
  } catch (error: any) {
    console.error('Failed to update field:', error);
    toast.error(error.response?.data?.error || 'Failed to update field');
  }
};

  const deleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    try {
      await axiosInstance.delete(`/products/${selectedProduct?.id}/fields/${fieldId}`);
      toast.success('Field deleted successfully');
      if (selectedProduct) {
        fetchProductFields(selectedProduct.id);
      }
    } catch (error: any) {
      console.error('Failed to delete field:', error);
      toast.error(error.response?.data?.error || 'Failed to delete field');
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      code: '',
      category: '',
      is_active: true,
      requires_approval: false,
      approval_flow: ''
    });
  };

  const resetFieldForm = () => {
    setEditingField(null);
    setFieldForm({
      field_name: '',
      field_label: '',
      field_type: 'text',
      is_required: false,
      options: [],
      display_order: 0
    });
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      code: product.code,
      category: product.category || '',
      is_active: product.isActive,
      requires_approval: product.requiresApproval || false,
      approval_flow: product.approvalFlow || ''
    });
    setIsProductDialogOpen(true);
  };

  const openEditField = (field: ProductField) => {
    setEditingField(field);
    setFieldForm({
      field_name: field.fieldName,
      field_label: field.fieldLabel,
      field_type: field.fieldType,
      is_required: field.isRequired,
      options: field.options || [],
      display_order: field.displayOrder
    });
    setIsFieldDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Product Management</h1>
          <p className="text-gray-500 mt-1">Manage insurance products and their custom fields</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchProducts} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A3E6F]" onClick={() => resetProductForm()}>
                <Plus className="mr-2 h-4 w-4" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Product' : 'Create New Product'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input 
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="e.g., Auto Insurance"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Product Code *</Label>
                  <Input 
                    value={productForm.code}
                    onChange={(e) => setProductForm({...productForm, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., AUTO"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input 
                    value={productForm.category}
                    onChange={(e) => setProductForm({...productForm, category: e.target.value})}
                    placeholder="e.g., MOTOR, PROPERTY, LIFE, HEALTH"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={productForm.description}
                    onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                    placeholder="Product description"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch 
                    checked={productForm.is_active}
                    onCheckedChange={(val) => setProductForm({...productForm, is_active: val})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={editingProduct ? updateProduct : createProduct}
                    className="flex-1 bg-[#1A3E6F]"
                  >
                    {editingProduct ? 'Update' : 'Create'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setIsProductDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No products found</p>
                  <p className="text-sm mt-1">Click "Add Product" to get started</p>
                </div>
              ) : (
                products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${
                      selectedProduct?.id === product.id
                        ? 'border-[#1A3E6F] bg-[#1A3E6F]/5'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-[#111827]">{product.name}</p>
                        <p className="text-xs text-gray-500 mt-1">{product.code}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openEditProduct(product); }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {product.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {product.category && (
                        <Badge className="bg-gray-100 text-gray-800 text-xs">
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Product Fields */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {selectedProduct ? `${selectedProduct.name} - Custom Fields` : 'Select a Product'}
                </CardTitle>
                {selectedProduct && (
                  <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => resetFieldForm()}>
                        <Plus className="mr-2 h-4 w-4" /> Add Field
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingField ? 'Edit Field' : 'Add Custom Field'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Field Name *</Label>
                          <Input 
                            value={fieldForm.field_name}
                            onChange={(e) => setFieldForm({...fieldForm, field_name: e.target.value})}
                            placeholder="e.g., vehicle_make"
                          />
                          <p className="text-xs text-gray-500">Used as database column name (lowercase, underscores)</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Field Label *</Label>
                          <Input 
                            value={fieldForm.field_label}
                            onChange={(e) => setFieldForm({...fieldForm, field_label: e.target.value})}
                            placeholder="e.g., Vehicle Make"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Field Type</Label>
                          <Select 
                            value={fieldForm.field_type}
                            onValueChange={(val) => setFieldForm({...fieldForm, field_type: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="select">Select Dropdown</SelectItem>
                              <SelectItem value="checkbox">Checkbox</SelectItem>
                              <SelectItem value="file">File Upload</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {fieldForm.field_type === 'select' && (
                          <div className="space-y-2">
                            <Label>Options (comma separated)</Label>
                            <Input 
                              value={fieldForm.options.join(', ')}
                              onChange={(e) => setFieldForm({...fieldForm, options: e.target.value.split(',').map(s => s.trim())})}
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Label>Required Field</Label>
                          <Switch 
                            checked={fieldForm.is_required}
                            onCheckedChange={(val) => setFieldForm({...fieldForm, is_required: val})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Display Order</Label>
                          <Input 
                            type="number"
                            value={fieldForm.display_order}
                            onChange={(e) => setFieldForm({...fieldForm, display_order: parseInt(e.target.value)})}
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <Button 
                            onClick={editingField ? updateField : createField}
                            className="flex-1 bg-[#1A3E6F]"
                          >
                            {editingField ? 'Update' : 'Add'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setIsFieldDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedProduct ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a product to manage its custom fields</p>
                </div>
              ) : productFields.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No custom fields added yet</p>
                  <p className="text-sm mt-1">Click "Add Field" to create custom fields for this product</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[#111827]">{field.fieldLabel}</p>
                          {field.isRequired && (
                            <Badge className="bg-red-100 text-red-800 text-[10px]">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Field: {field.fieldName} • Type: {field.fieldType}
                        </p>
                        {field.options && field.options.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            Options: {field.options.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditField(field)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => deleteField(field.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}