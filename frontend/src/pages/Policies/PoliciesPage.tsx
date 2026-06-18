import * as React from 'react';
import { Search, FileText, Download, CheckCircle2, ShieldCheck, ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { usePolicyStore } from '../../stores/policyStore';
import { useAuthStore } from '../../stores/authStore';
import { PolicyType } from '../../types';
import { cn } from '../../lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export default function PoliciesPage() {
  const navigate = useNavigate();
  const { policies, fetchPolicies } = usePolicyStore();
  const { token, user } = useAuthStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<PolicyType | 'all'>('all');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadPolicies();
  }, []);

  const loadPolicies = async () => {
    setLoading(true);
    await fetchPolicies();
    setLoading(false);
  };

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const filteredPolicies = policies.filter((p) => {
    const matchesSearch = p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#1a3668]">My Policies</h1>
          <p className="text-gray-500">Manage and view your insurance coverage details.</p>
        </div>
        <Button 
          className="bg-[#1a3668] hover:bg-[#1a3668]/90"
          onClick={() => navigate('/customer/policies/new')}
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Policy
        </Button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <Input 
            placeholder="Search policies..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'auto', 'home', 'life', 'health'].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterType(type as any)}
              className="capitalize"
            >
              {type}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
            <p className="text-gray-500">Loading policies...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPolicies.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No policies found</p>
              <Button 
                className="mt-4 bg-[#1a3668]"
                onClick={() => navigate('/customer/policies/new')}
              >
                Add Your First Policy
              </Button>
            </div>
          ) : (
            filteredPolicies.map((policy, index) => (
              <motion.div key={policy.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="group h-full cursor-pointer overflow-hidden transition-all hover:border-[#1a3668]/50" onClick={() => navigate(`/customer/policies/${policy.id}`)}>
                  <div className={cn(
                    'h-2 w-full',
                    policy.type === 'auto' ? 'bg-blue-500' : 
                    policy.type === 'home' ? 'bg-green-500' :
                    policy.type === 'life' ? 'bg-purple-500' : 'bg-red-500'
                  )} />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="bg-green-50 text-green-700 border-none shadow-none">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {policy.status}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-lg font-bold capitalize text-[#1a3668]">{policy.type} Insurance</h3>
                      <p className="font-mono text-sm text-gray-500">{policy.policyNumber}</p>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Coverage Amount</p>
                      <p className="text-xl font-bold text-[#1a3668]">ETB {policy.coverageAmount?.toLocaleString()}</p>
                    </div>
                    <div className="mt-8 flex items-center justify-between border-t pt-4">
                      <Button variant="ghost" size="sm" className="p-0 text-[#1a3668] hover:bg-transparent">
                        View Details <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}