import * as React from 'react';
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Save, 
  X,
  ChevronDown,
  ChevronRight,
  Users,
  FileText,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { useAuthStore } from '../../stores/authStore';
import { hasPermission } from '../../lib/utils/rolePermissions';
import { UserRole } from '../../types';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,  // Add this line
} from '../../components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface RoleLevel {
  id: string;
  department: string;
  level_name: string;
  level_code: string;
  level_order: number;
  can_approve: boolean;
  can_reject: boolean;
  max_amount_limit: number;
}

interface TransactionType {
  id: string;
  name: string;
  code: string;
  department: string;
  description: string;
  is_active: boolean;
}

interface WorkflowRule {
  id: string;
  rule_name: string;
  transaction_type_id: string;
  transaction_type_name: string;
  from_role_level_id: string;
  from_role_level_name: string;
  to_role_level_id: string;
  to_role_level_name: string;
  condition_type: string;
  condition_operator: string;
  condition_value: string;
  requires_approval: boolean;
  approval_flow: string[];
  is_active: boolean;
}

interface UserRoleAssignment {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role_level_id: string;
  role_level_name: string;
  department: string;
  is_active: boolean;
}

export default function WorkflowConfigPage() {
  const [activeTab, setActiveTab] = React.useState('role-levels');
  const [roleLevels, setRoleLevels] = React.useState<RoleLevel[]>([]);
  const [transactionTypes, setTransactionTypes] = React.useState<TransactionType[]>([]);
  const [workflowRules, setWorkflowRules] = React.useState<WorkflowRule[]>([]);
  const [userAssignments, setUserAssignments] = React.useState<UserRoleAssignment[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDepartment, setSelectedDepartment] = React.useState('UNDERWRITING');
  
  // Dialog states
  const [isRoleLevelDialogOpen, setIsRoleLevelDialogOpen] = React.useState(false);
  const [isWorkflowRuleDialogOpen, setIsWorkflowRuleDialogOpen] = React.useState(false);
  const [isUserAssignmentDialogOpen, setIsUserAssignmentDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any>(null);
  
  // Form states
  const [roleLevelForm, setRoleLevelForm] = React.useState({
    department: 'UNDERWRITING',
    level_name: '',
    level_code: '',
    level_order: 0,
    can_approve: false,
    can_reject: false,
    max_amount_limit: 0
  });
  
  const [workflowRuleForm, setWorkflowRuleForm] = React.useState({
    rule_name: '',
    transaction_type_id: '',
    from_role_level_id: '',
    to_role_level_id: '',
    condition_type: 'AMOUNT',
    condition_operator: 'GREATER_THAN',
    condition_value: '',
    requires_approval: true,
    approval_flow: [] as string[],
    is_active: true
  });
  
  const [userAssignmentForm, setUserAssignmentForm] = React.useState({
    user_id: '',
    role_level_id: '',
    department: 'UNDERWRITING'
  });

  const { token } = useAuthStore();

  React.useEffect(() => {
    fetchAllData();
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

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [roleLevelsRes, transactionTypesRes, workflowRulesRes, userAssignmentsRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/config/role-levels`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/config/transaction-types`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/config/workflow-rules`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/config/user-role-assignments`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/users`, { headers: getAuthHeaders() })
      ]);
      setRoleLevels(roleLevelsRes.data);
      setTransactionTypes(transactionTypesRes.data);
      setWorkflowRules(workflowRulesRes.data);
      setUserAssignments(userAssignmentsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  // Role Level CRUD
  const createRoleLevel = async () => {
    try {
      await axios.post(`${API_URL}/config/role-levels`, roleLevelForm, { headers: getAuthHeaders() });
      toast.success('Role level created successfully');
      setIsRoleLevelDialogOpen(false);
      resetRoleLevelForm();
      fetchAllData();
    } catch (error) {
      console.error('Failed to create role level:', error);
      toast.error('Failed to create role level');
    }
  };

  const updateRoleLevel = async () => {
    if (!editingItem) return;
    try {
      await axios.put(`${API_URL}/config/role-levels/${editingItem.id}`, roleLevelForm, { headers: getAuthHeaders() });
      toast.success('Role level updated successfully');
      setIsRoleLevelDialogOpen(false);
      resetRoleLevelForm();
      fetchAllData();
    } catch (error) {
      console.error('Failed to update role level:', error);
      toast.error('Failed to update role level');
    }
  };

  const deleteRoleLevel = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role level?')) return;
    try {
      await axios.delete(`${API_URL}/config/role-levels/${id}`, { headers: getAuthHeaders() });
      toast.success('Role level deleted successfully');
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete role level:', error);
      toast.error('Failed to delete role level');
    }
  };

  // Workflow Rule CRUD
  const createWorkflowRule = async () => {
    try {
      await axios.post(`${API_URL}/config/workflow-rules`, workflowRuleForm, { headers: getAuthHeaders() });
      toast.success('Workflow rule created successfully');
      setIsWorkflowRuleDialogOpen(false);
      resetWorkflowRuleForm();
      fetchAllData();
    } catch (error) {
      console.error('Failed to create workflow rule:', error);
      toast.error('Failed to create workflow rule');
    }
  };

  const updateWorkflowRule = async () => {
    if (!editingItem) return;
    try {
      await axios.put(`${API_URL}/config/workflow-rules/${editingItem.id}`, workflowRuleForm, { headers: getAuthHeaders() });
      toast.success('Workflow rule updated successfully');
      setIsWorkflowRuleDialogOpen(false);
      resetWorkflowRuleForm();
      fetchAllData();
    } catch (error) {
      console.error('Failed to update workflow rule:', error);
      toast.error('Failed to update workflow rule');
    }
  };

  const deleteWorkflowRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow rule?')) return;
    try {
      await axios.delete(`${API_URL}/config/workflow-rules/${id}`, { headers: getAuthHeaders() });
      toast.success('Workflow rule deleted successfully');
      fetchAllData();
    } catch (error) {
      console.error('Failed to delete workflow rule:', error);
      toast.error('Failed to delete workflow rule');
    }
  };

  // User Assignment CRUD
  const assignUserToRole = async () => {
    try {
      await axios.post(`${API_URL}/config/user-role-assignments`, userAssignmentForm, { headers: getAuthHeaders() });
      toast.success('User assigned successfully');
      setIsUserAssignmentDialogOpen(false);
      resetUserAssignmentForm();
      fetchAllData();
    } catch (error) {
      console.error('Failed to assign user:', error);
      toast.error('Failed to assign user');
    }
  };

  const removeUserAssignment = async (id: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await axios.delete(`${API_URL}/config/user-role-assignments/${id}`, { headers: getAuthHeaders() });
      toast.success('Assignment removed successfully');
      fetchAllData();
    } catch (error) {
      console.error('Failed to remove assignment:', error);
      toast.error('Failed to remove assignment');
    }
  };

  const resetRoleLevelForm = () => {
    setEditingItem(null);
    setRoleLevelForm({
      department: selectedDepartment,
      level_name: '',
      level_code: '',
      level_order: 0,
      can_approve: false,
      can_reject: false,
      max_amount_limit: 0
    });
  };

  const resetWorkflowRuleForm = () => {
    setEditingItem(null);
    setWorkflowRuleForm({
      rule_name: '',
      transaction_type_id: '',
      from_role_level_id: '',
      to_role_level_id: '',
      condition_type: 'AMOUNT',
      condition_operator: 'GREATER_THAN',
      condition_value: '',
      requires_approval: true,
      approval_flow: [],
      is_active: true
    });
  };

  const resetUserAssignmentForm = () => {
    setEditingItem(null);
    setUserAssignmentForm({
      user_id: '',
      role_level_id: '',
      department: selectedDepartment
    });
  };

  const openEditRoleLevel = (item: RoleLevel) => {
    setEditingItem(item);
    setRoleLevelForm({
      department: item.department,
      level_name: item.level_name,
      level_code: item.level_code,
      level_order: item.level_order,
      can_approve: item.can_approve,
      can_reject: item.can_reject,
      max_amount_limit: item.max_amount_limit
    });
    setIsRoleLevelDialogOpen(true);
  };

  const openEditWorkflowRule = (item: WorkflowRule) => {
    setEditingItem(item);
    setWorkflowRuleForm({
      rule_name: item.rule_name,
      transaction_type_id: item.transaction_type_id,
      from_role_level_id: item.from_role_level_id,
      to_role_level_id: item.to_role_level_id,
      condition_type: item.condition_type,
      condition_operator: item.condition_operator,
      condition_value: item.condition_value,
      requires_approval: item.requires_approval,
      approval_flow: item.approval_flow,
      is_active: item.is_active
    });
    setIsWorkflowRuleDialogOpen(true);
  };

  const filteredRoleLevels = roleLevels.filter(r => r.department === selectedDepartment);
  const filteredTransactionTypes = transactionTypes.filter(t => t.department === selectedDepartment);
  const filteredWorkflowRules = workflowRules.filter(w => {
    const transaction = transactionTypes.find(t => t.id === w.transaction_type_id);
    return transaction?.department === selectedDepartment;
  });
  const filteredUserAssignments = userAssignments.filter(a => a.department === selectedDepartment);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">Workflow Configuration</h1>
          <p className="text-gray-500 mt-1">Configure role levels, approval workflows, and user assignments</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNDERWRITING">Underwriting</SelectItem>
              <SelectItem value="CLAIMS">Claims</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAllData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-gray-100 p-1 rounded-xl w-full justify-start">
          <TabsTrigger value="role-levels" className="rounded-lg">
            <Shield className="mr-2 h-4 w-4" /> Role Levels
          </TabsTrigger>
          <TabsTrigger value="workflow-rules" className="rounded-lg">
            <Settings className="mr-2 h-4 w-4" /> Workflow Rules
          </TabsTrigger>
          <TabsTrigger value="user-assignments" className="rounded-lg">
            <Users className="mr-2 h-4 w-4" /> User Assignments
          </TabsTrigger>
        </TabsList>

        {/* Role Levels Tab */}
        <TabsContent value="role-levels" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Role Levels - {selectedDepartment}</CardTitle>
                  <CardDescription>Define role hierarchy and approval权限</CardDescription>
                </div>
                <Dialog open={isRoleLevelDialogOpen} onOpenChange={setIsRoleLevelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#1A3E6F]" onClick={resetRoleLevelForm}>
                      <Plus className="mr-2 h-4 w-4" /> Add Role Level
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Edit Role Level' : 'Create Role Level'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Level Name *</Label>
                        <Input 
                          value={roleLevelForm.level_name}
                          onChange={(e) => setRoleLevelForm({...roleLevelForm, level_name: e.target.value})}
                          placeholder="e.g., Underwriting Officer I"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Level Code *</Label>
                        <Input 
                          value={roleLevelForm.level_code}
                          onChange={(e) => setRoleLevelForm({...roleLevelForm, level_code: e.target.value.toUpperCase()})}
                          placeholder="e.g., UW_OFFICER_I"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Level Order *</Label>
                        <Input 
                          type="number"
                          value={roleLevelForm.level_order}
                          onChange={(e) => setRoleLevelForm({...roleLevelForm, level_order: parseInt(e.target.value)})}
                          placeholder="1, 2, 3..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max Amount Limit (ETB)</Label>
                        <Input 
                          type="number"
                          value={roleLevelForm.max_amount_limit}
                          onChange={(e) => setRoleLevelForm({...roleLevelForm, max_amount_limit: parseFloat(e.target.value)})}
                          placeholder="0 for unlimited"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Can Approve</Label>
                        <Switch 
                          checked={roleLevelForm.can_approve}
                          onCheckedChange={(val) => setRoleLevelForm({...roleLevelForm, can_approve: val})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Can Reject</Label>
                        <Switch 
                          checked={roleLevelForm.can_reject}
                          onCheckedChange={(val) => setRoleLevelForm({...roleLevelForm, can_reject: val})}
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button onClick={editingItem ? updateRoleLevel : createRoleLevel} className="flex-1 bg-[#1A3E6F]">
                          {editingItem ? 'Update' : 'Create'}
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsRoleLevelDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredRoleLevels.sort((a, b) => a.level_order - b.level_order).map((level) => (
                  <div key={level.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#111827]">{level.level_name}</p>
                        <Badge variant="outline" className="text-xs">{level.level_code}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Order: {level.level_order} • Max Limit: ETB {level.max_amount_limit?.toLocaleString() || 'Unlimited'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {level.can_approve && <Badge className="bg-green-100 text-green-800 text-xs">Can Approve</Badge>}
                        {level.can_reject && <Badge className="bg-red-100 text-red-800 text-xs">Can Reject</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEditRoleLevel(level)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteRoleLevel(level.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
// Add this to the TabsList
<TabsTrigger value="approval-rules" className="rounded-lg">
  <Shield className="mr-2 h-4 w-4" /> Approval Rules
</TabsTrigger>

// Add this TabsContent
<TabsContent value="approval-rules" className="space-y-6">
  <Card>
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <CardTitle>Approval Rules Configuration</CardTitle>
          <CardDescription>Configure approval thresholds based on amount and risk score</CardDescription>
        </div>
        <Button className="bg-[#1A3E6F]" onClick={() => {/* Add rule dialog */}}>
          <Plus className="mr-2 h-4 w-4" /> Add Rule
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Approval Rules Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left text-sm">
                <th className="pb-3">Role Level</th>
                <th className="pb-3">Amount Range (ETB)</th>
                <th className="pb-3">Risk Score Range</th>
                <th className="pb-3">Can Approve</th>
                <th className="pb-3">Next Approver</th>
                <th className="pb-3">Actions</th>
               </tr>
            </thead>
            <tbody className="divide-y">
              {/* Map through approval rules */}
              <tr className="hover:bg-gray-50">
                <td className="py-3 font-medium">Officer</td>
                <td className="py-3">0 - 500,000</td>
                <td className="py-3">0 - 40</td>
                <td className="py-3"><Badge className="bg-green-100 text-green-800">Yes</Badge></td>
                <td className="py-3">Senior Officer</td>
                <td className="py-3">
                  <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
               </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 font-medium">Officer</td>
                <td className="py-3">500,001 - 1,000,000</td>
                <td className="py-3">41 - 70</td>
                <td className="py-3"><Badge className="bg-red-100 text-red-800">No</Badge></td>
                <td className="py-3">Manager</td>
                <td className="py-3">
                  <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
               </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 font-medium">Officer</td>
                <td className="py-3">1,000,001+</td>
                <td className="py-3">71 - 100</td>
                <td className="py-3"><Badge className="bg-red-100 text-red-800">No</Badge></td>
                <td className="py-3">Head</td>
                <td className="py-3">
                  <Button variant="ghost" size="sm"><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                </td>
               </tr>
            </tbody>
           </table>
        </div>
      </div>
    </CardContent>
  </Card>
</TabsContent>
        {/* Workflow Rules Tab */}
        <TabsContent value="workflow-rules" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Workflow Rules - {selectedDepartment}</CardTitle>
                  <CardDescription>Configure approval workflows for different transaction types</CardDescription>
                </div>
                <Dialog open={isWorkflowRuleDialogOpen} onOpenChange={setIsWorkflowRuleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#1A3E6F]" onClick={resetWorkflowRuleForm}>
                      <Plus className="mr-2 h-4 w-4" /> Add Rule
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingItem ? 'Edit Workflow Rule' : 'Create Workflow Rule'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-2">
                        <Label>Rule Name *</Label>
                        <Input 
                          value={workflowRuleForm.rule_name}
                          onChange={(e) => setWorkflowRuleForm({...workflowRuleForm, rule_name: e.target.value})}
                          placeholder="e.g., High Value Policy Approval"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Transaction Type *</Label>
                        <Select 
                          value={workflowRuleForm.transaction_type_id}
                          onValueChange={(val) => setWorkflowRuleForm({...workflowRuleForm, transaction_type_id: val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select transaction type" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredTransactionTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From Role Level *</Label>
                          <Select 
                            value={workflowRuleForm.from_role_level_id}
                            onValueChange={(val) => setWorkflowRuleForm({...workflowRuleForm, from_role_level_id: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredRoleLevels.map((role) => (
                                <SelectItem key={role.id} value={role.id}>{role.level_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>To Role Level *</Label>
                          <Select 
                            value={workflowRuleForm.to_role_level_id}
                            onValueChange={(val) => setWorkflowRuleForm({...workflowRuleForm, to_role_level_id: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No escalation (self)</SelectItem>
                              {filteredRoleLevels.map((role) => (
                                <SelectItem key={role.id} value={role.id}>{role.level_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Condition Type</Label>
                          <Select 
                            value={workflowRuleForm.condition_type}
                            onValueChange={(val) => setWorkflowRuleForm({...workflowRuleForm, condition_type: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="AMOUNT">Amount</SelectItem>
                              <SelectItem value="RISK_SCORE">Risk Score</SelectItem>
                              <SelectItem value="POLICY_TYPE">Policy Type</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Operator</Label>
                          <Select 
                            value={workflowRuleForm.condition_operator}
                            onValueChange={(val) => setWorkflowRuleForm({...workflowRuleForm, condition_operator: val})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GREATER_THAN">Greater Than</SelectItem>
                              <SelectItem value="LESS_THAN">Less Than</SelectItem>
                              <SelectItem value="EQUALS">Equals</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Value</Label>
                          <Input 
                            value={workflowRuleForm.condition_value}
                            onChange={(e) => setWorkflowRuleForm({...workflowRuleForm, condition_value: e.target.value})}
                            placeholder="e.g., 500100"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Requires Approval</Label>
                        <Switch 
                          checked={workflowRuleForm.requires_approval}
                          onCheckedChange={(val) => setWorkflowRuleForm({...workflowRuleForm, requires_approval: val})}
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button onClick={editingItem ? updateWorkflowRule : createWorkflowRule} className="flex-1 bg-[#1A3E6F]">
                          {editingItem ? 'Update' : 'Create'}
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsWorkflowRuleDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredWorkflowRules.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No workflow rules configured</p>
                    <p className="text-sm mt-1">Click "Add Rule" to create approval workflows</p>
                  </div>
                ) : (
                  filteredWorkflowRules.map((rule) => {
                    const transaction = transactionTypes.find(t => t.id === rule.transaction_type_id);
                    const fromRole = roleLevels.find(r => r.id === rule.from_role_level_id);
                    const toRole = roleLevels.find(r => r.id === rule.to_role_level_id);
                    return (
                      <div key={rule.id} className="p-4 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#111827]">{rule.rule_name}</p>
                              <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Transaction: {transaction?.name}
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              <span className="font-medium">Flow:</span> {fromRole?.level_name} → 
                              {rule.to_role_level_id ? ` ${toRole?.level_name}` : ' Self (No escalation)'}
                            </p>
                            {rule.condition_value && (
                              <p className="text-xs text-gray-400 mt-1">
                                Condition: {rule.condition_type} {rule.condition_operator} {rule.condition_value}
                              </p>
                            )}
                            {rule.requires_approval && (
                              <Badge className="mt-2 bg-yellow-100 text-yellow-800">Requires Approval</Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditWorkflowRule(rule)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteWorkflowRule(rule.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="user-assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>User Role Assignments - {selectedDepartment}</CardTitle>
                  <CardDescription>Assign role levels to users</CardDescription>
                </div>
                <Dialog open={isUserAssignmentDialogOpen} onOpenChange={setIsUserAssignmentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-[#1A3E6F]" onClick={resetUserAssignmentForm}>
                      <Plus className="mr-2 h-4 w-4" /> Assign User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Role to User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Select User *</Label>
                        <Select 
                          value={userAssignmentForm.user_id}
                          onValueChange={(val) => setUserAssignmentForm({...userAssignmentForm, user_id: val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose user" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter((u) => hasPermission(u.role as UserRole, [UserRole.UNDERWRITING_ADMIN, UserRole.CLAIMS_ADMIN])).map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Role Level *</Label>
                        <Select 
                          value={userAssignmentForm.role_level_id}
                          onValueChange={(val) => setUserAssignmentForm({...userAssignmentForm, role_level_id: val})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose role level" />
                          </SelectTrigger>
                          <SelectContent>
                            {filteredRoleLevels.map((role) => (
                              <SelectItem key={role.id} value={role.id}>{role.level_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button onClick={assignUserToRole} className="flex-1 bg-[#1A3E6F]">
                          Assign
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={() => setIsUserAssignmentDialogOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredUserAssignments.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No user assignments</p>
                    <p className="text-sm mt-1">Click "Assign User" to assign role levels to users</p>
                  </div>
                ) : (
                  filteredUserAssignments.map((assignment) => {
                    const user = users.find(u => u.id === assignment.user_id);
                    const roleLevel = roleLevels.find(r => r.id === assignment.role_level_id);
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100">
                        <div>
                          <p className="font-semibold text-[#111827]">{user?.firstName} {user?.lastName}</p>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Role: <span className="font-medium">{roleLevel?.level_name}</span>
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeUserAssignment(assignment.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Workflow Configuration Guide</p>
            <p className="text-xs text-blue-700 mt-1">
              • <strong>Role Levels:</strong> Define the hierarchy and权限 for each role in the department.<br />
              • <strong>Workflow Rules:</strong> Configure which transactions need approval and who should approve them.<br />
              • <strong>User Assignments:</strong> Assign role levels to actual users in the system.<br />
              • <strong>Approval Flow:</strong> Transactions will follow the configured workflow rules automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}