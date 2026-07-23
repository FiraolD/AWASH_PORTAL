import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, Car, Plus, Minus, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import axiosInstance from '../../lib/axios';

interface ProductField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  options: string[];
  fieldCategory: string;
  displayOrder?: number;
  placeholder?: string;
}

interface DynamicProductFormProps {
  productId: string;
  productCode: string;
  onDataChange: (items: any[], fieldsData: Record<string, any>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function DynamicProductForm({ 
  productId, 
  productCode,
  onDataChange, 
  onValidationChange 
}: DynamicProductFormProps) {
  const [allFields, setAllFields] = useState<ProductField[]>([]);
  const [itemCount, setItemCount] = useState<number>(1);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // For AUTO products, all fields are item fields
  const isAutoProduct = productCode === 'AUTO';
  const itemLabel = 'Vehicle';
  const itemsLabel = 'Vehicles';
  const minItems = 1;
  const maxItems = 5;

  useEffect(() => {
    if (productId) {
      fetchProductFields();
    }
  }, [productId]);

  // Initialize items when itemCount changes
  useEffect(() => {
    if (allFields.length > 0 && isAutoProduct) {
      const newItems = [...items];
      if (itemCount > items.length) {
        for (let i = items.length; i < itemCount; i++) {
          const newItem: any = { id: Date.now().toString() + '_' + i };
          allFields.forEach(field => {
            newItem[field.fieldName] = '';
          });
          newItems.push(newItem);
        }
      } else if (itemCount < items.length) {
        newItems.splice(itemCount);
      }
      setItems(newItems);
      
      if (selectedItemIndex >= itemCount) {
        setSelectedItemIndex(0);
      }
    }
  }, [itemCount, allFields]);

  const fetchProductFields = async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/products/${productId}/fields`);
      console.log('Fetched fields:', response.data);
      setAllFields(response.data || []);
    } catch (error) {
      console.error('Failed to fetch product fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAllItems = () => {
    let allValid = true;
    const allErrors: Record<string, string> = {};
    
    items.forEach((item, idx) => {
      allFields.forEach(field => {
        if (field.isRequired && !item[field.fieldName]) {
          allValid = false;
          allErrors[`${field.fieldName}_${idx}`] = `${field.fieldLabel} is required`;
        }
      });
    });
    
    setErrors(allErrors);
    return allValid;
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    const newItems = [...items];
    newItems[selectedItemIndex] = {
      ...newItems[selectedItemIndex],
      [fieldName]: value
    };
    setItems(newItems);
    
    const isValid = validateAllItems();
    onValidationChange(isValid);
    onDataChange(newItems, {});
  };

  const renderField = (field: ProductField, item: any, itemIdx: number) => {
    const errorKey = `${field.fieldName}_${itemIdx}`;
    const value = item[field.fieldName] || '';
    
    // For select fields, ensure we never have empty string value
    if (field.fieldType === 'select') {
      const selectValue = value && value !== '' ? value : 'placeholder';
      
      return (
        <div key={field.id} className="space-y-1">
          <Label>
            {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
          </Label>
          <Select 
            value={selectValue} 
            onValueChange={(val) => {
              // Don't allow placeholder value to be saved
              if (val !== 'placeholder') {
                handleFieldChange(field.fieldName, val);
              }
            }}
          >
            <SelectTrigger className={errors[errorKey] ? 'border-red-500' : ''}>
              <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options && field.options.length > 0 ? (
                field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="placeholder" disabled>
                  No options available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
        </div>
      );
    }
    
    // For non-select fields (text, number, date)
    return (
      <div key={field.id} className="space-y-1">
        <Label>
          {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
        </Label>
        <Input
          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
          value={value}
          onChange={(e) => handleFieldChange(field.fieldName, e.target.value)}
          placeholder={field.placeholder || `Enter ${field.fieldLabel.toLowerCase()}`}
          className={errors[errorKey] ? 'border-red-500' : ''}
        />
        {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
      </div>
    );
  };

  const currentItem = items[selectedItemIndex];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading form fields...</p>
        </CardContent>
      </Card>
    );
  }

  if (allFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="h-5 w-5" />
            {itemsLabel} Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Number of Items Selection */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <Label className="text-sm font-medium flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              How many {itemsLabel.toLowerCase()} do you want to insure?
            </Label>
            <div className="flex items-center gap-4 mt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemCount(Math.max(minItems, itemCount - 1))}
                disabled={itemCount <= minItems}
                className="border-blue-300 hover:bg-blue-100"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-3xl font-bold min-w-[80px] text-center text-blue-600">
                {itemCount}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setItemCount(Math.min(maxItems, itemCount + 1))}
                disabled={itemCount >= maxItems}
                className="border-blue-300 hover:bg-blue-100"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <span className="text-base font-medium text-gray-700">
                {itemCount === 1 ? itemLabel : itemsLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              You can add up to {maxItems} {itemsLabel.toLowerCase()}. Minimum is {minItems}.
            </p>
          </div>

          {/* Item Selection Dropdown for multiple items */}
          {itemCount > 1 && items.length > 0 && (
            <div>
              <Label>Select {itemLabel} to Edit</Label>
              <Select 
                value={selectedItemIndex.toString()} 
                onValueChange={(val) => setSelectedItemIndex(parseInt(val))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Select ${itemLabel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item, idx) => {
                    const firstField = allFields[0];
                    const displayName = firstField && item[firstField.fieldName] 
                      ? `${item[firstField.fieldName]}`
                      : `${itemLabel} ${idx + 1}`;
                    return (
                      <SelectItem key={idx} value={idx.toString()}>
                        {displayName} {idx === selectedItemIndex ? '(Editing)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dynamic Item Fields */}
          {items.length > 0 && currentItem && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  {itemLabel} {selectedItemIndex + 1} Details
                </h4>
                {currentItem[allFields[0]?.fieldName] && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allFields.map(field => renderField(field, currentItem, selectedItemIndex))}
              </div>
            </div>
          )}

          {/* Items Summary for multiple items */}
          {itemCount > 1 && items.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg mt-4">
              <p className="text-sm font-medium mb-2">{itemsLabel} Summary</p>
              <div className="space-y-1">
                {items.map((item, idx) => {
                  const firstField = allFields[0];
                  const displayValue = firstField ? item[firstField.fieldName] : null;
                  const isComplete = allFields.every(field => 
                    !field.isRequired || item[field.fieldName]
                  );
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                      <span>{itemLabel} {idx + 1}:</span>
                      <span className={displayValue ? 'text-green-600' : 'text-gray-400'}>
                        {displayValue || 'Not completed'}
                        {isComplete && displayValue && <CheckCircle className="h-3 w-3 inline ml-1 text-green-500" />}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}