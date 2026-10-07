import * as React from 'react';
import { Shield, Users, Key, CheckCircle, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Switch } from '../../components/ui/Switch';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { useAuthStore } from '../../stores/authStore';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface Role {
  name: string;
  description: string;
  userCount: number;
  color: string;
  permissions: Permission[];
}

interface Permission {
  id: string;
  name: string;
  category: string;
  enabled: boolean;
}

export default function RoleAssignmentPage() {
  const [selectedRole, setSelectedRole] = useState<string>('MASTER_ADMIN');
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  const fetchRolesAndPermissions = async () => {
    try {
      setLoading(true);
      // Fetch roles with user counts
      const rolesResponse = await axios.get(`${API_URL}/users/roles/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRoles(rolesResponse.data);

      // Fetch permissions for selected role
      const permissionsResponse = await axios.get(`${API_URL}/users/roles/${selectedRole}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissions(permissionsResponse.data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      // Fallback data if API not ready
      setRoles([
        { name: 'MASTER_ADMIN', description: 'Full system access with all permissions', userCount: 1, color: 'bg-purple-100', permissions: [] },
        { name: 'CUSTOMER_ADMIN', description: 'Manage customers and support tickets', userCount: 2, color: 'bg-blue-100', permissions: [] },
        { name: 'CLAIMS_ADMIN', description: 'Process and manage insurance claims', userCount: 3, color: 'bg-red-100', permissions: [] },
        { name: 'UNDERWRITING_ADMIN', description: 'Review and underwrite policies', userCount: 2, color: 'bg-orange-100', permissions: [] },
        { name: 'CUSTOMER', description: 'Regular customer access', userCount: 150, color: 'bg-gray-100', permissions: [] },
      ]);
      
      // Fallback permissions
      setPermissions([
        { id: '1', name: 'View Users', category: 'User Management', enabled: true },
        { id: '2', name: 'Create Users', category: 'User Management', enabled: false },
        { id: '3', name: 'Edit Users', category: 'User Management', enabled: false },
        { id: '4', name: 'Delete Users', category: 'User Management', enabled: false },
        { id: '5', name: 'View Roles', category: 'Role Management', enabled: true },
        { id: '6', name: 'Edit Roles', category: 'Role Management', enabled: false },
        { id: '7', name: 'View Claims', category: 'Claims', enabled: true },
        { id: '8', name: 'Process Claims', category: 'Claims', enabled: false },
        { id: '9', name: 'View Policies', category: 'Policies', enabled: true },
        { id: '10', name: 'Edit Policies', category: 'Policies', enabled: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissionsForRole = async (roleName: string) => {
    try {
      const response = await axios.get(`${API_URL}/users/roles/${roleName}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissions(response.data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const handleRoleSelect = (roleName: string) => {
    setSelectedRole(roleName);
    fetchPermissionsForRole(roleName);
  };

  const togglePermission = (permissionId: string) => {
    setPermissions(prev => prev.map(p => 
      p.id === permissionId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/users/roles/${selectedRole}/permissions`,
        { permissions: permissions.filter(p => p.enabled).map(p => p.id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Permissions for ${selectedRole} saved successfully`);
    } catch (error) {
      console.error('Failed to save permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getRoleDescription = (roleName: string) => {
    const descriptions: Record<string, string> = {
      MASTER_ADMIN: 'Full system access. Can manage users, roles, settings, and all modules.',
      SYSTEM_ADMIN: 'System administration and configuration access.',
      UNDERWRITING_OFFICER: 'Entry-level underwriting tasks and policy reviews.',
      UNDERWRITING_OFFICER_I: 'Junior underwriting officer with basic approval authority.',
      UNDERWRITING_OFFICER_II: 'Senior underwriting officer with intermediate approval authority.',
      SENIOR_UNDERWRITING_OFFICER: 'Senior underwriting officer with significant approval authority.',
      SUPERVISOR_UNDERWRITING: 'Underwriting supervisor overseeing team operations.',
      MANAGER_UNDERWRITING: 'Underwriting manager with departmental oversight.',
      HEAD_UNDERWRITING: 'Head of underwriting department with full authority.',
      UNDERWRITING_ADMIN: 'Underwriting administration and system configuration.',
      CLAIM_OFFICER: 'Entry-level claims processing and assessment.',
      CLAIM_OFFICER_I: 'Junior claims officer with basic approval authority.',
      CLAIM_OFFICER_II: 'Senior claims officer with intermediate approval authority.',
      SENIOR_CLAIM_OFFICER: 'Senior claims officer with significant approval authority.',
      SUPERVISOR_CLAIMS: 'Claims supervisor overseeing team operations.',
      MANAGER_CLAIMS: 'Claims manager with departmental oversight.',
      HEAD_CLAIMS: 'Head of claims department with full authority.',
      CLAIMS_ADMIN: 'Claims administration and system configuration.',
      CUSTOMER_RELATION_OFFICER: 'Customer service officer handling inquiries and support.',
      CUSTOMER_ADMIN: 'Customer service administration and management.',
      CUSTOMER: 'Regular customer access to personal policies and claims.'
    };
    return descriptions[roleName] || 'Custom role with specific permissions';
  };

  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading roles and permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#1A3E6F]">Role Assignment</h1>
        <p className="text-gray-500 mt-1">Manage user roles and configure permissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>Select a role to manage permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {roles.map((role) => (
                <div
                  key={role.name}
                  onClick={() => handleRoleSelect(role.name)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedRole === role.name 
                      ? 'border-[#1A3E6F] bg-[#1A3E6F]/5' 
                      : 'border-transparent hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${role.color}`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#111827]">{role.name.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500">{role.userCount} users</p>
                      </div>
                    </div>
                    {selectedRole === role.name && (
                      <CheckCircle className="h-5 w-5 text-[#1A3E6F]" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Permissions */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedRole?.replace('_', ' ')}</CardTitle>
                  <CardDescription className="mt-1">
                    {getRoleDescription(selectedRole)}
                  </CardDescription>
                </div>
                <Button 
                  onClick={savePermissions} 
                  isLoading={saving}
                  className="bg-[#1A3E6F]"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="space-y-3">
                    <h3 className="font-semibold text-[#111827] border-b pb-2">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {perms.map((permission) => (
                        <div key={permission.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{permission.name}</span>
                          </div>
                          <Switch 
                            checked={permission.enabled}
                            onCheckedChange={() => togglePermission(permission.id)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {selectedRole === 'MASTER_ADMIN' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Master Admin Access</p>
                      <p className="text-xs text-blue-700">Master Admins have all permissions by default. Changes to Master Admin permissions affect system-wide access.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}