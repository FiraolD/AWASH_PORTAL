import React, { useState, useEffect } from 'react';
import { Car, CheckCircle, AlertCircle, Plus, Minus } from 'lucide-react';
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
  displaySection: string;
  displayOrder: number;
}

interface Vehicle {
  id: string;
  [key: string]: any;
}

interface DynamicVehicleFormProps {
  productId: string;
  onDataChange: (vehicles: Vehicle[], vehicleFieldsData: Record<string, any>) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function DynamicVehicleForm({ 
  productId, 
  onDataChange, 
  onValidationChange 
}: DynamicVehicleFormProps) {
  const [vehicleFields, setVehicleFields] = useState<ProductField[]>([]);
  const [generalFields, setGeneralFields] = useState<ProductField[]>([]);
  const [vehicleCount, setVehicleCount] = useState<number>(1);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number>(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: Date.now().toString() + '_0' }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProductFields();
  }, [productId]);

  useEffect(() => {
    // Reinitialize vehicles when count changes
    const newVehicles = [...vehicles];
    if (vehicleCount > vehicles.length) {
      for (let i = vehicles.length; i < vehicleCount; i++) {
        newVehicles.push({ id: Date.now().toString() + '_' + i });
      }
    } else if (vehicleCount < vehicles.length) {
      newVehicles.splice(vehicleCount);
    }
    setVehicles(newVehicles);
    
    if (selectedVehicleIndex >= vehicleCount) {
      setSelectedVehicleIndex(0);
    }
  }, [vehicleCount]);

  const fetchProductFields = async () => {
    try {
      const response = await axiosInstance.get(`/products/${productId}/fields`);
      const allFields = response.data;
      
      // Separate vehicle fields from general fields
      const vehicle = allFields.filter((f: ProductField) => f.fieldCategory === 'vehicle');
      const general = allFields.filter((f: ProductField) => f.fieldCategory !== 'vehicle');
      
      setVehicleFields(vehicle.sort((a: ProductField, b: ProductField) => a.displayOrder - b.displayOrder));
      setGeneralFields(general.sort((a: ProductField, b: ProductField) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error('Failed to fetch product fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateVehicle = (vehicle: Vehicle, vehicleIndex: number) => {
    const newErrors: Record<string, string> = {};
    
    vehicleFields.forEach(field => {
      if (field.isRequired && !vehicle[field.fieldName]) {
        newErrors[`${field.fieldName}_${vehicleIndex}`] = `${field.fieldLabel} is required`;
      }
    });
    
    return newErrors;
  };

  const validateAllVehicles = () => {
    let allValid = true;
    const allErrors: Record<string, string> = {};
    
    vehicles.forEach((vehicle, idx) => {
      const vehicleErrors = validateVehicle(vehicle, idx);
      if (Object.keys(vehicleErrors).length > 0) {
        allValid = false;
        Object.assign(allErrors, vehicleErrors);
      }
    });
    
    setErrors(allErrors);
    return allValid;
  };

  const handleVehicleFieldChange = (fieldName: string, value: any) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[selectedVehicleIndex] = {
      ...updatedVehicles[selectedVehicleIndex],
      [fieldName]: value
    };
    setVehicles(updatedVehicles);
    
    // Validate and notify parent
    const isValid = validateAllVehicles();
    onValidationChange(isValid);
    onDataChange(updatedVehicles, {});
  };

  const renderField = (field: ProductField, vehicle: Vehicle, vehicleIdx: number) => {
    const errorKey = `${field.fieldName}_${vehicleIdx}`;
    const value = vehicle[field.fieldName] || '';
    
    switch (field.fieldType) {
      case 'select':
        return (
          <div key={field.id} className="space-y-1">
            <Label>
              {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Select 
              value={value} 
              onValueChange={(val) => handleVehicleFieldChange(field.fieldName, val)}
            >
              <SelectTrigger className={errors[errorKey] ? 'border-red-500' : ''}>
                <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
          </div>
        );
      
      case 'number':
        return (
          <div key={field.id} className="space-y-1">
            <Label>
              {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleVehicleFieldChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={errors[errorKey] ? 'border-red-500' : ''}
            />
            {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
          </div>
        );
      
      case 'date':
        return (
          <div key={field.id} className="space-y-1">
            <Label>
              {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleVehicleFieldChange(field.fieldName, e.target.value)}
              className={errors[errorKey] ? 'border-red-500' : ''}
            />
            {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
          </div>
        );
      
      default:
        return (
          <div key={field.id} className="space-y-1">
            <Label>
              {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleVehicleFieldChange(field.fieldName, e.target.value)}
              placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
              className={errors[errorKey] ? 'border-red-500' : ''}
            />
            {errors[errorKey] && <p className="text-xs text-red-500">{errors[errorKey]}</p>}
          </div>
        );
    }
  };

  const currentVehicle = vehicles[selectedVehicleIndex];

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

  if (vehicleFields.length === 0 && generalFields.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Number of Vehicles Selection */}
      {vehicleFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vehicle Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Number of Vehicles</Label>
              <Select value={vehicleCount.toString()} onValueChange={(val) => setVehicleCount(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select number of vehicles" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? 'Vehicle' : 'Vehicles'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Selection Dropdown for multiple vehicles */}
            {vehicleCount > 1 && (
              <div>
                <Label>Select Vehicle to Edit</Label>
                <Select value={selectedVehicleIndex.toString()} onValueChange={(val) => setSelectedVehicleIndex(parseInt(val))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle, idx) => {
                      const firstField = vehicleFields[0];
                      const displayName = firstField && vehicle[firstField.fieldName] 
                        ? `${vehicle[firstField.fieldName]}`
                        : `Vehicle ${idx + 1}`;
                      return (
                        <SelectItem key={idx} value={idx.toString()}>
                          {displayName} {idx === selectedVehicleIndex ? '(Editing)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dynamic Vehicle Fields */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle {selectedVehicleIndex + 1} Details
                </h4>
                {currentVehicle[vehicleFields[0]?.fieldName] && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Filled
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vehicleFields.map(field => renderField(field, currentVehicle, selectedVehicleIndex))}
              </div>
            </div>

            {/* Vehicle Summary for multiple vehicles */}
            {vehicleCount > 1 && (
              <div className="bg-gray-50 p-3 rounded-lg mt-4">
                <p className="text-sm font-medium mb-2">Vehicle Summary</p>
                <div className="space-y-1">
                  {vehicles.map((vehicle, idx) => {
                    const firstField = vehicleFields[0];
                    const displayValue = firstField ? vehicle[firstField.fieldName] : null;
                    const isComplete = vehicleFields.every(field => 
                      !field.isRequired || vehicle[field.fieldName]
                    );
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm py-1">
                        <span>Vehicle {idx + 1}:</span>
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
      )}

      {/* General Fields Section */}
      {generalFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {generalFields.map(field => (
                <div key={field.id} className="space-y-1">
                  <Label>
                    {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                  </Label>
                  {field.fieldType === 'select' ? (
                    <Select onValueChange={(val) => onDataChange(vehicles, { [field.fieldName]: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options?.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                      placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                      onChange={(e) => onDataChange(vehicles, { [field.fieldName]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}