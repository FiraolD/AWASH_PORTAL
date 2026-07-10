import * as React from 'react';
import { Users, Plus, Edit2, Trash2, RefreshCw, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface AssignmentRule {
  id: string;
  rule_name: string;
  product_type: string;
  min_amount: number;
  max_amount: number | null;
  assigned_role: string;
  priority: number;
  is_active: boolean;
}

const PRODUCT_TYPES = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'ALL'];
const CLAIM_ROLES = [
  'CLAIM_OFFICER_I',
  'CLAIM_OFFICER_II',
  'SENIOR_CLAIM_OFFICER',
  'SUPERVISOR_CLAIMS',
  'MANAGER_CLAIMS',
  'HEAD_CLAIMS',
  'CLAIMS_ADMIN'
];

export default function ClaimsAssignmentConfigPage() {
  const [rules, setRules] = React.useState<AssignmentRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AssignmentRule | null>(null);
  const [formData, setFormData] = React.useState({
    rule_name: '',
    product_type: 'ALL',
    min_amount: 0,
    max_amount: '',
    assigned_role: 'CLAIM_OFFICER_II',
    priority: 1,
    is_active: true
  });
  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchRules();
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

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/claims-assignment/assignment-rules`, {
        headers: getAuthHeaders()
      });
      setRules(response.data);
    } catch (error) {
      console.error('Failed to fetch assignment rules:', error);
      toast.error('Failed to load assignment rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.rule_name || !formData.assigned_role) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        min_amount: parseFloat(formData.min_amount.toString()),
        priority: parseInt(formData.priority.toString())
      };

      if (editingRule) {
        await axios.put(`${API_URL}/claims-assignment/assignment-rules/${editingRule.id}`, payload, {
          headers: getAuthHeaders()
        });
        toast.success('Assignment rule updated successfully');
      } else {
        await axios.post(`${API_URL}/claims-assignment/assignment-rules`, payload, {
          headers: getAuthHeaders()
        });
        toast.success('Assignment rule created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchRules();
    } catch (error: any) {
      console.error('Failed to save assignment rule:', error);
      toast.error(error.response?.data?.error || 'Failed to save assignment rule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await axios.delete(`${API_URL}/claims-assignment/assignment-rules/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Assignment rule deleted successfully');
      fetchRules();
    } catch (error) {
      console.error('Failed to delete assignment rule:', error);
      toast.error('Failed to delete assignment rule');
    }
  };

  const handleEdit = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      product_type: rule.product_type,
      min_amount: rule.min_amount,
      max_amount: rule.max_amount?.toString() || '',
      assigned_role: rule.assigned_role,
      priority: rule.priority,
      is_active: rule.is_active
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      rule_name: '',
      product_type: 'ALL',
      min_amount: 0,
      max_amount: '',
      assigned_role: 'CLAIM_OFFICER_II',
      priority: 1,
      is_active: true
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading assignment rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Assignment Configuration</h1>
          <p className="text-gray-500 mt-1">Configure which claim officer handles claims based on sum insured amount</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1A3E6F]" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Add Assignment Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Assignment Rule' : 'Add Assignment Rule'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input 
                  value={formData.rule_name}
                  onChange={(e) => setFormData({...formData, rule_name: e.target.value})}
                  placeholder="e.g., Low Value Auto Claims"
                />
              </div>
              <div className="space-y-2">
                <Label>Product Type *</Label>
                <Select 
                  value={formData.product_type}
                  onValueChange={(val) => setFormData({...formData, product_type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount (ETB)</Label>
                  <Input 
                    type="number"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({...formData, min_amount: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount (ETB)</Label>
                  <Input 
                    type="number"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({...formData, max_amount: e.target.value})}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Assign To Role *</Label>
                <Select 
                  value={formData.assigned_role}
                  onValueChange={(val) => setFormData({...formData, assigned_role: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_ROLES.map(role => (
                      <SelectItem key={role} value={role}>{role.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input 
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                  placeholder="Lower number = higher priority"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch 
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({...formData, is_active: val})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button onClick={handleSubmit} className="flex-1 bg-[#1A3E6F]">
                  {editingRule ? 'Update' : 'Create'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Rules</CardTitle>
          <CardDescription>Claims are automatically assigned to officers based on these rules</CardDescription>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No assignment rules configured</p>
              <p className="text-sm mt-1">Click "Add Assignment Rule" to create rules</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm">
                    <th className="pb-3">Rule Name</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Amount Range (ETB)</th>
                    <th className="pb-3">Assign To</th>
                    <th className="pb-3">Priority</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="py-3 font-medium">{rule.rule_name}</td>
                      <td className="py-3">
                        <Badge variant="outline">{rule.product_type}</Badge>
                       </td>
                      <td className="py-3">
                        {rule.min_amount.toLocaleString()} - {rule.max_amount ? rule.max_amount.toLocaleString() : 'Unlimited'}
                       </td>
                      <td className="py-3">{rule.assigned_role.replace('_', ' ')}</td>
                      <td className="py-3">{rule.priority}</td>
                      <td className="py-3">
                        <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {rule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                       </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                       </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">How Claims Assignment Works</p>
            <p className="text-xs text-blue-700 mt-1">
              • When a claim is filed, the system checks the policy's sum insured amount and product type<br />
              • The first matching rule (by priority) determines which officer role gets assigned<br />
              • Claims are automatically assigned to available officers with that role<br />
              • Rules with lower priority numbers are evaluated first
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}