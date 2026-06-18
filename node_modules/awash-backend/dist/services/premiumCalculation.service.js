export class PremiumCalculationService {
    getBaseRate(productType) {
        const rates = {
            AUTO: 0.035,
            HOME: 0.0025,
            LIFE: 0.01,
            HEALTH: 0.025,
        };
        return rates[productType?.toUpperCase()] || 0.03;
    }
    getRiskModifier(riskScore = 50) {
        if (riskScore >= 70)
            return 1.5;
        if (riskScore >= 40)
            return 1.0;
        return 0.7;
    }
    getCoverageTier(coverageAmount) {
        if (coverageAmount > 1000000)
            return 'Premium';
        if (coverageAmount > 500000)
            return 'Standard';
        return 'Basic';
    }
    calculatePremium(input) {
        const baseRate = this.getBaseRate(input.productType);
        const riskModifier = this.getRiskModifier(input.riskScore);
        const coverageTier = this.getCoverageTier(input.coverageAmount);
        const annualPremium = input.coverageAmount * baseRate;
        const adjustedAnnual = annualPremium * riskModifier;
        const totalPremium = (adjustedAnnual * input.termMonths) / 12;
        const monthlyPremium = totalPremium / input.termMonths;
        const riskAdjustment = totalPremium - (input.coverageAmount * baseRate * input.termMonths / 12);
        return {
            basePremium: Math.round((input.coverageAmount * baseRate * input.termMonths / 12) * 100) / 100,
            riskModifier,
            totalPremium: Math.round(totalPremium * 100) / 100,
            monthlyPremium: Math.round(monthlyPremium * 100) / 100,
            breakdown: [
                { factor: 'Base Premium', amount: Math.round((input.coverageAmount * baseRate * input.termMonths / 12) * 100) / 100, percentage: 100 },
                ...(riskAdjustment !== 0 ? [{ factor: 'Risk Adjustment', amount: Math.round(riskAdjustment * 100) / 100, percentage: Math.round((riskAdjustment / totalPremium) * 100) }] : [])
            ],
            coverageTier,
            baseRate,
        };
    }
}
export const premiumCalculationService = new PremiumCalculationService();
