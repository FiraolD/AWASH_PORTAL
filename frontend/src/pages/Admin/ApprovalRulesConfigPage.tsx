import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Save, X, Shield, CheckCircle, Users, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { apiClient } from '../../api/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApprovalRule {
  id: string;
  ruleName: string;
  productType: string;
  minSumInsured?: number | string | null;
  maxSumInsured?: number | string | null;
  minRiskScore?: number | string | null;
  maxRiskScore?: number | string | null;
  approvalLevels: string[];
  approval_levels?: string[];
  isActive: boolean;
}

interface RoleLevel {
  id: string;
  levelCode: string;
  levelName: string;
  department: string;
  levelOrder: number;
  canApprove: boolean;
  canReject?: boolean;
  maxAmountLimit?: number | string | null;
  isActive?: boolean;
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
  ruleName: string;          // Changed from rule_name
  productType: string;       // Changed from product_type
  minSumInsured: number | null;   // Changed from min_sum_insured
  maxSumInsured: number | null;   // Changed from max_sum_insured
  minRiskScore: number | null;    // Changed from min_risk_score
  maxRiskScore: number | null;    // Changed from max_risk_score
  approvalLevels: string[];       // Changed from approval_levels
  isActive: boolean;              // Changed from is_active
};

type RoleLevelPayload = {
  levelCode: string;
  levelName: string;
  department: string;
  levelOrder: number;
  canApprove: boolean;
  canReject: boolean;
  maxAmountLimit: number | null;
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
      approvalLevels: Array.isArray(rule.approvalLevels)
        ? rule.approvalLevels
        : Array.isArray(rule.approval_levels)
          ? rule.approval_levels
          : [],
    })),
    roleLevels: asArray<RoleLevel>(levelsResponse.data),
    products: asArray<Product>(productsResponse.data),
  };
};

const DEPARTMENTS = ['CLAIMS', 'UNDERWRITING', 'ADMIN', 'EXECUTIVE', 'FINANCE'];

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ApprovalRulesConfigPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('rules');

  // --- Rule form state ---
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

  // --- Role level form state ---
  const [editingRoleLevel, setEditingRoleLevel] = React.useState<RoleLevel | null>(null);
  const [showRoleLevelForm, setShowRoleLevelForm] = React.useState(false);
  const [roleLevelForm, setRoleLevelForm] = React.useState({
    levelCode: '',
    levelName: '',
    department: 'CLAIMS',
    levelOrder: 1,
    canApprove: false,
    canReject: false,
    maxAmountLimit: '',
    isActive: true,
  });

  // --- Data fetching ---
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approval-config'],
    queryFn: fetchApprovalConfig,
  });

  const rules = data?.rules ?? [];
  const roleLevels = data?.roleLevels ?? [];
  const products = data?.products ?? [];

  // ==========================================================================
  // RULE MUTATIONS
  // ==========================================================================
  const saveRuleMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: RulePayload }) =>
      id ? apiClient.put(`/approval/rules/${id}`, payload) : apiClient.post('/approval/rules', payload),
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

  // ==========================================================================
  // ROLE LEVEL MUTATIONS (NEW)
  // ==========================================================================
  const saveRoleLevelMutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: RoleLevelPayload }) =>
      id
        ? apiClient.put(`/approval/role-levels/${id}`, payload)
        : apiClient.post('/approval/role-levels', payload),
    onSuccess: (_response, variables) => {
      toast.success(`Role level ${variables.id ? 'updated' : 'created'} successfully`);
      setShowRoleLevelForm(false);
      setEditingRoleLevel(null);
      queryClient.invalidateQueries({ queryKey: ['approval-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save role level');
    },
  });

  const deleteRoleLevelMutation = useMutation({
    mutationFn: (levelId: string) => apiClient.delete(`/approval/role-levels/${levelId}`),
    onSuccess: () => {
      toast.success('Role level deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['approval-config'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete role level');
    },
  });

  // ==========================================================================
  // RULE HANDLERS
  // ==========================================================================
  function buildPayload(rule: ApprovalRule): RulePayload {
  return {
    ruleName: rule.ruleName,
    productType: rule.productType,
    minSumInsured: asNumber(rule.minSumInsured) ?? null,
    maxSumInsured: asNumber(rule.maxSumInsured) ?? null,
    minRiskScore: asNumber(rule.minRiskScore) ?? 0,
    maxRiskScore: asNumber(rule.maxRiskScore) ?? 100,
    approvalLevels: rule.approvalLevels,
    isActive: !rule.isActive,
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
    ruleName: ruleForm.ruleName.trim(),
    productType: ruleForm.productType,
    minSumInsured: toOptionalNumber(ruleForm.minSumInsured),
    maxSumInsured: toOptionalNumber(ruleForm.maxSumInsured),
    minRiskScore: toOptionalNumber(ruleForm.minRiskScore),
    maxRiskScore: toOptionalNumber(ruleForm.maxRiskScore),
    approvalLevels: ruleForm.approvalLevels,
    isActive: ruleForm.isActive,
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

  // ==========================================================================
  // ROLE LEVEL HANDLERS (NEW)
  // ==========================================================================
  const handleCreateRoleLevel = () => {
    setEditingRoleLevel(null);
    setRoleLevelForm({
      levelCode: '',
      levelName: '',
      department: 'CLAIMS',
      levelOrder: (roleLevels.length || 0) + 1,
      canApprove: false,
      canReject: false,
      maxAmountLimit: '',
      isActive: true,
    });
    setShowRoleLevelForm(true);
  };

  const handleEditRoleLevel = (level: RoleLevel) => {
    setEditingRoleLevel(level);
    setRoleLevelForm({
      levelCode: level.levelCode,
      levelName: level.levelName,
      department: level.department || 'CLAIMS',
      levelOrder: level.levelOrder,
      canApprove: level.canApprove,
      canReject: level.canReject || false,
      maxAmountLimit: asNumber(level.maxAmountLimit)?.toString() || '',
      isActive: level.isActive !== undefined ? level.isActive : true,
    });
    setShowRoleLevelForm(true);
  };

  const handleSaveRoleLevel = () => {
    if (!roleLevelForm.levelCode.trim() || !roleLevelForm.levelName.trim()) {
      toast.error('Level code and level name are required');
      return;
    }
    const payload: RoleLevelPayload = {
      levelCode: roleLevelForm.levelCode.trim(),
      levelName: roleLevelForm.levelName.trim(),
      department: roleLevelForm.department,
      levelOrder: roleLevelForm.levelOrder,
      canApprove: roleLevelForm.canApprove,
      canReject: roleLevelForm.canReject,
      maxAmountLimit: toOptionalNumber(roleLevelForm.maxAmountLimit),
      isActive: roleLevelForm.isActive,
    };
    saveRoleLevelMutation.mutate({ id: editingRoleLevel?.id, payload });
  };

  const handleDeleteRoleLevel = (levelId: string) => {
    if (confirm('Are you sure you want to delete this role level?')) {
      deleteRoleLevelMutation.mutate(levelId);
    }
  };

  // ==========================================================================
  // LOADING / ERROR
  // ==========================================================================
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

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approval Rules Configuration</h1>
          <p className="text-gray-600">
            Configure multi-level approval workflows and manage role levels
          </p>
        </div>
        {activeTab === 'rules' ? (
          <Button onClick={handleCreateRule} className="bg-[#1A3E6F] hover:bg-[#2A4E7F]">
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Button>
        ) : (
          <Button onClick={handleCreateRoleLevel} className="bg-[#1A3E6F] hover:bg-[#2A4E7F]">
            <Plus className="mr-2 h-4 w-4" />
            Add Role Level
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rules">Approval Rules</TabsTrigger>
          <TabsTrigger value="levels">Role Levels</TabsTrigger>
        </TabsList>

        {/* ================================================================ */}
        {/* APPROVAL RULES TAB */}
        {/* ================================================================ */}
        <TabsContent value="rules" className="space-y-6">
          <div className="grid gap-4">
            {rules.length > 0 ? (
              rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-lg">{rule.ruleName}</CardTitle>
                        <CardDescription>
                          Product: {rule.productType} | Sum Insured:{' '}
                          {asNumber(rule.minSumInsured)
                            ? `ETB ${asNumber(rule.minSumInsured)?.toLocaleString()}`
                            : 'Any'}{' '}
                          -{' '}
                          {asNumber(rule.maxSumInsured)
                            ? `ETB ${asNumber(rule.maxSumInsured)?.toLocaleString()}`
                            : 'Unlimited'}{' '}
                          | Risk Score: {asNumber(rule.minRiskScore) ?? 0} - {asNumber(rule.maxRiskScore) ?? 100}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={deleteRuleMutation.isPending}
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700">Approval Levels:</p>
                      <div className="flex flex-wrap gap-2">
                        {(rule.approvalLevels ?? []).map((levelId, index) => {
                          const level = roleLevels.find((item) => item.id === levelId);
                          return (
                            <div key={`${rule.id}-${levelId}`} className="flex items-center gap-1">
                              <Badge variant="outline" className="bg-blue-50">
                                {index + 1}. {level ? level.levelName : levelId}
                              </Badge>
                              {index < (rule.approvalLevels ?? []).length - 1 && (
                                <span className="text-gray-400">→</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
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

        {/* ================================================================ */}
        {/* ROLE LEVELS TAB */}
        {/* ================================================================ */}
        <TabsContent value="levels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Levels</CardTitle>
              <CardDescription>
                Manage approval role levels, permissions, and amount limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roleLevels.length > 0 ? (
                  [...roleLevels]
                    .sort((a, b) => a.levelOrder - b.levelOrder)
                    .map((level) => (
                      <div
                        key={level.id}
                        className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-lg">{level.levelName}</span>
                            <Badge variant="outline">{level.levelCode}</Badge>
                            <Badge className="bg-blue-100 text-blue-800">{level.department}</Badge>
                            {level.canApprove && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Can Approve
                              </Badge>
                            )}
                            {level.canReject && (
                              <Badge className="bg-red-100 text-red-800">
                                <X className="mr-1 h-3 w-3" />
                                Can Reject
                              </Badge>
                            )}
                            {!level.isActive && (
                              <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-600">
                            Level Order: {level.levelOrder}
                            {asNumber(level.maxAmountLimit)
                              ? ` | Max Amount: ETB ${asNumber(level.maxAmountLimit)?.toLocaleString()}`
                              : ' | No Amount Limit'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <Button variant="ghost" size="sm" onClick={() => handleEditRoleLevel(level)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteRoleLevel(level.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <Users className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                    <p>No role levels configured</p>
                    <Button onClick={handleCreateRoleLevel} className="mt-4">
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Role Level
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================ */}
      {/* RULE FORM MODAL */}
      {/* ================================================================ */}
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
                  <Input
                    value={ruleForm.ruleName}
                    onChange={(event) => setRuleForm({ ...ruleForm, ruleName: event.target.value })}
                    placeholder="e.g., High Value Auto Policies"
                  />
                </div>
                <div>
                  <Label>Product Type</Label>
                  <Select
                    value={ruleForm.productType}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, productType: value })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Products</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.code}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Min Sum Insured (ETB)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={ruleForm.minSumInsured}
                    onChange={(event) => setRuleForm({ ...ruleForm, minSumInsured: event.target.value })}
                    placeholder="Leave empty for no minimum"
                  />
                </div>
                <div>
                  <Label>Max Sum Insured (ETB)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={ruleForm.maxSumInsured}
                    onChange={(event) => setRuleForm({ ...ruleForm, maxSumInsured: event.target.value })}
                    placeholder="Leave empty for no maximum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>Min Risk Score (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ruleForm.minRiskScore}
                    onChange={(event) => setRuleForm({ ...ruleForm, minRiskScore: event.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Max Risk Score (0-100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={ruleForm.maxRiskScore}
                    onChange={(event) => setRuleForm({ ...ruleForm, maxRiskScore: event.target.value })}
                    placeholder="100"
                  />
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
                          <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => moveLevel(index, -1)}>
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={index === ruleForm.approvalLevels.length - 1}
                            onClick={() => moveLevel(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => removeApprovalLevel(levelId)}>
                            <X className="h-4 w-4" />
                          </Button>
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
                        .map((level) => (
                          <SelectItem key={level.id} value={level.id}>
                            {level.levelName} ({level.levelCode})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={ruleForm.isActive}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, isActive: checked })}
                />
                <Label>Active</Label>
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 border-t p-6">
              <Button variant="outline" onClick={() => setShowRuleForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveRule} disabled={saveRuleMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveRuleMutation.isPending ? 'Saving...' : 'Save Rule'}
              </Button>
            </div>
          </Card>
        </div>
      )}

{/* ================================================================ */}
{/* ROLE LEVEL FORM MODAL – with dropdown Level Code */}
{/* ================================================================ */}
{showRoleLevelForm && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
      <CardHeader>
        <CardTitle>
          {editingRoleLevel ? 'Edit Role Level' : 'Add Role Level'}
        </CardTitle>
        <CardDescription>
          Define the approval role, its permissions, and amount limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* ===== LEVEL CODE – Dropdown instead of text input ===== */}
          <div>
            <Label>Level Code <span className="text-red-500">*</span></Label>
            {editingRoleLevel ? (
              <Input
                value={roleLevelForm.levelCode}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            ) : (
              <Select
                value={roleLevelForm.levelCode}
                onValueChange={(value) =>
                  setRoleLevelForm({ ...roleLevelForm, levelCode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role code..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {/* Customer */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase">
                    Customer
                  </div>
                  <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                  <SelectItem value="CUSTOMER_ADMIN">CUSTOMER_ADMIN</SelectItem>
                  <SelectItem value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</SelectItem>
                  <SelectItem value="CUSTOMER_RELATION_OFFICER">
                    CUSTOMER_RELATION_OFFICER
                  </SelectItem>

                  {/* Underwriting */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase border-t mt-1 pt-1">
                    Underwriting
                  </div>
                  <SelectItem value="UNDERWRITING_OFFICER_I">
                    UNDERWRITING_OFFICER_I
                  </SelectItem>
                  <SelectItem value="UNDERWRITING_OFFICER_II">
                    UNDERWRITING_OFFICER_II
                  </SelectItem>
                  <SelectItem value="SENIOR_UNDERWRITING_OFFICER">
                    SENIOR_UNDERWRITING_OFFICER
                  </SelectItem>
                  <SelectItem value="SUPERVISOR_UNDERWRITING">
                    SUPERVISOR_UNDERWRITING
                  </SelectItem>
                  <SelectItem value="MANAGER_UNDERWRITING">
                    MANAGER_UNDERWRITING
                  </SelectItem>
                  <SelectItem value="HEAD_UNDERWRITING">
                    HEAD_UNDERWRITING
                  </SelectItem>
                  <SelectItem value="UNDERWRITING_ADMIN">
                    UNDERWRITING_ADMIN
                  </SelectItem>

                  {/* Claims */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase border-t mt-1 pt-1">
                    Claims
                  </div>
                  <SelectItem value="CLAIM_OFFICER_I">CLAIM_OFFICER_I</SelectItem>
                  <SelectItem value="CLAIM_OFFICER_II">CLAIM_OFFICER_II</SelectItem>
                  <SelectItem value="SENIOR_CLAIM_OFFICER">
                    SENIOR_CLAIM_OFFICER
                  </SelectItem>
                  <SelectItem value="SUPERVISOR_CLAIMS">SUPERVISOR_CLAIMS</SelectItem>
                  <SelectItem value="MANAGER_CLAIMS">MANAGER_CLAIMS</SelectItem>
                  <SelectItem value="HEAD_CLAIMS">HEAD_CLAIMS</SelectItem>
                  <SelectItem value="CLAIMS_ADMIN">CLAIMS_ADMIN</SelectItem>

                  {/* Admin / Executives */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-gray-400 uppercase border-t mt-1 pt-1">
                    Admin / Executives
                  </div>
                  <SelectItem value="MASTER_ADMIN">MASTER_ADMIN</SelectItem>
                  <SelectItem value="SYSTEM_ADMIN">SYSTEM_ADMIN</SelectItem>
                  <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="COO">COO</SelectItem>
                  <SelectItem value="CFO">CFO</SelectItem>
                  <SelectItem value="CTO">CTO</SelectItem>
                  <SelectItem value="CCO">CCO</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Level Name */}
          <div>
            <Label>Level Name <span className="text-red-500">*</span></Label>
            <Input
              value={roleLevelForm.levelName}
              onChange={(e) =>
                setRoleLevelForm({ ...roleLevelForm, levelName: e.target.value })
              }
              placeholder="e.g., Claim Officer I"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Department</Label>
            <Select
              value={roleLevelForm.department}
              onValueChange={(value) =>
                setRoleLevelForm({ ...roleLevelForm, department: value })
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CLAIMS">CLAIMS</SelectItem>
                <SelectItem value="UNDERWRITING">UNDERWRITING</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                <SelectItem value="FINANCE">FINANCE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Level Order</Label>
            <Input
              type="number"
              min="1"
              value={roleLevelForm.levelOrder}
              onChange={(e) =>
                setRoleLevelForm({
                  ...roleLevelForm,
                  levelOrder: parseInt(e.target.value) || 1,
                })
              }
            />
          </div>
        </div>

        <div>
          <Label>Max Amount Limit (ETB)</Label>
          <Input
            type="number"
            min="0"
            value={roleLevelForm.maxAmountLimit}
            onChange={(e) =>
              setRoleLevelForm({ ...roleLevelForm, maxAmountLimit: e.target.value })
            }
            placeholder="Leave empty for no limit"
          />
        </div>

        <div className="space-y-3 border rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700">Permissions</p>
          <div className="flex items-center justify-between">
            <Label>Can Approve</Label>
            <Switch
              checked={roleLevelForm.canApprove}
              onCheckedChange={(checked) =>
                setRoleLevelForm({ ...roleLevelForm, canApprove: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Can Reject</Label>
            <Switch
              checked={roleLevelForm.canReject}
              onCheckedChange={(checked) =>
                setRoleLevelForm({ ...roleLevelForm, canReject: checked })
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Active</Label>
            <Switch
              checked={roleLevelForm.isActive}
              onCheckedChange={(checked) =>
                setRoleLevelForm({ ...roleLevelForm, isActive: checked })
              }
            />
          </div>
        </div>
      </CardContent>
      <div className="flex justify-end gap-2 border-t p-6">
        <Button
          variant="outline"
          onClick={() => {
            setShowRoleLevelForm(false);
            setEditingRoleLevel(null);
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveRoleLevel} disabled={saveRoleLevelMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveRoleLevelMutation.isPending
            ? 'Saving...'
            : editingRoleLevel
              ? 'Update Role Level'
              : 'Add Role Level'}
        </Button>
      </div>
    </Card>
  </div>
)}
    </div>
  );
}