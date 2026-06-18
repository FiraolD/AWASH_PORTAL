import React, { useEffect, useState } from 'react';
import { Shield, TrendingUp, TrendingDown, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';

interface RiskAssessment {
  id: string;
  policyNumber: string;
  customerName: string;
  coverageAmount: number;
  riskScore: number;
  riskLevel: string;
  riskFactors: string[];
  recommendation: string;
}

export default function RiskAssessmentPage() {
  const [assessments, setAssessments] = useState<RiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskAssessments();
  }, []);

  const fetchRiskAssessments = async () => {
    setLoading(true);
    try {
      // FIXED: Use the correct underwriting endpoint
      const response = await axiosInstance.get('/underwriting/risk-assessments');
      console.log('Risk assessments:', response.data);
      setAssessments(response.data);
    } catch (error) {
      console.error('Failed to fetch risk assessments:', error);
      toast.error('Failed to load risk assessments');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (score: number, level: string) => {
    if (score >= 70 || level === 'HIGH') {
      return { label: 'High Risk', color: 'bg-red-100 text-red-800', icon: TrendingUp };
    } else if (score >= 40 || level === 'MEDIUM') {
      return { label: 'Medium Risk', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle };
    } else {
      return { label: 'Low Risk', color: 'bg-green-100 text-green-800', icon: TrendingDown };
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
        <p className="text-gray-500">Loading risk assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Risk Assessment</h1>
        <p className="text-gray-500 mt-1">Evaluate risk levels for pending policies</p>
      </div>

      {assessments.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No pending risk assessments</p>
            <p className="text-sm text-gray-400 mt-1">All policies have been assessed</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment) => {
            const riskInfo = getRiskBadge(assessment.riskScore, assessment.riskLevel);
            const RiskIcon = riskInfo.icon;
            
            return (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-semibold text-lg">{assessment.policyNumber}</h3>
                      <Badge className={riskInfo.color}>
                        <RiskIcon className="h-3 w-3 mr-1 inline" />
                        {riskInfo.label}
                      </Badge>
                      <Badge className="bg-gray-100 text-gray-800">
                        Score: {assessment.riskScore}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Customer</p>
                      <p className="font-medium">{assessment.customerName}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Coverage Amount</p>
                      <p className="font-medium">ETB {assessment.coverageAmount?.toLocaleString()}</p>
                    </div>
                    
                    {assessment.riskFactors && assessment.riskFactors.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Risk Factors</p>
                        <div className="flex flex-wrap gap-2">
                          {assessment.riskFactors.map((factor, idx) => (
                            <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {assessment.recommendation && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800">Recommendation</p>
                        <p className="text-sm text-blue-700">{assessment.recommendation}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}