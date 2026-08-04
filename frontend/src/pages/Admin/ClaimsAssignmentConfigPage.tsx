import * as React from 'react';
import { Users, Plus, Edit2, Trash2, RefreshCw, DollarSign, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// ---------------------------------------------------------------------------
// Types – camelCase to match backend
// ---------------------------------------------------------------------------
interface AssignmentRule {
  id: string;
  ruleName: string;        // ✅ camelCase
  productType: string;     // ✅ camelCase
  minAmount: number;       // ✅ camelCase
  maxAmount: number | null; // ✅ camelCase
  assignedRole: string;    // ✅ camelCase
  priority: number;
  isActive: boolean;       // ✅ camelCase
}

const PRODUCT_TYPES = ['AUTO', 'HOME', 'LIFE', 'HEALTH', 'ALL'];

const CLAIM_ROLES = [
  'CLAIM_OFFICER_I',
  'CLAIM_OFFICER_II',
  'SENIOR_CLAIM_OFFICER',
  'SUPERVISOR_CLAIMS',
  'MANAGER_CLAIMS',
  'HEAD_CLAIMS',
  'CLAIMS_ADMIN',
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ClaimsAssignmentConfigPage() {
  const [rules, setRules] = React.useState<AssignmentRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<AssignmentRule | null>(null);

  // Form state – camelCase
  const [formData, setFormData] = React.useState({
    ruleName: '',           // ✅ camelCase
    productType: 'ALL',     // ✅ camelCase
    minAmount: 0,           // ✅ camelCase
    maxAmount: '',          // ✅ camelCase (string for input)
    assignedRole: 'CLAIM_OFFICER_II', // ✅ camelCase
    priority: 1,
    isActive: true,         // ✅ camelCase
  });

  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchRules();
  }, []);

  // --------------------------------------------------------------------------
  // Auth headers
  // --------------------------------------------------------------------------
  const getAuthHeaders = () => {
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = token;
    if (!authToken && stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
    }
    return { Authorization: `Bearer ${authToken}` };
  };

  // --------------------------------------------------------------------------
  // Fetch rules
  // --------------------------------------------------------------------------
  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/claims-assignment`, {
        headers: getAuthHeaders(),
      });
      setRules(response.data);
    } catch (error) {
      console.error('Failed to fetch assignment rules:', error);
      toast.error('Failed to load assignment rules');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // Save (create/update) rule
  // --------------------------------------------------------------------------
  const handleSubmit = async () => {
    if (!formData.ruleName || !formData.assignedRole) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      // Build payload with camelCase field names
      const payload = {
        ruleName: formData.ruleName,
        productType: formData.productType,
        minAmount: parseFloat(formData.minAmount.toString()),
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : null,
        assignedRole: formData.assignedRole,
        priority: parseInt(formData.priority.toString()),
        isActive: formData.isActive,
      };

      if (editingRule) {
        await axios.put(`${API_URL}/claims-assignment/${editingRule.id}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success('Assignment rule updated successfully');
      } else {
        await axios.post(`${API_URL}/claims-assignment/`, payload, {
          headers: getAuthHeaders(),
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

  // --------------------------------------------------------------------------
  // Delete rule
  // --------------------------------------------------------------------------
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await axios.delete(`${API_URL}/claims-assignment/${id}`, {
        headers: getAuthHeaders(),
      });
      toast.success('Assignment rule deleted successfully');
      fetchRules();
    } catch (error) {
      console.error('Failed to delete assignment rule:', error);
      toast.error('Failed to delete assignment rule');
    }
  };

  // --------------------------------------------------------------------------
  // Edit rule – populate form with camelCase fields
  // --------------------------------------------------------------------------
  const handleEdit = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setFormData({
      ruleName: rule.ruleName,
      productType: rule.productType,
      minAmount: rule.minAmount,
      maxAmount: rule.maxAmount?.toString() || '',
      assignedRole: rule.assignedRole,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setIsDialogOpen(true);
  };

  // --------------------------------------------------------------------------
  // Reset form
  // --------------------------------------------------------------------------
  const resetForm = () => {
    setEditingRule(null);
    setFormData({
      ruleName: '',
      productType: 'ALL',
      minAmount: 0,
      maxAmount: '',
      assignedRole: 'CLAIM_OFFICER_II',
      priority: 1,
      isActive: true,
    });
  };

  // --------------------------------------------------------------------------
  // Loading state
  // --------------------------------------------------------------------------
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

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Claims Assignment Configuration</h1>
          <p className="text-gray-500 mt-1">
            Configure which claim officer handles claims based on sum insured amount
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1A3E6F]" onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" /> Add Assignment Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? 'Edit Assignment Rule' : 'Add Assignment Rule'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Rule Name */}
              <div className="space-y-2">
                <Label>Rule Name *</Label>
                <Input
                  value={formData.ruleName}
                  onChange={(e) => setFormData({ ...formData, ruleName: e.target.value })}
                  placeholder="e.g., Low Value Auto Claims"
                />
              </div>

              {/* Product Type */}
              <div className="space-y-2">
                <Label>Product Type *</Label>
                <Select
                  value={formData.productType}
                  onValueChange={(val) => setFormData({ ...formData, productType: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={formData.minAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, minAmount: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount (ETB)</Label>
                  <Input
                    type="number"
                    value={formData.maxAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, maxAmount: e.target.value })
                    }
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              {/* Assign To Role */}
              <div className="space-y-2">
                <Label>Assign To Role *</Label>
                <Select
                  value={formData.assignedRole}
                  onValueChange={(val) => setFormData({ ...formData, assignedRole: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLAIM_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })
                  }
                  placeholder="Lower number = higher priority"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
                />
              </div>

              {/* Buttons */}
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

      {/* Rules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Rules</CardTitle>
          <CardDescription>
            Claims are automatically assigned to officers based on these rules
          </CardDescription>
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
                      <td className="py-3 font-medium">{rule.ruleName}</td>
                      <td className="py-3">
                        <Badge variant="outline">{rule.productType}</Badge>
                      </td>
                      <td className="py-3">
                        {rule.minAmount?.toLocaleString() ?? 0} -{' '}
                        {rule.maxAmount ? rule.maxAmount.toLocaleString() : 'Unlimited'}
                      </td>
                      <td className="py-3">{rule.assignedRole?.replace(/_/g, ' ')}</td>
                      <td className="py-3">{rule.priority}</td>
                      <td className="py-3">
                        <Badge
                          className={
                            rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
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

      {/* Info box */}
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