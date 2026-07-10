import pool from '../lib/db.js';
// Cache for rates to avoid database calls every time
let ratesCache = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
async function loadRatesFromDB() {
    const result = await pool.query(`
    SELECT 
      product_type as "productType",
      base_rate as "baseRate",
      min_coverage as "minCoverage",
      max_coverage as "maxCoverage",
      risk_factor as "riskFactor"
    FROM premium_rates 
    WHERE is_active = true
    ORDER BY product_type, min_coverage ASC
  `);
    return result.rows;
}
export async function getBaseRate(productType, coverageAmount) {
    // Refresh cache if needed
    const now = Date.now();
    if (!ratesCache || (now - cacheTime) > CACHE_DURATION) {
        ratesCache = await loadRatesFromDB();
        cacheTime = now;
    }
    // Find the applicable rate for the product and coverage amount
    const applicableRate = ratesCache.find(rate => rate.productType === productType &&
        coverageAmount >= rate.minCoverage &&
        (rate.maxCoverage === null || coverageAmount <= rate.maxCoverage));
    if (applicableRate) {
        return applicableRate.baseRate;
    }
    // Default fallback rate
    console.warn(`No rate found for ${productType} with coverage ${coverageAmount}, using default`);
    return 0.03;
}
export async function getRiskFactor(productType, coverageAmount, customerAge) {
    let riskFactor = 1.0;
    // Get base risk factor from database
    const result = await pool.query(`
    SELECT risk_factor 
    FROM premium_rates 
    WHERE product_type = $1 
      AND $2 >= min_coverage 
      AND (max_coverage IS NULL OR $2 <= max_coverage)
      AND is_active = true
    LIMIT 1
  `, [productType, coverageAmount]);
    if (result.rows.length > 0) {
        riskFactor = parseFloat(result.rows[0].risk_factor);
    }
    // Additional risk modifiers based on customer data
    if (customerAge && customerAge > 60) {
        riskFactor *= 1.2; // 20% increase for senior citizens
    }
    return riskFactor;
}
export async function getVatRate() {
    const result = await pool.query(`
    SELECT setting_value 
    FROM system_settings 
    WHERE setting_key = 'vatRate'
  `);
    return result.rows[0]?.setting_value || 0.15;
}
export async function getDrrRate() {
    const result = await pool.query(`
    SELECT setting_value 
    FROM system_settings 
    WHERE setting_key = 'drrRate'
  `);
    return result.rows[0]?.setting_value || 0.01;
}
export async function calculatePremium(productType, coverageAmount, termMonths = 12, customerAge) {
    const baseRate = await getBaseRate(productType, coverageAmount);
    const riskFactor = await getRiskFactor(productType, coverageAmount, customerAge);
    const vatRate = await getVatRate();
    const drrRate = await getDrrRate();
    // Calculate annual premium
    const annualPremium = coverageAmount * baseRate * riskFactor;
    // Adjust for term (annual policies get 10% discount)
    const termDiscount = termMonths === 12 ? 0.9 : 1.0;
    const basicPremium = (annualPremium * termMonths / 12) * termDiscount;
    const vatAmount = basicPremium * vatRate;
    const drrAmount = basicPremium * drrRate;
    const totalPremium = basicPremium + vatAmount + drrAmount;
    const monthlyPremium = totalPremium / termMonths;
    return {
        basicPremium: Math.round(basicPremium * 100) / 100,
        vatAmount: Math.round(vatAmount * 100) / 100,
        drrAmount: Math.round(drrAmount * 100) / 100,
        totalPremium: Math.round(totalPremium * 100) / 100,
        monthlyPremium: Math.round(monthlyPremium * 100) / 100,
        appliedRate: baseRate,
        riskFactor: riskFactor
    };
}
