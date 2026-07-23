import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  Plus, 
  ChevronRight, 
  CheckCircle2, 
  Smartphone,
  Banknote
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { usePaymentStore } from '../../stores/paymentStore';
import { usePolicyStore } from '../../stores/policyStore';
import { cn } from '../../lib/utils';

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { payments, paymentMethods } = usePaymentStore();
  const { policies } = usePolicyStore();

  const getPolicyNumber = (id: string) => policies.find(p => p.id === id)?.policyNumber || 'N/A';

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Payments & Billing</h1>
          <p className="text-gray-500">Manage your premium payments and billing history.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/customer/payments/methods')}>
            <CreditCard className="mr-2 h-4 w-4" /> Payment Methods
          </Button>
          <Button variant="default" onClick={() => navigate('/customer/payments')}>
            Make a Payment
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
           <Card>
             <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Billing History</CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      <tr>
                        <th className="px-6 py-4">Transaction</th>
                        <th className="px-6 py-4">Policy</th>
                        <th className="px-6 py-4">Amount</th>
                        <th className="px-6 py-4 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                       {payments.map((payment) => (
                         <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                           <td className="px-6 py-4">
                             <div className="flex items-center space-x-3">
                               {payment.method.type === 'card' ? <CreditCard className="h-4 w-4" /> : <Banknote className="h-4 w-4" />}
                               <div>
                                 <p className="text-sm font-bold text-[#1A3E6F]">Premium Payment</p>
                                 <p className="text-xs text-gray-500">{payment.date}</p>
                               </div>
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className="font-mono text-xs text-gray-600">{getPolicyNumber(payment.policyId)}</span>
                           </td>
                           <td className="px-6 py-4">
                             <span className="text-sm font-bold text-[#1A3E6F]">${payment.amount.toLocaleString()}</span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-[#1A3E6F]">
                                <Download className="h-4 w-4" />
                              </Button>
                           </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
             </CardContent>
           </Card>
        </div>

        <div className="space-y-6">
           <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Saved Methods</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => navigate('/customer/payments/methods')}>
                  <Plus className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                 {paymentMethods.map((method) => (
                   <div key={method.id} className={cn(
                     "p-4 rounded-2xl border transition-all",
                     method.isDefault ? "bg-[#1A3E6F] text-white border-none shadow-lg" : "bg-white text-[#1A3E6F]"
                   )}>
                      <div className="flex justify-between items-start">
                         <div>
                            <p className="text-xs font-bold uppercase opacity-60">{method.brand || method.type}</p>
                            <p className="text-lg font-mono tracking-widest mt-1">\\u2022\\u2022\\u2022\\u2022 {method.last4}</p>
                         </div>
                         <div className={cn("rounded-lg p-1.5", method.isDefault ? "bg-white/20" : "bg-gray-100")}>
                           {method.type === 'card' ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
                         </div>
                      </div>
                      {method.isDefault && (
                        <div className="mt-4 flex items-center text-xs font-bold text-yellow-400">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Default Method
                        </div>
                      )}
                   </div>
                 ))}
                 <Button variant="outline" className="w-full text-sm" onClick={() => navigate('/customer/payments/methods')}>
                   Manage Methods <ChevronRight className="ml-1 h-4 w-4" />
                 </Button>
              </CardContent>
           </Card>

           <Card className="bg-[#E31E24] text-white overflow-hidden">
             <CardContent className="p-6 relative">
                <div className="relative z-10">
                   <h3 className="font-bold text-lg">Auto-Pay Active</h3>
                   <p className="text-sm text-blue-100 mt-1 leading-relaxed">Saving 5% on premiums.</p>
                   <Button variant="outline" className="mt-4 border-white text-white hover:bg-white/10 w-full">
                     Edit Settings
                   </Button>
                </div>
                <Smartphone className="absolute -right-4 -bottom-4 h-24 w-24 text-white opacity-20" />
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}