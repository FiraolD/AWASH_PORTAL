import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote, 
  Plus, 
  Trash2, 
  Star,
  Info
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { usePaymentStore } from '../../stores/paymentStore';
import { cn } from '../../lib/utils';

export default function PaymentMethodsPage() {
  const navigate = useNavigate();
  const { paymentMethods } = usePaymentStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <Button variant="ghost" onClick={() => navigate('/customer/payments')} className="p-0 hover:bg-transparent">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payments
      </Button>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Payment Methods</h1>
          <p className="text-gray-500">Securely manage your credit cards and bank accounts.</p>
        </div>
        <Button variant="default">
          <Plus className="mr-2 h-5 w-5" /> Add New Method
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {paymentMethods.map((method) => (
           <Card key={method.id} className={cn(
             "relative overflow-hidden group border-2 transition-all",
             method.isDefault ? "border-[#1A3E6F]" : "border-gray-100"
           )}>
             <CardContent className="p-6">
                <div className="flex justify-between items-start mb-8">
                   <div className="flex items-center space-x-3">
                      <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center text-[#1A3E6F]">
                        {method.type === 'card' ? <CreditCard className="h-6 w-6" /> : <Banknote className="h-6 w-6" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1A3E6F] capitalize">{method.brand || method.type}</p>
                        <p className="text-xs text-gray-500">Ending in {method.last4}</p>
                      </div>
                   </div>
                   {method.isDefault && (
                     <Badge variant="success" className="font-bold">DEFAULT</Badge>
                   )}
                </div>

                <div className="flex items-center justify-between">
                   <div>
                     <p className="text-xs font-bold uppercase text-gray-400">Account Type</p>
                     <p className="text-sm font-medium text-gray-700">{method.type === 'card' ? 'Debit/Credit Card' : 'Checking Account'}</p>
                   </div>
                   {method.expiry && (
                     <div>
                       <p className="text-xs font-bold uppercase text-gray-400">Expiry</p>
                       <p className="text-sm font-medium text-gray-700">{method.expiry}</p>
                     </div>
                   )}
                </div>

                <div className="mt-8 pt-6 border-t flex items-center justify-between">
                   <div className="flex space-x-2">
                      {!method.isDefault && (
                        <Button variant="ghost" size="sm" className="text-[#1A3E6F] hover:bg-[#1A3E6F]/5">
                          Set Default
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50">
                        <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                      </Button>
                   </div>
                   <Button variant="ghost" size="icon" className="h-8 w-8">
                     <Star className={cn("h-4 w-4", method.isDefault ? "fill-yellow-400 text-yellow-400" : "text-gray-300")} />
                   </Button>
                </div>
             </CardContent>
           </Card>
         ))}

         <Card className="border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer flex flex-col items-center justify-center p-12 text-center" onClick={() => {}}>
            <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center shadow-sm">
               <Plus className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-4 font-bold text-[#1A3E6F]">Add another method</h3>
            <p className="text-xs text-gray-500 max-w-[150px] mx-auto mt-1">Connect a bank account or credit card for secure payments.</p>
         </Card>
      </div>

      <div className="bg-[#1A3E6F]/5 border border-[#1A3E6F]/10 rounded-2xl p-6 flex items-start space-x-4">
         <Info className="h-5 w-5 text-[#1A3E6F] shrink-0 mt-0.5" />
         <div className="space-y-1">
            <h4 className="font-bold text-[#1A3E6F]">Security & Privacy</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Awash Insurance uses bank-level encryption (AES-256) to protect your payment information. We never store your full card number on our servers.</p>
         </div>
      </div>
    </div>
  );
}