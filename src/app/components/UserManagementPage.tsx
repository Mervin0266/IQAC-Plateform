import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { Search, UserPlus, Edit2, Trash2, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayName } from '../config/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'authority' | 'hod' | 'coordinator' | 'faculty';
  department: string | null;
  employeeId: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt?: string;
}

export function UserManagementPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { user, logout } = useAuth();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'authority' | 'hod' | 'coordinator' | 'faculty'>('faculty');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const DEPARTMENTS = [
    'Computer Science and Engineering',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical and Automobile Engineering',
    'Civil Engineering',
    'Science and Humanities (Engg.)',
    'School of Architecture',
    'Artificial Intelligence and Data Science'
  ];

  const fetchUsers = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/users', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.status === 401) {
        logout();
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.message || 'Failed to load users.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to backend failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const handleOpenCreate = () => {
    setFormMode('create');
    setSelectedUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('faculty');
    setDepartment('');
    setEmployeeId('');
    setPhone('');
    setIsActive(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (targetUser: User) => {
    setFormMode('edit');
    setSelectedUser(targetUser);
    setName(targetUser.name);
    setEmail(targetUser.email);
    setPassword(''); // blank password unless resetting
    setRole(targetUser.role);
    setDepartment(targetUser.department || '');
    setEmployeeId(targetUser.employeeId || '');
    setPhone(targetUser.phone || '');
    setIsActive(targetUser.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !role || !employeeId.trim()) {
      setFormError('Please fill in all required fields (Name, Email, Role, Employee ID).');
      return;
    }
    if (formMode === 'create' && !password.trim()) {
      setFormError('Password is required when creating a new user.');
      return;
    }

    setFormLoading(true);
    setFormError('');

    try {
      const url = formMode === 'create'
        ? 'http://localhost:5000/api/users'
        : `http://localhost:5000/api/users/${selectedUser?.id}`;
      
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const payload: any = {
        name,
        email,
        role,
        department: ['admin', 'authority'].includes(role) ? null : department || null,
        employeeId,
        phone: phone || null,
        isActive
      };

      if (password) {
        payload.password = password;
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        setIsFormOpen(false);
        fetchUsers();
      } else {
        setFormError(data.message || 'Action failed.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Server request failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete user ${name}? This action cannot be undone.`)) {
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error(err);
      alert('Delete operation failed.');
    }
  };

  // Local filtering logic
  const filteredUsers = users.filter((u) => {
    // Search query matches name, email, or employee id
    const matchSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));

    // Role filter
    const matchRole = roleFilter === 'all' || u.role === roleFilter;

    // Department filter
    const matchDept = deptFilter === 'all' || u.department === deptFilter;

    // Status filter
    const matchStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && u.isActive) || 
      (statusFilter === 'inactive' && !u.isActive);

    return matchSearch && matchRole && matchDept && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage="user-management" onNavigate={onNavigate} />
      <main className="ml-64 p-8">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#0f1746] tracking-tight">USER MANAGEMENT</h1>
              <p className="text-sm text-gray-500 mt-1">Manage platform accounts, departments, and login access.</p>
            </div>
            <Button 
              onClick={handleOpenCreate}
              className="bg-blue-900 text-white hover:bg-blue-800 text-xs font-semibold flex items-center space-x-2 px-4 py-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New User</span>
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-xs font-semibold border border-red-200 mb-6 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Filters Bar */}
          <Card className="mb-6 shadow-sm border-gray-200">
            <CardContent className="p-4 flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[240px] space-y-1.5">
                <Label htmlFor="search" className="text-xs font-medium text-gray-600">Search User</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input 
                    id="search"
                    placeholder="Search by name, email, employee ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>

              <div className="w-[160px] space-y-1.5">
                <Label htmlFor="role-filter" className="text-xs font-medium text-gray-600">Role</Label>
                <select
                  id="role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="authority">Institutional Authority</option>
                  <option value="hod">HOD</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              <div className="w-[200px] space-y-1.5">
                <Label htmlFor="dept-filter" className="text-xs font-medium text-gray-600">Department</Label>
                <select
                  id="dept-filter"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="all">All Departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="w-[140px] space-y-1.5">
                <Label htmlFor="status-filter" className="text-xs font-medium text-gray-600">Status</Label>
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* User List Table */}
          <Card className="shadow-sm border-gray-200 overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12 text-sm text-gray-500 font-medium">Loading user accounts...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 font-medium">No users found matching filters.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 uppercase font-semibold">
                        <th className="py-3.5 px-4">Employee ID</th>
                        <th className="py-3.5 px-4">Name</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Department</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 text-gray-700">
                      {filteredUsers.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="py-3.5 px-4 font-semibold text-gray-900">{item.employeeId || 'N/A'}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-800">{item.name}</td>
                          <td className="py-3.5 px-4 font-medium text-gray-500">{item.email}</td>
                          <td className="py-3.5 px-4">
                            <Badge className={`uppercase text-[9px] font-semibold px-2 py-0.5 tracking-wider ${
                              item.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' :
                              item.role === 'authority' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              item.role === 'hod' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              item.role === 'coordinator' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              'bg-green-50 text-green-700 border-green-200'
                            }`} variant="outline">
                              {getRoleDisplayName(item.role)}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 truncate max-w-[200px]" title={item.department || ''}>
                            {item.department || <span className="text-gray-400 font-medium">None (Global)</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.isActive ? (
                              <span className="flex items-center text-green-700 font-semibold gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="flex items-center text-gray-400 font-medium gap-1">
                                <XCircle className="w-3.5 h-3.5 text-gray-300" />
                                <span>Inactive</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex space-x-1.5 justify-end">
                              <button 
                                onClick={() => handleOpenEdit(item)}
                                className="p-1 hover:bg-gray-150 rounded transition-colors text-blue-900 cursor-pointer"
                                title="Edit User"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {item.id !== user?.id && (
                                <button 
                                  onClick={() => handleDelete(item.id, item.name)}
                                  className="p-1 hover:bg-gray-150 rounded transition-colors text-red-600 cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
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
      </main>

      {/* Add / Edit Dialog Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[540px] bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {formMode === 'create' ? 'Add New User Account' : 'Edit User Profile'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-3">
            {formError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-xs font-semibold border border-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-700">Name *</Label>
                <Input 
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Jane Doe"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="employeeId" className="text-xs font-semibold text-gray-700">Employee ID *</Label>
                <Input 
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="e.g. FAC002"
                  className="text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">Email Address *</Label>
                <Input 
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. jane.doe@christuniversity.in"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-semibold text-gray-700">Phone Number</Label>
                <Input 
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 9988776655"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                Password {formMode === 'edit' && '(Leave blank to keep unchanged)'} *
              </Label>
              <Input 
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="text-xs"
                required={formMode === 'create'}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="role" className="text-xs font-semibold text-gray-700">User Role *</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white outline-none focus:ring-1 focus:ring-blue-900"
                >
                  <option value="admin">Admin</option>
                  <option value="authority">Institutional Authority</option>
                  <option value="hod">HOD</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              {!['admin', 'authority'].includes(role) && (
                <div className="space-y-1">
                  <Label htmlFor="department" className="text-xs font-semibold text-gray-700">Department *</Label>
                  <select
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md p-2 bg-white outline-none focus:ring-1 focus:ring-blue-900"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input 
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-900 focus:ring-blue-900"
              />
              <Label htmlFor="isActive" className="text-xs font-semibold text-gray-700 cursor-pointer">
                Account Status is Active
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100 flex space-x-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="text-xs"
                disabled={formLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold"
                disabled={formLoading}
              >
                {formLoading ? 'Saving...' : formMode === 'create' ? 'Create User' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
