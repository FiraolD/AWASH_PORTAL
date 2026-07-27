import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/Dialog';
import { toast } from 'sonner';
import axiosInstance from '../lib/axios';
import { Loader2, Copy, CheckCircle } from 'lucide-react';

interface PaymentReferenceGeneratorProps {
  policyId: string;
  policyNumber: string;        // ✅ Added
  coverageAmount: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  open: boolean;
  onClose: () => void;
}

export default function PaymentReferenceGenerator({
  policyId,
  policyNumber,               // ✅ Added
  coverageAmount,
  customerName,
  customerPhone,
  customerEmail,
  open,
  onClose,
}: PaymentReferenceGeneratorProps) {
  const [amount, setAmount] = useState(coverageAmount);
  const [description, setDescription] = useState(`Premium payment for policy ${policyNumber}`);
  const [generating, setGenerating] = useState(false);
  const [reference, setReference] = useState('');

  const handleGenerate = async () => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setGenerating(true);
    try {
      const res = await axiosInstance.post('/payments/generate-reference', {
        policyId,
        amount,
        description,
        customerPhone,
        customerEmail,
      });

      setReference(res.data.reference);
      toast.success('Payment reference generated');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate reference');
    } finally {
      setGenerating(false);
    }
  };

  const copyReference = () => {
    navigator.clipboard.writeText(reference);
    toast.success('Reference copied to clipboard');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Payment Reference</DialogTitle>
          <DialogDescription>
            Generate a reference number for {customerName || 'the customer'} to make payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!reference ? (
            <>
              <div>
                <Label>Policy Number</Label>
                <Input value={policyNumber} disabled />
              </div>
              <div>
                <Label>Customer</Label>
                <Input value={customerName || 'N/A'} disabled />
              </div>
              <div>
                <Label>Amount (ETB)</Label>
                <Input
                  type="number"
                  value={amount || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    setAmount(parseFloat(e.target.value))
                  }
                  min={1}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate Payment Reference
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-700 mb-1">Payment Reference Generated</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-2xl font-bold text-[#1A3E6F] tracking-wider">{reference}</p>
                  <button onClick={copyReference} className="p-1 hover:bg-green-100 rounded">
                    <Copy className="h-5 w-5 text-green-600" />
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Amount: <strong>ETB {amount.toLocaleString()}</strong>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">Customer Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Open payment app (Telebirr, AwashBirr, Bank)</li>
                  <li>Enter reference: <strong>{reference}</strong></li>
                  <li>Pay exactly: <strong>ETB {amount.toLocaleString()}</strong></li>
                </ol>
              </div>

              <Button onClick={onClose} variant="outline" className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}