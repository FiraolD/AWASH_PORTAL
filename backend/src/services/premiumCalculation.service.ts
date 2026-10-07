import pool from '../lib/db.js';

interface Vehicle {
  make?: string;
  model?: string;
  yearOfMake?: number;
  vehicleType?: string;
  usage?: string;
  cylinderCapacity?: number;
  vehicleValue?: number;
}

interface PremiumCalculationParams {
  productCode?: string;
  productType?: string;
  coverageAmount: number;
  termMonths: number;
  riskScore?: number;
  vehicles?: Vehicle[];
  vehicleCount?: number;
}

interface PremiumResult {
  basicPremium: number;
  vatAmount: number;
  drrAmount: number;
  totalPremium: number;
  monthlyPremium: number;
  riskModifier: number;
  coverageTier: string;
  baseRate: number;
  breakdown?: {
    perVehiclePremiums: { vehicleIndex: number; premium: number; adjustments: any[] }[];
    multiVehicleDiscount: number;
    totalVehicleValue: number;
  };
}

class PremiumCalculationService {
  
  // Get base rate from your existing premium_rates table
  async getBaseRate(productCode: string, coverageAmount: number): Promise<{ rate: number; tier: string }> {
    const result = await pool.query(`
      SELECT baseRate, coverage_tier
      FROM premium_rates
      WHERE product_type = $1
        AND min_coverage <= $2
        AND (max_coverage IS NULL OR max_coverage >= $2)
        AND is_active = true
      ORDER BY min_coverage ASC
      LIMIT 1
    `, [productCode, coverageAmount]);
    
    if (result.rows.length === 0) {
      return { rate: 0.03, tier: 'Standard' };
    }
    
    return {
      rate: parseFloat(result.rows[0].baseRate),
      tier: result.rows[0].coverage_tier
    };
  }

  // Get risk factor modifier from risk_factors table
  async getRiskModifier(productCode: string, category: string, factorValue: string): Promise<number> {
    const result = await pool.query(`
      SELECT modifier
      FROM risk_factors
      WHERE "productCode" = $1
        AND category = $2
        AND factorValue = $3
        AND "isActive" = true
    `, [productCode, category, factorValue]);
    
    return result.rows.length > 0 ? parseFloat(result.rows[0].modifier) : 1.0;
  }

  // Get age-based modifier (using range)
  async getAgeModifier(productCode: string, age: number): Promise<number> {
    const result = await pool.query(`
      SELECT modifier
      FROM risk_factors
      WHERE "productCode" = $1
        AND category = 'age_range'
        AND (
          (factorValue LIKE '%0-2%' AND age <= 2) OR
          (factorValue LIKE '%3-5%' AND age BETWEEN 3 AND 5) OR
          (factorValue LIKE '%6-10%' AND age BETWEEN 6 AND 10) OR
          (factorValue LIKE '%11-15%' AND age BETWEEN 11 AND 15) OR
          (factorValue LIKE '%16+%' AND age >= 16)
        )
        AND "isActive" = true
      LIMIT 1
    `, [productCode, age]);
    
    return result.rows.length > 0 ? parseFloat(result.rows[0].modifier) : 1.0;
  }

  // Get cylinder capacity modifier
  async getCylinderModifier(productCode: string, cylinderCapacity: number): Promise<number> {
    if (!cylinderCapacity) return 1.0;
    
    const result = await pool.query(`
      SELECT modifier
      FROM risk_factors
      WHERE "productCode" = $1
        AND category = 'cylinder_capacity'
        AND (
          (factorValue LIKE '%0-1500%' AND cylinderCapacity <= 1500) OR
          (factorValue LIKE '%1501-2000%' AND cylinderCapacity BETWEEN 1501 AND 2000) OR
          (factorValue LIKE '%2001-3000%' AND cylinderCapacity BETWEEN 2001 AND 3000) OR
          (factorValue LIKE '%3000+%' AND cylinderCapacity >= 3001)
        )
        AND "isActive" = true
      LIMIT 1
    `, [productCode, cylinderCapacity]);
    
    return result.rows.length > 0 ? parseFloat(result.rows[0].modifier) : 1.0;
  }

  // Get multi-vehicle discount
  async getMultiVehicleDiscount(vehicleCount: number): Promise<number> {
    const result = await pool.query(`
      SELECT "discountPercent"
      FROM multi_vehicle_discounts
      WHERE "vehicleCount" = $1
        AND "isActive" = true
    `, [vehicleCount]);
    
    return result.rows.length > 0 ? parseFloat(result.rows[0].discountPercent) : 0;
  }

  // Calculate premium for a single vehicle
  async calculateVehiclePremium(
    productCode: string, 
    vehicle: Vehicle, 
    baseRate: number
  ): Promise<{ premium: number; adjustments: { factor: string; modifier: number }[] }> {
    const adjustments: { factor: string; modifier: number }[] = [];
    let totalModifier = 1.0;
    
    // Vehicle type modifier
    if (vehicle.vehicleType) {
      const typeModifier = await this.getRiskModifier(productCode, 'vehicle_type', vehicle.vehicleType);
      if (typeModifier !== 1.0) {
        adjustments.push({ factor: `Vehicle Type: ${vehicle.vehicleType}`, modifier: typeModifier });
        totalModifier *= typeModifier;
      }
    }
    
    // Usage modifier
    if (vehicle.usage) {
      const usageModifier = await this.getRiskModifier(productCode, 'usage', vehicle.usage);
      if (usageModifier !== 1.0) {
        adjustments.push({ factor: `Usage: ${vehicle.usage}`, modifier: usageModifier });
        totalModifier *= usageModifier;
      }
    }
    
    // Age modifier
    if (vehicle.yearOfMake) {
      const age = new Date().getFullYear() - vehicle.yearOfMake;
      const ageModifier = await this.getAgeModifier(productCode, age);
      if (ageModifier !== 1.0) {
        adjustments.push({ factor: `Vehicle Age: ${age} years`, modifier: ageModifier });
        totalModifier *= ageModifier;
      }
    }
    
    // Cylinder capacity modifier
    if (vehicle.cylinderCapacity) {
      const ccModifier = await this.getCylinderModifier(productCode, vehicle.cylinderCapacity);
      if (ccModifier !== 1.0) {
        adjustments.push({ factor: `Engine: ${vehicle.cylinderCapacity}cc`, modifier: ccModifier });
        totalModifier *= ccModifier;
      }
    }
    
    const vehicleValue = vehicle.vehicleValue || 0;
    const basePremium = vehicleValue * baseRate;
    const adjustedPremium = basePremium * totalModifier;
    
    return {
      premium: adjustedPremium,
      adjustments
    };
  }

  // Main premium calculation method
  async calculatePremium(params: PremiumCalculationParams): Promise<PremiumResult> {
    const { productCode: rawProductCode, productType, coverageAmount, termMonths, vehicles = [], vehicleCount = vehicles.length || 1 } = params;
    const productCode = rawProductCode || productType || 'GENERAL';
    
    // Get base rate from your premium_rates table
    const { rate: baseRate, tier: coverageTier } = await this.getBaseRate(productCode, coverageAmount);
    
    const perVehiclePremiums: { vehicleIndex: number; premium: number; adjustments: any[] }[] = [];
    let totalVehiclePremium = 0;
    let totalVehicleValue = 0;
    
    // Calculate premium for each vehicle
    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];
      totalVehicleValue += vehicle.vehicleValue || 0;
      
      const result = await this.calculateVehiclePremium(productCode, vehicle, baseRate);
      totalVehiclePremium += result.premium;
      
      perVehiclePremiums.push({
        vehicleIndex: i + 1,
        premium: result.premium,
        adjustments: result.adjustments
      });
    }
    
    // If no vehicles, use coverage amount
    let finalPremium = totalVehiclePremium;
    if (vehicles.length === 0) {
      finalPremium = coverageAmount * baseRate;
      totalVehicleValue = coverageAmount;
    }
    
    // Apply multi-vehicle discount
    const discountPercent = await this.getMultiVehicleDiscount(vehicleCount);
    const discountMultiplier = 1 - (discountPercent / 100);
    const discountedPremium = finalPremium * discountMultiplier;
    
    // Adjust for term (annual policies get 10% discount)
    const termDiscount = termMonths === 12 ? 0.9 : 1.0;
    const basicPremium = (discountedPremium * termMonths / 12) * termDiscount;
    
    // Apply VAT and DRR
    const vatRate = 0.15;
    const drrRate = 0.01;
    const vatAmount = basicPremium * vatRate;
    const drrAmount = basicPremium * drrRate;
    const totalPremium = basicPremium + vatAmount + drrAmount;
    const monthlyPremium = totalPremium / termMonths;
    
    // Calculate overall risk modifier
    let totalRiskModifier = finalPremium / (totalVehicleValue * baseRate);
    if (isNaN(totalRiskModifier)) totalRiskModifier = 1.0;
    
    return {
      basicPremium: Math.round(basicPremium * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      drrAmount: Math.round(drrAmount * 100) / 100,
      totalPremium: Math.round(totalPremium * 100) / 100,
      monthlyPremium: Math.round(monthlyPremium * 100) / 100,
      riskModifier: Math.round(totalRiskModifier * 100) / 100,
      coverageTier,
      baseRate,
      breakdown: {
        perVehiclePremiums,
        multiVehicleDiscount: discountPercent,
        totalVehicleValue
      }
    };
  }
}

export const premiumCalculationService = new PremiumCalculationService();

