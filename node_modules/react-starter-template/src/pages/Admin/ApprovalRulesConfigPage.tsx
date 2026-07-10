import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Save, X, Shield, CheckCircle, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { apiClient } from '../../api/client';

interface ApprovalRule {
  id: string;
  ruleName: string;
  productType: string;
  minSumInsured?: number | string | null;
  maxSumInsured?: number | string | null;
  minRiskScore?: number | string | null;
  maxRiskScore?: number | string | null;
  approvalLevels: string[];
  isActive: boolean;
}

interface RoleLevel {
  id: string;
  levelCode: string;
  levelName: string;
  department: string;
  levelOrder: number;
  canApprove: boolean;
  maxAmountLimit?: number | string | null;
}

interface Product {
  id: string;
  name: string;
  code: string;
  description: string;
  requiresApproval: boolean;
  approvalFlow: unknown;
  isActive: boolean;
}

type RulePayload = {
  rule_name: string;
  product_type: string;
  min_sum_insured: number | null;
  max_sum_insured: number | null;
  min_risk_score: number | null;
  max_risk_score: number | null;
  approval_levels: string[];
  is_active: boolean;
};

const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value : [];
const asNumber = (value: number | string | null | undefined) => value === null || value === undefined || value === '' ? undefined : Number(value);
const toOptionalNumber = (value: string) => value.trim() === '' ? null : Number(value);

const fetchApprovalConfig = async () => {
  const [rulesResponse, levelsResponse, productsResponse] = await Promise.all([
    apiClient.get('/approval/rules'),
    apiClient.get('/approval/role-levels'),
    apiClient.get('/products'),
  ]);

  return {
    rules: asArray<ApprovalRule>(rulesResponse.data).map((rule) => ({
      ...rule,
      approvalLevels: asArray<string>(rule.approvalLevels),
    })),
    roleLevels: asArray<RoleLevel>(levelsResponse.data),
    products: asArray<Product>(productsResponse.data),
  };
};

export default function ApprovalRulesConfigPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('rules');
  const [editingRule, setEditingRule] = React.useState<ApprovalRule | null>(null);
  const [showRuleForm, setShowRuleForm] = React.useState(false);
  const [ruleForm, setRuleForm] = React.useState({
    ruleName: '',
    productType: 'ALL',
    minSumInsured: '',
    maxSumInsured: '',
    minRiskScore: '',
    maxRiskScore: '',
    approvalLevels: [] as string[],
    isActive: true,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approval-config'],
    queryFn: fetchApprovalConfig,
  });

  const rules = data?.rules ?? [];
  const roleLevels = data?.roleLevels ?? [];
  const products = data?.products ?? [];

  const saveRuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: RulePayload }) => (
      id ? apiClient.put(`/approval/rules/${id}`, payload) : apiClient.post('/approval/rules', payload)
    ),
    onSuccess: (_response, variables) => {
      toast.success(`Approval rule ${variables.id ? 'updated' : 'created'} successfully`);
      setShowRuleForm(false);
      queryClient.invalidateQueries({ queryKey: ['approval-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save approval rule');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) => apiClient.delete(`/approval/rules/${ruleId}`),
    onSuccess: () => {
      toast.success('Approval rule deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['approval-config'] });
    },
    onError: () => toast.error('Failed to delete approval rule'),
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (rule: ApprovalRule) => apiClient.put(`/approval/rules/${rule.id}`, buildPayload(rule)),
    onSuccess: (_response, rule) => {
      toast.success(`Rule ${!rule.isActive ? 'activated' : 'deactivated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['approval-config'] });
    },
    onError: () => toast.error('Failed to update rule status'),
  });

  function buildPayload(rule: ApprovalRule): RulePayload {
    return {
      rule_name: rule.ruleName,
      product_type: rule.productType,
      min_sum_insured: asNumber(rule.minSumInsured) ?? null,
      max_sum_insured: asNumber(rule.maxSumInsured) ?? null,
      min_risk_score: asNumber(rule.minRiskScore) ?? 0,
      max_risk_score: asNumber(rule.maxRiskScore) ?? 100,
      approval_levels: rule.approvalLevels,
      is_active: !rule.isActive,
    };
  }

  const handleCreateRule = () => {
    setEditingRule(null);
    setRuleForm({
      ruleName: '',
      productType: 'ALL',
      minSumInsured: '',
      maxSumInsured: '',
      minRiskScore: '',
      maxRiskScore: '',
      approvalLevels: [],
      isActive: true,
    });
    setShowRuleForm(true);
  };

  const handleEditRule = (rule: ApprovalRule) => {
    setEditingRule(rule);
    setRuleForm({
      ruleName: rule.ruleName,
      productType: rule.productType,
      minSumInsured: asNumber(rule.minSumInsured)?.toString() || '',
      maxSumInsured: asNumber(rule.maxSumInsured)?.toString() || '',
      minRiskScore: asNumber(rule.minRiskScore)?.toString() || '',
      maxRiskScore: asNumber(rule.maxRiskScore)?.toString() || '',
      approvalLevels: [...rule.approvalLevels],
      isActive: rule.isActive,
    });
    setShowRuleForm(true);
  };

  const handleSaveRule = () => {
    if (!ruleForm.ruleName.trim()) {
      toast.error('Rule name is required');
      return;
    }

    if (ruleForm.approvalLevels.length === 0) {
      toast.error('At least one approval level is required');
      return;
    }

    const payload: RulePayload = {
      rule_name: ruleForm.ruleName.trim(),
      product_type: ruleForm.productType,
      min_sum_insured: toOptionalNumber(ruleForm.minSumInsured),
      max_sum_insured: toOptionalNumber(ruleForm.maxSumInsured),
      min_risk_score: toOptionalNumber(ruleForm.minRiskScore),
      max_risk_score: toOptionalNumber(ruleForm.maxRiskScore),
      approval_levels: ruleForm.approvalLevels,
      is_active: ruleForm.isActive,
    };

    saveRuleMutation.mutate({ id: editingRule?.id, payload });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (confirm('Are you sure you want to deactivate this approval rule?')) {
      deleteRuleMutation.mutate(ruleId);
    }
  };

  const addApprovalLevel = (levelId: string) => {
    if (!ruleForm.approvalLevels.includes(levelId)) {
      setRuleForm((current) => ({ ...current, approvalLevels: [...current.approvalLevels, levelId] }));
    }
  };

  const removeApprovalLevel = (levelId: string) => {
    setRuleForm((current) => ({
      ...current,
      approvalLevels: current.approvalLevels.filter((level) => level !== levelId),
    }));
  };

  const moveLevel = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ruleForm.approvalLevels.length) return;

    const newLevels = [...ruleForm.approvalLevels];
    [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];
    setRuleForm((current) => ({ ...current, approvalLevels: newLevels }));
  };

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-gray-500">
        <LoadingSpinner size="md" />
        <p>Loading approval configuration...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Shield className="h-12 w-12 text-red-400" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Approval configuration could not be loaded</h3>
            <p className="text-sm text-gray-500">Check your connection and permissions, then try again.</p>
          </div>
          <Button onClick={() => refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
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
          <div className="grid gap-4">
            {rules.length > 0 ? rules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{rule.ruleName}</CardTitle>
                      <CardDescription>
                        Product: {rule.productType} | Sum Insured: {asNumber(rule.minSumInsured) ? `ETB ${asNumber(rule.minSumInsured)?.toLocaleString()}` : 'Any'} - {asNumber(rule.maxSumInsured) ? `ETB ${asNumber(rule.maxSumInsured)?.toLocaleString()}` : 'Unlimited'} | Risk Score: {asNumber(rule.minRiskScore) ?? 0} - {asNumber(rule.maxRiskScore) ?? 100}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={rule.isActive}
                        disabled={toggleRuleMutation.isPending}
                        onCheckedChange={() => toggleRuleMutation.mutate(rule)}
                      />
                      <Button variant="ghost" size="sm" disabled={deleteRuleMutation.isPending} onClick={() => handleDeleteRule(rule.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Approval Levels:</p>
                    <div className="flex flex-wrap gap-2">
                      {rule.approvalLevels.map((levelId, index) => {
                        const level = roleLevels.find((item) => item.id === levelId);
                        return (
                          <div key={`${rule.id}-${levelId}`} className="flex items-center gap-1">
                            <Badge variant="outline" className="bg-blue-50">
                              {index + 1}. {level ? level.levelName : levelId}
                            </Badge>
                            {index < rule.approvalLevels.length - 1 && <span className="text-gray-400">-&gt;</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No Approval Rules</h3>
                  <p className="mb-4 text-gray-500">Create your first approval rule to get started</p>
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
                {roleLevels.length > 0 ? [...roleLevels].sort((a, b) => a.levelOrder - b.levelOrder).map((level) => (
                  <div key={level.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{level.levelName}</span>
                        <Badge variant="outline">{level.levelCode}</Badge>
                        <Badge className="bg-blue-100 text-blue-800">{level.department}</Badge>
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        Order: {level.levelOrder} | {level.canApprove ? 'Can Approve' : 'Review Only'} | {asNumber(level.maxAmountLimit) ? `Max: ETB ${asNumber(level.maxAmountLimit)?.toLocaleString()}` : 'No Limit'}
                      </div>
                    </div>
                    {level.canApprove && <CheckCircle className="h-5 w-5 text-green-600" />}
                  </div>
                )) : (
                  <div className="py-8 text-center text-gray-500">
                    <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p>No role levels configured</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showRuleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingRule ? 'Edit Approval Rule' : 'Create Approval Rule'}</CardTitle>
              <CardDescription>Configure approval levels based on policy criteria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Rule Name</Label>
                  <Input value={ruleForm.ruleName} onChange={(event) => setRuleForm({ ...ruleForm, ruleName: event.target.value })} placeholder="e.g., High Value Auto Policies" />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Select value={ruleForm.productType} onValueChange={(value) => setRuleForm({ ...ruleForm, productType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Products</SelectItem>
                      {products.map((product) => <SelectItem key={product.id} value={product.code}>{product.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Min Sum Insured (ETB)</Label>
                  <Input type="number" min="0" value={ruleForm.minSumInsured} onChange={(event) => setRuleForm({ ...ruleForm, minSumInsured: event.target.value })} placeholder="Leave empty for no minimum" />
                </div>
                <div>
                  <Label>Max Sum Insured (ETB)</Label>
                  <Input type="number" min="0" value={ruleForm.maxSumInsured} onChange={(event) => setRuleForm({ ...ruleForm, maxSumInsured: event.target.value })} placeholder="Leave empty for no maximum" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Min Risk Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={ruleForm.minRiskScore} onChange={(event) => setRuleForm({ ...ruleForm, minRiskScore: event.target.value })} placeholder="0" />
                </div>
                <div>
                  <Label>Max Risk Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={ruleForm.maxRiskScore} onChange={(event) => setRuleForm({ ...ruleForm, maxRiskScore: event.target.value })} placeholder="100" />
                </div>
              </div>

              <div>
                <Label>Approval Levels (in order)</Label>
                <div className="mt-2 space-y-2">
                  {ruleForm.approvalLevels.map((levelId, index) => {
                    const level = roleLevels.find((item) => item.id === levelId);
                    return (
                      <div key={levelId} className="flex items-center gap-2 rounded bg-gray-50 p-2">
                        <span className="font-medium">{index + 1}.</span>
                        <Badge>{level ? level.levelName : levelId}</Badge>
                        <div className="ml-auto flex gap-1">
                          <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => moveLevel(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" disabled={index === ruleForm.approvalLevels.length - 1} onClick={() => moveLevel(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => removeApprovalLevel(levelId)}><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}

                  <Select onValueChange={addApprovalLevel}>
                    <SelectTrigger><SelectValue placeholder="Add approval level..." /></SelectTrigger>
                    <SelectContent>
                      {roleLevels
                        .filter((level) => !ruleForm.approvalLevels.includes(level.id))
                        .sort((a, b) => a.levelOrder - b.levelOrder)
                        .map((level) => <SelectItem key={level.id} value={level.id}>{level.levelName} ({level.levelCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch checked={ruleForm.isActive} onCheckedChange={(checked) => setRuleForm({ ...ruleForm, isActive: checked })} />
                <Label>Active</Label>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 border-t p-6">
              <Button variant="outline" onClick={() => setShowRuleForm(false)}>Cancel</Button>
              <Button onClick={handleSaveRule} disabled={saveRuleMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
