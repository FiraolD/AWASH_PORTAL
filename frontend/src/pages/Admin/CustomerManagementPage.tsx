import * as React from 'react';
import { Users, Search, RefreshCw, Mail, Phone, MapPin, MoreVertical, Ban, CheckCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  policiesCount: number;
  claimsCount: number;
  lastLoginAt: string;
  createdAt: string;
}

interface CustomerDetail extends Customer {
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
  addressCountry?: string;
  policies: any[];
  claims: any[];
  payments: any[];
}

export default function CustomerManagementPage() {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/users/customers`, {
        headers: getAuthHeaders()
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerDetail = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/users/customers/${id}`, {
        headers: getAuthHeaders()
      });
      setSelectedCustomer(response.data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
      toast.error('Failed to load customer details');
    }
  };

const updateCustomerStatus = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  console.log(`Updating customer ${id} from ${currentStatus} to ${newStatus}`);
  
  try {
    const response = await axios.patch(`${API_URL}/users/customers/${id}/status`,
      { status: newStatus },
      { 
        headers: getAuthHeaders(),
        withCredentials: true
      }
    );
    
    console.log('Update response:', response.data);
    toast.success(`Customer ${newStatus.toLowerCase()} successfully`);
    fetchCustomers(); // Refresh the list
  } catch (error: any) {
    console.error('Failed to update status:', error);
    console.error('Error response:', error.response?.data);
    toast.error(error.response?.data?.error || 'Failed to update customer status');
  }
};
  const filteredCustomers = customers.filter(customer =>
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Customer Management</h1>
          <p className="text-gray-500 mt-1">Manage all registered customers</p>
        </div>
        <Button onClick={fetchCustomers} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle>All Customers ({customers.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search customers..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No customers found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.map((customer) => (
                <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-[#1A3E6F]/10 text-[#1A3E6F] text-lg">
                          {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => fetchCustomerDetail(customer.id)}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateCustomerStatus(customer.id, customer.status)}>
                            {customer.status === 'ACTIVE' ? 
                              <Ban className="mr-2 h-4 w-4 text-red-600" /> : 
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            }
                            {customer.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-[#111827]">{customer.firstName} {customer.lastName}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs truncate">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">{customer.phone || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-xs text-gray-500">Policies</p>
                        <p className="text-lg font-bold text-[#1A3E6F]">{customer.policiesCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Claims</p>
                        <p className="text-lg font-bold text-[#1A3E6F]">{customer.claimsCount || 0}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center">
                      <Badge className={customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {customer.status}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-[#1A3E6F]"
                        onClick={() => fetchCustomerDetail(customer.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-semibold">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p>{selectedCustomer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p>{selectedCustomer.phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge className={selectedCustomer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {selectedCustomer.status}
                  </Badge>
                </div>
              </div>

              {/* Address */}
              {(selectedCustomer.addressStreet || selectedCustomer.addressCity) && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Address</p>
                  <p>{selectedCustomer.addressStreet}</p>
                  <p>{selectedCustomer.addressCity}, {selectedCustomer.addressState} {selectedCustomer.addressZip}</p>
                  <p>{selectedCustomer.addressCountry}</p>
                </div>
              )}

              {/* Policies */}
              {selectedCustomer.policies && selectedCustomer.policies.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Policies ({selectedCustomer.policies.length})</h3>
                  <div className="space-y-2">
                    {selectedCustomer.policies.map((policy: any) => (
                      <div key={policy.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{policy.policyNumber}</p>
                        <p className="text-sm text-gray-500">{policy.type} • {policy.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Claims */}
              {selectedCustomer.claims && selectedCustomer.claims.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Claims ({selectedCustomer.claims.length})</h3>
                  <div className="space-y-2">
                    {selectedCustomer.claims.map((claim: any) => (
                      <div key={claim.id} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium">{claim.claimNumber}</p>
                        <p className="text-sm text-gray-500">{claim.status} • ETB {claim.estimatedAmount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}