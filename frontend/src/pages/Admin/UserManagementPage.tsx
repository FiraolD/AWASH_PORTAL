import * as React from 'react';
import { Search, Ban, CheckCircle, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone: string;
  lastLoginAt: string;
  createdAt: string;
}

const roleOptions = [
  { value: UserRole.CUSTOMER, label: 'Customer' },
  { value: UserRole.CUSTOMER_ADMIN, label: 'Customer Admin' },
  { value: UserRole.CUSTOMER_RELATION_OFFICER, label: 'Customer Relation Officer' },
  { value: UserRole.CLAIMS_ADMIN, label: 'Claims Admin' },
  { value: UserRole.CLAIM_OFFICER, label: 'Claim Officer' },
  { value: UserRole.CLAIM_OFFICER_I, label: 'Claim Officer I' },
  { value: UserRole.CLAIM_OFFICER_II, label: 'Claim Officer II' },
  { value: UserRole.SENIOR_CLAIM_OFFICER, label: 'Senior Claim Officer' },
  { value: UserRole.SUPERVISOR_CLAIMS, label: 'Supervisor Claims' },
  { value: UserRole.MANAGER_CLAIMS, label: 'Manager Claims' },
  { value: UserRole.HEAD_CLAIMS, label: 'Head Claims' },
  { value: UserRole.UNDERWRITING_ADMIN, label: 'Underwriting Admin' },
  { value: UserRole.UNDERWRITING_OFFICER, label: 'Underwriting Officer' },
  { value: UserRole.UNDERWRITING_OFFICER_I, label: 'Underwriting Officer I' },
  { value: UserRole.UNDERWRITING_OFFICER_II, label: 'Underwriting Officer II' },
  { value: UserRole.SENIOR_UNDERWRITING_OFFICER, label: 'Senior Underwriting Officer' },
  { value: UserRole.SUPERVISOR_UNDERWRITING, label: 'Supervisor Underwriting' },
  { value: UserRole.MANAGER_UNDERWRITING, label: 'Manager Underwriting' },
  { value: UserRole.HEAD_UNDERWRITING, label: 'Head Underwriting' },
  { value: UserRole.CEO, label: 'CEO' },
  { value: UserRole.COO, label: 'COO' },
  { value: UserRole.CFO, label: 'CFO' },
  { value: UserRole.MASTER_ADMIN, label: 'Master Admin' },
  { value: UserRole.SYSTEM_ADMIN, label: 'System Admin' }
];

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone: string;
  }>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: UserRole.CUSTOMER,
    phone: ''
  });
  const [creating, setCreating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserData, setEditUserData] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    phone: string;
  }>({
    email: '',
    firstName: '',
    lastName: '',
    role: UserRole.CUSTOMER,
    phone: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchUsers();
  }, []);

useEffect(() => {
  console.log('Token from store:', token);
  if (token) {
    fetchUsers();
  } else {
    console.error('No token found, user not authenticated');
    toast.error('Authentication required. Please login again.');
  }
}, [token]);
const fetchUsers = async () => {
  try {
    setLoading(true);
    console.log('Fetching users...');
    
    // Get token directly from localStorage
    const stored = localStorage.getItem('awash-auth-storage');
    let authToken = null;
    
    if (stored) {
      const parsed = JSON.parse(stored);
      authToken = parsed.state?.token;
      console.log('Retrieved token from localStorage:', authToken ? 'Yes' : 'No');
    }
    
    if (!authToken) {
      console.error('No authentication token found');
      toast.error('Please login again');
      window.location.href = '/login';
      return;
    }
    
    const response = await axios.get(`${API_URL}/users`, {
      headers: { 
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Users fetched:', response.data);
    setUsers(response.data);
  } catch (error: unknown) {
    console.error('Failed to fetch users:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      toast.error('Session expired. Please login again.');
      // Clear localStorage and redirect to login
      localStorage.removeItem('awash-auth-storage');
      window.location.href = '/login';
    } else {
      toast.error('Failed to load users');
    }
  } finally {
    setLoading(false);
  }
};
const getAuthToken = () => {
  const stored = localStorage.getItem('awash-auth-storage');
  if (stored) {
    const parsed = JSON.parse(stored);
    return parsed.state?.token;
  }
  return null;
};

const updateUserRole = async (userId: string, newRole: string) => {
  const token = getAuthToken();
  if (!token) {
    toast.error('Please login again');
    return;
  }
  
  try {
    const response = await axios.patch(`${API_URL}/users/${userId}/role`, 
      { role: newRole },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    toast.success(response.data?.message || `User role updated to ${newRole}`);
    fetchUsers();
  } catch (error) {
    console.error('Failed to update role:', error);
    toast.error('Failed to update user role');
  }
};

const updateUserStatus = async (userId: string, currentStatus: string) => {
  const token = getAuthToken();
  if (!token) {
    toast.error('Please login again');
    return;
  }
  
  const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  try {
    await axios.patch(`${API_URL}/users/${userId}/status`,
      { status: newStatus },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    toast.success(`User ${newStatus.toLowerCase()}`);
    fetchUsers();
  } catch (error) {
    console.error('Failed to update status:', error);
    toast.error('Failed to update user status');
  }
};

const openEditDialog = (user: User) => {
  setEditingUser(user);
  setEditUserData({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as UserRole,
    phone: user.phone || ''
  });
  setIsEditDialogOpen(true);
};

const saveUserEdit = async () => {
  if (!editingUser) return;
  if (!editUserData.email || !editUserData.firstName || !editUserData.lastName) {
    toast.error('Please fill in all required fields');
    return;
  }

  const token = getAuthToken();
  if (!token) {
    toast.error('Please login again');
    return;
  }

  setSavingEdit(true);
  try {
    const response = await axios.put(`${API_URL}/users/${editingUser.id}`, editUserData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    toast.success(response.data?.message || 'User updated successfully');
    setIsEditDialogOpen(false);
    setEditingUser(null);
    fetchUsers();
  } catch (error: unknown) {
    console.error('Failed to save user edit:', error);
    if (axios.isAxiosError(error)) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to update user');
    } else {
      toast.error('Failed to update user');
    }
  } finally {
    setSavingEdit(false);
  }
};

const deleteUser = async (userId: string) => {
  if (!window.confirm('Delete this user? This action cannot be undone.')) {
    return;
  }

  const token = getAuthToken();
  if (!token) {
    toast.error('Please login again');
    return;
  }

  setDeletingUserId(userId);
  try {
    await axios.delete(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success('User deleted successfully');
    fetchUsers();
  } catch (error) {
    console.error('Failed to delete user:', error);
    toast.error('Failed to delete user');
  } finally {
    setDeletingUserId(null);
  }
};

const createUser = async () => {
  if (!newUser.email || !newUser.password || !newUser.firstName || !newUser.lastName) {
    toast.error('Please fill all required fields');
    return;
  }

  const token = getAuthToken();
  if (!token) {
    toast.error('Please login again');
    return;
  }

  setCreating(true);
  try {
    await axios.post(`${API_URL}/users`, newUser, {
      headers: { Authorization: `Bearer ${token}` }
    });
    toast.success('User created successfully');
    setIsAddDialogOpen(false);
    setNewUser({ email: '', password: '', firstName: '', lastName: '', role: UserRole.CUSTOMER, phone: '' });
    fetchUsers();
  } catch (error) {
    console.error('Failed to create user:', error);
    toast.error('Failed to create user');
  } finally {
    setCreating(false);
  }
};


  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'MASTER_ADMIN':
      case 'SYSTEM_ADMIN':
      case 'CEO':
      case 'COO':
      case 'CFO':
        return 'bg-purple-100 text-purple-800';
      case 'CUSTOMER_ADMIN':
      case 'CUSTOMER_RELATION_OFFICER':
        return 'bg-blue-100 text-blue-800';
    //case 'CLAIMS_ADMIN':
      case 'CLAIM_OFFICER':
      case 'CLAIM_OFFICER_I':
      case 'CLAIM_OFFICER_II':
      case 'SENIOR_CLAIM_OFFICER':
      case 'SUPERVISOR_CLAIMS':
      case 'MANAGER_CLAIMS':
      case 'HEAD_CLAIMS':
        return 'bg-red-100 text-red-800';
      case 'UNDERWRITING_ADMIN':
      case 'UNDERWRITING_OFFICER':
      case 'UNDERWRITING_OFFICER_I':
      case 'UNDERWRITING_OFFICER_II':
      case 'SENIOR_UNDERWRITING_OFFICER':
      case 'SUPERVISOR_UNDERWRITING':
      case 'MANAGER_UNDERWRITING':
      case 'HEAD_UNDERWRITING':
        return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1A3E6F] border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#1A3E6F]">User Management</h1>
          <p className="text-gray-500 mt-1">Manage system users and their roles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#1A3E6F]">
                <Plus className="mr-2 h-4 w-4" /> Add New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input 
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input 
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input 
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <Input 
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Enter password"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <select 
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={newUser.phone}
                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                    placeholder="+251 XXX XXX XXX"
                  />
                </div>
                <Button 
                  onClick={createUser} 
                  disabled={creating}
                  className="w-full bg-[#1A3E6F]"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>First Name *</Label>
                  <Input
                    value={editUserData.firstName}
                    onChange={(e) => setEditUserData({ ...editUserData, firstName: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input
                    value={editUserData.lastName}
                    onChange={(e) => setEditUserData({ ...editUserData, lastName: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role *</Label>
                  <select
                    className="w-full rounded-lg border border-gray-200 p-2"
                    value={editUserData.role}
                    onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as UserRole })}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editUserData.phone}
                    onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                    placeholder=" +251 XXX XXX XXX"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={saveUserEdit}
                    disabled={savingEdit}
                    className="w-full bg-[#1A3E6F]"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditDialogOpen(false);
                      setEditingUser(null);
                    }}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Users ({users.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search users..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No users found. Click "Add New User" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 font-semibold text-sm">Name</th>
                    <th className="pb-3 font-semibold text-sm">Email</th>
                    <th className="pb-3 font-semibold text-sm">Role</th>
                    <th className="pb-3 font-semibold text-sm">Status</th>
                    <th className="pb-3 font-semibold text-sm">Phone</th>
                    <th className="pb-3 font-semibold text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                      </td>
                      <td className="py-3 text-sm">{user.email}</td>
                      <td className="py-3">
                        <select 
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}
                        >
                          {roleOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <Badge className={user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-sm">{user.phone || '-'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateUserStatus(user.id, user.status)}
                          >
                            {user.status === 'ACTIVE' ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUser(user.id)}
                            disabled={deletingUserId === user.id}
                          >
                            Delete
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
    </div>
  );
}