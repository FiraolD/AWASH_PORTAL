import * as React from 'react';
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Shield,
  AlertCircle,
  CheckCircle,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface ApprovalRule {
  id: string;
  rule_name: string;
  product_type: string;
  min_sum_insured?: number;
  max_sum_insured?: number;
  min_risk_score?: number;
  max_risk_score?: number;
  approval_levels: string[];
  is_active: boolean;
}

interface RoleLevel {
  id: string;
  level_code: string;
  level_name: string;
  department: string;
  level_order: number;
  can_approve: boolean;
  max_amount_limit?: number;
}

interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  requires_approval: boolean;
  approval_flow: any;
  is_active: boolean;
}

export default function ApprovalRulesConfigPage() {
  const [activeTab, setActiveTab] = React.useState('rules');
  const [rules, setRules] = React.useState<ApprovalRule[]>([]);
  const [roleLevels, setRoleLevels] = React.useState<RoleLevel[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<ApprovalRule | null>(null);
  const [showRuleForm, setShowRuleForm] = React.useState(false);
  const { token } = useAuthStore();

  // Form state for new/edit rule
  const [ruleForm, setRuleForm] = React.useState({
    rule_name: '',
    product_type: 'ALL',
    min_sum_insured: '',
    max_sum_insured: '',
    min_risk_score: '',
    max_risk_score: '',
    approval_levels: [] as string[],
    is_active: true
  });

  React.useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${token}`
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, levelsResponse, productsResponse] = await Promise.all([
        axios.get(`${API_URL}/approval/rules`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/approval/role-levels`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/products`, { headers: getAuthHeaders() })
      ]);

      setRules(rulesResponse.data);
      setRoleLevels(levelsResponse.data);
      setProducts(productsResponse.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      rule_name: '',
      product_type: 'ALL',
      min_sum_insured: '',
      max_sum_insured: '',
      min_risk_score: '',
      max_risk_score: '',
      approval_levels: [],
      is_active: true
    });
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setRuleForm({
      rule_name: rule.rule_name,
      product_type: rule.product_type,
      min_sum_insured: rule.min_sum_insured?.toString() || '',
      max_sum_insured: rule.max_sum_insured?.toString() || '',
      min_risk_score: rule.min_risk_score?.toString() || '',
      max_risk_score: rule.max_risk_score?.toString() || '',
      approval_levels: [...rule.approval_levels],
      is_active: rule.is_active
    });
    setShowRuleForm(true);
  };

  const handleSaveRule = async () => {
    if (!ruleForm.rule_name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    if (ruleForm.approval_levels.length === 0) {
      toast.error('At least one approval level is required');
      return;
    }

    setSaving(true);
    try {
      const ruleData = {
        rule_name: ruleForm.rule_name,
        product_type: ruleForm.product_type,
        min_sum_insured: ruleForm.min_sum_insured ? parseFloat(ruleForm.min_sum_insured) : null,
        max_sum_insured: ruleForm.max_sum_insured ? parseFloat(ruleForm.max_sum_insured) : null,
        min_risk_score: ruleForm.min_risk_score ? parseFloat(ruleForm.min_risk_score) : null,
        max_risk_score: ruleForm.max_risk_score ? parseFloat(ruleForm.max_risk_score) : null,
        approval_levels: ruleForm.approval_levels,
        is_active: ruleForm.is_active
      };

      if (editingRule) {
        await axios.put(`${API_URL}/approval/rules/${editingRule.id}`, ruleData, {
          headers: getAuthHeaders()
        });
        toast.success('Approval rule updated successfully');
      } else {
        await axios.post(`${API_URL}/approval/rules`, ruleData, {
          headers: getAuthHeaders()
        });
        toast.success('Approval rule created successfully');
      }

      setShowRuleForm(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save rule:', error);
      toast.error(error.response?.data?.error || 'Failed to save approval rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/approval/rules/${ruleId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Approval rule deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete approval rule');
    }
  };

  const handleToggleRuleStatus = async (rule: ApprovalRule) => {
    try {
      await axios.put(`${API_URL}/approval/rules/${rule.id}`, {
        ...rule,
        is_active: !rule.is_active
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Rule ${!rule.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchData();
    } catch (error) {
      console.error('Failed to toggle rule status:', error);
      toast.error('Failed to update rule status');
    }
  };

  const addApprovalLevel = (levelId: string) => {
    if (!ruleForm.approval_levels.includes(levelId)) {
      setRuleForm({
        ...ruleForm,
        approval_levels: [...ruleForm.approval_levels, levelId]
      });
    }
  };

  const removeApprovalLevel = (levelId: string) => {
    setRuleForm({
      ...ruleForm,
      approval_levels: ruleForm.approval_levels.filter(level => level !== levelId)
    });
  };

  const moveLevelUp = (index: number) => {
    if (index > 0) {
      const newLevels = [...ruleForm.approval_levels];
      [newLevels[index - 1], newLevels[index]] = [newLevels[index], newLevels[index - 1]];
      setRuleForm({ ...ruleForm, approval_levels: newLevels });
    }
  };

  const moveLevelDown = (index: number) => {
    if (index < ruleForm.approval_levels.length - 1) {
      const newLevels = [...ruleForm.approval_levels];
      [newLevels[index], newLevels[index + 1]] = [newLevels[index + 1], newLevels[index]];
      setRuleForm({ ...ruleForm, approval_levels: newLevels });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading approval configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Rules Configuration</h1>
          <p className="text-gray-600">Configure multi-level approval workflows for policies based on sum insured and risk scores</p>
        </div>
        <Button onClick={handleCreateRule} className="bg-[#1A3E6F] hover:bg-[#2A4E7F]">
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
          <TabsTrigger value="levels">Role Levels</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          {/* Rules List */}
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{rule.rule_name}</CardTitle>
                      <CardDescription>
                        Product: {rule.product_type} |
                        Sum Insured: {rule.min_sum_insured ? `ETB ${rule.min_sum_insured.toLocaleString()}` : 'Any'} - {rule.max_sum_insured ? `ETB ${rule.max_sum_insured.toLocaleString()}` : 'Unlimited'} |
                        Risk Score: {rule.min_risk_score || 0} - {rule.max_risk_score || 100}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
  
<div className="inline-flex items-center">
  <Switch 
    checked={rule.is_active} 
    onCheckedChange={() => handleToggleRuleStatus(rule)}
  />
</div>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Approval Levels:</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.approval_levels.map((levelId, index) => {
                        const level = roleLevels.find(l => l.id === levelId);
                        return (
                          <div key={levelId} className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-blue-50">
                              {index + 1}. {level ? level.level_name : levelId}
                            </Badge>
                            {index < rule.approval_levels.length - 1 && (
                              <span className="text-gray-400">→</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {rules.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Approval Rules</h3>
                  <p className="text-gray-500 mb-4">Create your first approval rule to get started</p>
                  <Button onClick={handleCreateRule}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="levels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Levels</CardTitle>
              <CardDescription>Manage approval role levels and their permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleLevels
                  .sort((a, b) => a.level_order - b.level_order)
                  .map((level) => (
                    <div key={level.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{level.level_name}</span>
                          <Badge variant="outline">{level.level_code}</Badge>
                          <Badge className="bg-blue-100 text-blue-800">{level.department}</Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          Order: {level.level_order} |
                          {level.can_approve ? 'Can Approve' : 'Review Only'} |
                          {level.max_amount_limit ? `Max: ETB ${level.max_amount_limit.toLocaleString()}` : 'No Limit'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {level.can_approve && <CheckCircle className="h-5 w-5 text-green-600" />}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rule Form Modal */}
      {showRuleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingRule ? 'Edit Approval Rule' : 'Create Approval Rule'}</CardTitle>
              <CardDescription>
                Configure approval levels based on policy criteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rule Name</Label>
                  <Input
                    value={ruleForm.rule_name}
                    onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })}
                    placeholder="e.g., High Value Auto Policies"
                  />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Select value={ruleForm.product_type} onValueChange={(value) => setRuleForm({ ...ruleForm, product_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Products</SelectItem>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.code}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Sum Insured (ETB)</Label>
                  <Input
                    type="number"
                    value={ruleForm.min_sum_insured}
                    onChange={(e) => setRuleForm({ ...ruleForm, min_sum_insured: e.target.value })}
                    placeholder="Leave empty for no minimum"
                  />
                </div>
                <div>
                  <Label>Max Sum Insured (ETB)</Label>
                  <Input
                    type="number"
                    value={ruleForm.max_sum_insured}
                    onChange={(e) => setRuleForm({ ...ruleForm, max_sum_insured: e.target.value })}
                    placeholder="Leave empty for no maximum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min Risk Score (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ruleForm.min_risk_score}
                    onChange={(e) => setRuleForm({ ...ruleForm, min_risk_score: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Max Risk Score (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ruleForm.max_risk_score}
                    onChange={(e) => setRuleForm({ ...ruleForm, max_risk_score: e.target.value })}
                    placeholder="100"
                  />
                </div>
              </div>

              <div>
                <Label>Approval Levels (in order)</Label>
                <div className="space-y-2 mt-2">
                  {ruleForm.approval_levels.map((levelId, index) => {
                    const level = roleLevels.find(l => l.id === levelId);
                    return (
                      <div key={levelId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                        <span className="font-medium">{index + 1}.</span>
                        <Badge>{level ? level.level_name : levelId}</Badge>
                        <div className="ml-auto flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => moveLevelUp(index)}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => moveLevelDown(index)}>
                            ↓
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeApprovalLevel(levelId)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Select onValueChange={addApprovalLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Add approval level..." />
                    </SelectTrigger>
                    <SelectContent>
                      {roleLevels
                        .filter(level => !ruleForm.approval_levels.includes(level.id))
                        .sort((a, b) => a.level_order - b.level_order)
                        .map((level) => (
                          <SelectItem key={level.id} value={level.level_code}>
                            {level.level_name} ({level.level_code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={ruleForm.is_active}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 border-t">
              <Button variant="outline" onClick={() => setShowRuleForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Rule'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}