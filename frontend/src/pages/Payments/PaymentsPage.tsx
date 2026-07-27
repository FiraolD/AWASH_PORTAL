import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import axiosInstance from '../../lib/axios';
import { toast } from 'sonner';
import { Loader2, Search, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface PaymentReference {
  reference: string;
  amount: number;
  description: string;
  status: string;
  claimNumber?: string;
  policyNumber?: string;
  createdAt: string;
  isExpired: boolean;
  expiresAt: string;
}

export default function CustomerPaymentPage() {
  const [searchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const [reference, setReference] = useState(initialRef);
  const [payment, setPayment] = useState<PaymentReference | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialRef) {
      lookupPayment(initialRef);
    }
  }, [initialRef]);

  const lookupPayment = async (ref?: string) => {
    const refToUse = ref || reference;
    if (!refToUse.trim()) {
      setError('Please enter a reference number');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/payments/lookup/${refToUse.trim()}`);
      setPayment(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Payment reference not found');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isExpired: boolean) => {
    if (isExpired) return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" /> Expired</Badge>;
    
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pending Payment</Badge>;
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Paid</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Make a Payment</h1>
        <p className="text-gray-500 mt-1">Enter your payment reference number to view and pay</p>
      </div>

      {/* Reference Lookup */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter payment reference number (e.g., AHO-20260115-0001)"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupPayment()}
              />
            </div>
            <Button onClick={() => lookupPayment()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-2">Look Up</span>
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Details */}
      {payment && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>Reference: {payment.reference}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>{getStatusBadge(payment.status, payment.isExpired)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Amount Due</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(payment.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{payment.description}</p>
              </div>
              {payment.claimNumber && (
                <div>
                  <p className="text-sm text-gray-500">Claim Number</p>
                  <p className="font-medium">{payment.claimNumber}</p>
                </div>
              )}
              {payment.policyNumber && (
                <div>
                  <p className="text-sm text-gray-500">Policy Number</p>
                  <p className="font-medium">{payment.policyNumber}</p>
                </div>
              )}
            </div>

            {payment.status === 'PENDING' && !payment.isExpired && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-2">How to Pay</p>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                  <li>Open your payment app (Telebirr, AwashBirr, or Bank app)</li>
                  <li>Enter this reference number: <strong>{payment.reference}</strong></li>
                  <li>Pay exactly: <strong>{formatCurrency(payment.amount)}</strong></li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  Expires: {new Date(payment.expiresAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {payment.status === 'PAID' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-700 font-medium">Payment Successful</p>
                <p className="text-sm text-green-600">Thank you for your payment</p>
              </div>
            )}

            {payment.isExpired && payment.status === 'PENDING' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">Payment Reference Expired</p>
                <p className="text-sm text-gray-500">Please contact support for a new reference</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}