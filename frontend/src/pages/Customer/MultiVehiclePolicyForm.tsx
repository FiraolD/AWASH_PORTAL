import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Car, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  engineNumber: string;
  chassisNumber: string;
  vehicleType: string;
  usage: string;
  value: number;
}

interface ProductField {
  id: string;
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  isRequired: boolean;
  options: string[];
}

interface MultiVehiclePolicyFormProps {
  productCode: string;
  productFields: ProductField[];
  onDataChange: (data: { vehicles: Vehicle[]; productFieldsData: Record<string, any> }) => void;
  onValidationChange: (isValid: boolean) => void;
}

export default function MultiVehiclePolicyForm({ 
  productCode, 
  productFields, 
  onDataChange, 
  onValidationChange 
}: MultiVehiclePolicyFormProps) {
  const [vehicleCount, setVehicleCount] = useState<number>(1);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState<number>(0);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: '1', make: '', model: '', year: '', plateNumber: '', engineNumber: '', chassisNumber: '', vehicleType: '', usage: '', value: 0 }
  ]);
  const [productFieldsData, setProductFieldsData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize vehicles when count changes
  useEffect(() => {
    const newVehicles = [...vehicles];
    if (vehicleCount > vehicles.length) {
      for (let i = vehicles.length; i < vehicleCount; i++) {
        newVehicles.push({
          id: Date.now().toString() + i,
          make: '',
          model: '',
          year: '',
          plateNumber: '',
          engineNumber: '',
          chassisNumber: '',
          vehicleType: '',
          usage: '',
          value: 0
        });
      }
    } else if (vehicleCount < vehicles.length) {
      newVehicles.splice(vehicleCount);
    }
    setVehicles(newVehicles);
    
    // Reset selected index if out of range
    if (selectedVehicleIndex >= vehicleCount) {
      setSelectedVehicleIndex(0);
    }
  }, [vehicleCount]);

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate current vehicle
    const currentVehicle = vehicles[selectedVehicleIndex];
    if (!currentVehicle.make) newErrors.make = 'Make is required';
    if (!currentVehicle.model) newErrors.model = 'Model is required';
    if (!currentVehicle.year) newErrors.year = 'Year is required';
    if (currentVehicle.year && (parseInt(currentVehicle.year) < 1900 || parseInt(currentVehicle.year) > new Date().getFullYear() + 1)) {
      newErrors.year = 'Invalid year';
    }
    if (!currentVehicle.plateNumber) newErrors.plateNumber = 'Plate number is required';
    if (!currentVehicle.engineNumber) newErrors.engineNumber = 'Engine number is required';
    if (!currentVehicle.chassisNumber) newErrors.chassisNumber = 'Chassis number is required';
    if (!currentVehicle.vehicleType) newErrors.vehicleType = 'Vehicle type is required';
    if (!currentVehicle.usage) newErrors.usage = 'Usage is required';
    if (!currentVehicle.value || currentVehicle.value < 100000) newErrors.value = 'Value must be at least ETB 100,000';
    
    // Validate product fields
    productFields.forEach(field => {
      if (field.isRequired && !productFieldsData[field.fieldName]) {
        newErrors[field.fieldName] = `${field.fieldLabel} is required`;
      }
    });
    
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange(isValid);
    return isValid;
  };

  // Handle vehicle field change
  const handleVehicleChange = (field: keyof Vehicle, value: any) => {
    const updatedVehicles = [...vehicles];
    updatedVehicles[selectedVehicleIndex] = {
      ...updatedVehicles[selectedVehicleIndex],
      [field]: value
    };
    setVehicles(updatedVehicles);
    
    // Update parent with all data
    onDataChange({ vehicles: updatedVehicles, productFieldsData });
    
    // Validate after change
    validateForm();
  };

  // Handle product field change
  const handleProductFieldChange = (fieldName: string, value: any) => {
    const updated = { ...productFieldsData, [fieldName]: value };
    setProductFieldsData(updated);
    onDataChange({ vehicles, productFieldsData: updated });
    validateForm();
  };

  // Get current vehicle
  const currentVehicle = vehicles[selectedVehicleIndex];

  // Vehicle type options
  const vehicleTypes = [
    'Sedan', 'SUV', 'Truck', 'Motorcycle', 'Van', 'Bus', 'Pickup', 'Luxury'
  ];

  // Usage options
  const usageOptions = [
    'Private', 'Commercial', 'Rental', 'Government', 'Taxi', 'Ride-sharing'
  ];

  return (
    <div className="space-y-6">
      {/* Number of Vehicles Selection */}
      <Card>
        <CardContent className="p-4">
          <Label className="text-sm font-medium">Number of Vehicles</Label>
          <Select 
            value={vehicleCount.toString()} 
            onValueChange={(val) => setVehicleCount(parseInt(val))}
          >
            <SelectTrigger className="mt-1">
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
        </CardContent>
      </Card>

      {/* Vehicle Selection Dropdown (if multiple vehicles) */}
      {vehicleCount > 1 && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium">Select Vehicle to Edit</Label>
            <Select 
              value={selectedVehicleIndex.toString()} 
              onValueChange={(val) => setSelectedVehicleIndex(parseInt(val))}
            >
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
          </CardContent>
        </Card>
      )}

      {/* Vehicle Information Form */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              Vehicle {selectedVehicleIndex + 1} Information
            </h3>
            {currentVehicle.make && currentVehicle.model && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Make *</Label>
              <Input
                value={currentVehicle.make}
                onChange={(e) => handleVehicleChange('make', e.target.value)}
                placeholder="e.g., Toyota, Honda, Ford"
                className={errors.make ? 'border-red-500' : ''}
              />
              {errors.make && <p className="text-xs text-red-500 mt-1">{errors.make}</p>}
            </div>
            
            <div>
              <Label>Model *</Label>
              <Input
                value={currentVehicle.model}
                onChange={(e) => handleVehicleChange('model', e.target.value)}
                placeholder="e.g., Camry, Civic, F-150"
                className={errors.model ? 'border-red-500' : ''}
              />
              {errors.model && <p className="text-xs text-red-500 mt-1">{errors.model}</p>}
            </div>
            
            <div>
              <Label>Year *</Label>
              <Input
                type="number"
                value={currentVehicle.year}
                onChange={(e) => handleVehicleChange('year', e.target.value)}
                placeholder="e.g., 2023"
                className={errors.year ? 'border-red-500' : ''}
              />
              {errors.year && <p className="text-xs text-red-500 mt-1">{errors.year}</p>}
            </div>
            
            <div>
              <Label>Vehicle Type *</Label>
              <Select 
                value={currentVehicle.vehicleType} 
                onValueChange={(val) => handleVehicleChange('vehicleType', val)}
              >
                <SelectTrigger className={errors.vehicleType ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select vehicle type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vehicleType && <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>}
            </div>
            
            <div>
              <Label>Usage *</Label>
              <Select 
                value={currentVehicle.usage} 
                onValueChange={(val) => handleVehicleChange('usage', val)}
              >
                <SelectTrigger className={errors.usage ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select usage type" />
                </SelectTrigger>
                <SelectContent>
                  {usageOptions.map(usage => (
                    <SelectItem key={usage} value={usage}>{usage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.usage && <p className="text-xs text-red-500 mt-1">{errors.usage}</p>}
            </div>
            
            <div>
              <Label>Plate Number *</Label>
              <Input
                value={currentVehicle.plateNumber}
                onChange={(e) => handleVehicleChange('plateNumber', e.target.value)}
                placeholder="e.g., AA-1234"
                className={errors.plateNumber ? 'border-red-500' : ''}
              />
              {errors.plateNumber && <p className="text-xs text-red-500 mt-1">{errors.plateNumber}</p>}
            </div>
            
            <div>
              <Label>Engine Number *</Label>
              <Input
                value={currentVehicle.engineNumber}
                onChange={(e) => handleVehicleChange('engineNumber', e.target.value)}
                placeholder="Engine number"
                className={errors.engineNumber ? 'border-red-500' : ''}
              />
              {errors.engineNumber && <p className="text-xs text-red-500 mt-1">{errors.engineNumber}</p>}
            </div>
            
            <div>
              <Label>Chassis Number *</Label>
              <Input
                value={currentVehicle.chassisNumber}
                onChange={(e) => handleVehicleChange('chassisNumber', e.target.value)}
                placeholder="Chassis number"
                className={errors.chassisNumber ? 'border-red-500' : ''}
              />
              {errors.chassisNumber && <p className="text-xs text-red-500 mt-1">{errors.chassisNumber}</p>}
            </div>
            
            <div>
              <Label>Vehicle Value (ETB) *</Label>
              <Input
                type="number"
                value={currentVehicle.value || ''}
                onChange={(e) => handleVehicleChange('value', parseFloat(e.target.value))}
                placeholder="Minimum ETB 100,000"
                className={errors.value ? 'border-red-500' : ''}
              />
              {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Fields Section */}
      {productFields.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productFields.map((field) => (
                <div key={field.id}>
                  <Label>
                    {field.fieldLabel} {field.isRequired && <span className="text-red-500">*</span>}
                  </Label>
                  
                  {field.fieldType === 'text' && (
                    <Input
                      value={productFieldsData[field.fieldName] || ''}
                      onChange={(e) => handleProductFieldChange(field.fieldName, e.target.value)}
                      placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                      className={errors[field.fieldName] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {field.fieldType === 'number' && (
                    <Input
                      type="number"
                      value={productFieldsData[field.fieldName] || ''}
                      onChange={(e) => handleProductFieldChange(field.fieldName, parseFloat(e.target.value))}
                      placeholder={`Enter ${field.fieldLabel.toLowerCase()}`}
                      className={errors[field.fieldName] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {field.fieldType === 'date' && (
                    <Input
                      type="date"
                      value={productFieldsData[field.fieldName] || ''}
                      onChange={(e) => handleProductFieldChange(field.fieldName, e.target.value)}
                      className={errors[field.fieldName] ? 'border-red-500' : ''}
                    />
                  )}
                  
                  {field.fieldType === 'select' && field.options && field.options.length > 0 && (
                    <Select
                      value={productFieldsData[field.fieldName] || ''}
                      onValueChange={(val) => handleProductFieldChange(field.fieldName, val)}
                    >
                      <SelectTrigger className={errors[field.fieldName] ? 'border-red-500' : ''}>
                        <SelectValue placeholder={`Select ${field.fieldLabel.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {errors[field.fieldName] && (
                    <p className="text-xs text-red-500 mt-1">{errors[field.fieldName]}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Summary */}
      {vehicleCount > 1 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-2">Vehicle Summary</h4>
            <div className="space-y-2">
              {vehicles.map((vehicle, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      Vehicle {idx + 1}: 
                      {vehicle.make && vehicle.model 
                        ? `${vehicle.make} ${vehicle.model} (${vehicle.year})`
                        : 'Not filled'}
                    </span>
                  </div>
                  {vehicle.make && vehicle.model && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
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