import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Badge } from './ui/badge';
import { 
  Search, 
  UserPlus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Users, 
  ShieldCheck, 
  Building2, 
  GraduationCap, 
  Table as TableIcon, 
  LayoutGrid, 
  BarChart3, 
  RotateCcw, 
  RefreshCw, 
  X, 
  Shield, 
  Mail, 
  Phone, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleDisplayName } from '../config/permissions';
import { useAcademicHierarchy } from '../hooks/useAcademicHierarchy';

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
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'analytics'>('table');
  
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

  // Clear Database State
  const [isClearDbOpen, setIsClearDbOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState('');

  const { departmentList: DEPARTMENTS } = useAcademicHierarchy();

  const fetchUsers = async () => {
    if (!user?.token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
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
    setPassword('');
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
    if (!user?.token) return;
    setFormLoading(true);
    setFormError('');

    try {
      if (formMode === 'create') {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            department: ['hod', 'coordinator', 'faculty'].includes(role) ? department : null,
            employeeId,
            phone,
            isActive
          })
        });
        const data = await response.json();
        if (data.success) {
          setIsFormOpen(false);
          fetchUsers();
        } else {
          setFormError(data.message || 'Failed to create user.');
        }
      } else if (formMode === 'edit' && selectedUser) {
        const payload: any = {
          name,
          email,
          role,
          department: ['hod', 'coordinator', 'faculty'].includes(role) ? department : null,
          employeeId,
          phone,
          isActive
        };
        if (password.trim().length > 0) {
          payload.password = password;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
          setIsFormOpen(false);
          fetchUsers();
        } else {
          setFormError(data.message || 'Failed to update user.');
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to execute request.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This cannot be undone.`)) return;
    if (!user?.token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`
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
      alert('Failed to delete user.');
    }
  };

  const handleClearDatabase = async () => {
    if (clearConfirmText !== 'DELETE ALL RECORDS') {
      alert('Confirmation text does not match.');
      return;
    }

    if (!user?.token) return;
    setIsClearing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/clear-database`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmation: 'DELETE ALL RECORDS' })
      });
      const data = await res.json();
      if (data.success) {
        setClearSuccessMsg('Database wiped successfully. Seed users remain.');
        setIsClearDbOpen(false);
        setClearConfirmText('');
        fetchUsers();
      } else {
        alert(data.message || 'Failed to clear database.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to execute clear database request.');
    } finally {
      setIsClearing(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesDept = deptFilter === 'all' || (u.department && u.department === deptFilter);
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && u.isActive) || 
        (statusFilter === 'inactive' && !u.isActive);

      return matchesSearch && matchesRole && matchesDept && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, deptFilter, statusFilter]);

  // Executive KPI Stats
  const stats = useMemo(() => {
    const total = filteredUsers.length;
    const admins = filteredUsers.filter(u => u.role === 'admin' || u.role === 'authority').length;
    const hods = filteredUsers.filter(u => u.role === 'hod' || u.role === 'coordinator').length;
    const faculty = filteredUsers.filter(u => u.role === 'faculty').length;
    const active = filteredUsers.filter(u => u.isActive).length;

    return {
      total,
      admins,
      hods,
      faculty,
      active,
      activePercent: total > 0 ? ((active / total) * 100).toFixed(0) : '0'
    };
  }, [filteredUsers]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredUsers.forEach(u => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [filteredUsers]);

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setDeptFilter('all');
    setStatusFilter('all');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentPage="user-management" onNavigate={onNavigate} />

      <main className="ml-64 flex-1 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2f4692]/20 ring-4 ring-[#2f4692]/10">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  User Accounts & Governance
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institutional user directory, role assignments, department scopes, and system access controls
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                onClick={fetchUsers}
                variant="outline"
                className="border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                title="Refresh Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync Accounts</span>
              </Button>

              {user?.role === 'admin' && (
                <Button
                  onClick={() => setIsClearDbOpen(true)}
                  variant="outline"
                  className="border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Purge DB</span>
                </Button>
              )}

              <Button
                onClick={handleOpenCreate}
                className="bg-gradient-to-r from-[#2f4692] to-[#1e2f65] hover:from-[#243a7a] hover:to-[#172450] text-white text-xs font-bold h-9 rounded-xl shadow-md shadow-[#2f4692]/20 flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add User Account</span>
              </Button>
            </div>
          </div>

          {clearSuccessMsg && (
            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl text-xs font-semibold border border-emerald-200 flex items-center gap-2.5 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{clearSuccessMsg}</span>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-xs font-semibold border border-rose-200 flex items-center gap-2.5 shadow-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 5 Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Card 1: Total Users */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#2f4692] to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Accounts</p>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2f4692] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.total}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Registered profiles
              </p>
            </div>

            {/* Card 2: Admins & Authority */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admins & Authorities</p>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-rose-700 tracking-tight mt-2">{stats.admins}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Full governance access
              </p>
            </div>

            {/* Card 3: Department Leadership */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">HODs & Coordinators</p>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.hods}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Department supervisors
              </p>
            </div>

            {/* Card 4: Faculty Users */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Users</p>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.faculty}</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Academic contributors
              </p>
            </div>

            {/* Card 5: Active Rate */}
            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-500" />
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Rate</p>
                <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-black text-slate-900 tracking-tight mt-2">{stats.activePercent}%</p>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                <span className="text-emerald-600 font-bold">{stats.active}</span> active accounts
              </p>
            </div>
          </div>

          {/* Unified Filter Bar & View Switcher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search user name, email, employee ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 text-xs h-9 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')} 
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="authority">Institutional Authority</option>
                <option value="hod">HOD</option>
                <option value="coordinator">Coordinator</option>
                <option value="faculty">Faculty</option>
              </select>

              {/* Dept Filter */}
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2f4692]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="inactive">Inactive Accounts</option>
              </select>

              {(searchQuery || roleFilter !== 'all' || deptFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 px-2.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </Button>
              )}
            </div>

            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Matrix</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Accounts</span>
              </button>

              <button
                onClick={() => setViewMode('analytics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'analytics'
                    ? 'bg-white text-[#2f4692] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>RBAC Breakdown</span>
              </button>
            </div>
          </div>

          {/* View Mode 1: Table Matrix */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Displaying Users:</span>
                  <span className="text-xs font-black text-[#2f4692] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {filteredUsers.length} of {users.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">Manage user credentials and departmental permissions</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3.5 px-4">User Account</th>
                      <th className="py-3.5 px-4">Emp ID</th>
                      <th className="py-3.5 px-4">Assigned Role</th>
                      <th className="py-3.5 px-4">Department Scope</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[#2f4692]" />
                          <p className="font-semibold text-sm">Loading user accounts...</p>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-sm">No accounts found</p>
                          <p className="text-xs mt-0.5">Try clearing filter parameters</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((item) => {
                        const initials = item.name
                          .split(' ')
                          .filter(Boolean)
                          .map(w => w[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase() || 'US';

                        return (
                          <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center text-xs font-black shadow-sm">
                                  {initials}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 group-hover:text-[#2f4692] transition-colors">
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-slate-400 font-mono">{item.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700 text-xs">
                              {item.employeeId || '—'}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                item.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                                item.role === 'authority' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                                item.role === 'hod' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                item.role === 'coordinator' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {getRoleDisplayName(item.role)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              {item.department ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/60 max-w-[220px] truncate">
                                  <Building2 className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span className="truncate">{item.department}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Global Scope</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {item.isActive ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200/60">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Active</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200/60">
                                  <XCircle className="w-3 h-3 text-slate-400" />
                                  <span>Inactive</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  onClick={() => handleOpenEdit(item)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                {item.id !== user?.id && (
                                  <Button
                                    onClick={() => handleDelete(item.id, item.name)}
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* View Mode 2: Card Grid */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-slate-200">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="font-bold text-slate-700">No user accounts found matching filters</p>
                </div>
              ) : (
                filteredUsers.map((item) => {
                  const initials = item.name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'US';

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#2f4692] to-[#1e2f65] text-white flex items-center justify-center text-sm font-black shadow-md shadow-blue-200">
                              {initials}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#2f4692] transition-colors leading-snug">
                                {item.name}
                              </h3>
                              <p className="text-[11px] font-mono text-slate-400 font-semibold">
                                {item.employeeId || 'ID: UNASSIGNED'}
                              </p>
                            </div>
                          </div>

                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-200' :
                            item.role === 'authority' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            item.role === 'hod' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            item.role === 'coordinator' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {getRoleDisplayName(item.role)}
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-mono">{item.email}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate font-semibold">{item.department || 'Global / Unrestricted'}</span>
                          </div>

                          {item.phone && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span>{item.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        {item.isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active Account
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Inactive
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleOpenEdit(item)}
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs font-bold text-amber-600 hover:bg-amber-50 rounded-lg px-2"
                          >
                            Edit
                          </Button>
                          {item.id !== user?.id && (
                            <Button
                              onClick={() => handleDelete(item.id, item.name)}
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg px-2"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* View Mode 3: Analytics & Distribution */}
          {viewMode === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Role Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">RBAC Role Distribution</h3>
                    <p className="text-xs text-slate-400">Platform account tier allocation</p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-[#2f4692]" />
                </div>

                <div className="space-y-3">
                  {Object.entries(roleCounts).map(([r, count]) => {
                    const pct = ((count / (stats.total || 1)) * 100).toFixed(0);
                    return (
                      <div key={r} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-700 uppercase tracking-wider">{getRoleDisplayName(r as any)}</span>
                          <span className="font-bold text-slate-900">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-[#2f4692] to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Security & Access Overview */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Governance & Security Posture</h3>
                    <p className="text-xs text-slate-400">Status breakdown and credentials health</p>
                  </div>
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Active Authentication Pool</p>
                      <p className="text-[11px] text-slate-500">Accounts verified and authenticated</p>
                    </div>
                    <span className="text-sm font-black text-[#2f4692]">{stats.active}</span>
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Department Scoped Roles</p>
                      <p className="text-[11px] text-slate-500">HODs and Academic Coordinators</p>
                    </div>
                    <span className="text-sm font-black text-amber-700">{stats.hods}</span>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">Faculty Submissions Access</p>
                      <p className="text-[11px] text-slate-500">Authorized to submit research/metrics</p>
                    </div>
                    <span className="text-sm font-black text-purple-700">{stats.faculty}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit User Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2f4692]" />
              {formMode === 'create' ? 'Create New User Account' : 'Edit User Profile'}
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-xl text-xs font-semibold border border-rose-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-2">
            <div>
              <Label className="text-xs font-bold text-slate-700">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. John Doe"
                required
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Email Address</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@christuniversity.in"
                required
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">
                {formMode === 'create' ? 'Password' : 'Password (leave blank to keep current)'}
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={formMode === 'create' ? 'Min 6 characters' : '••••••••'}
                required={formMode === 'create'}
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">System Role</Label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                >
                  <option value="admin">Admin</option>
                  <option value="authority">Institutional Authority</option>
                  <option value="hod">HOD</option>
                  <option value="coordinator">Coordinator</option>
                  <option value="faculty">Faculty</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Employee ID</Label>
                <Input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="CU-XXXX"
                  className="mt-1 rounded-xl text-xs"
                />
              </div>
            </div>

            {['hod', 'coordinator', 'faculty'].includes(role) && (
              <div>
                <Label className="text-xs font-bold text-slate-700">Assigned Department</Label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full mt-1 border border-slate-200 rounded-xl p-2 text-xs bg-white font-medium"
                  required
                >
                  <option value="">Select Department...</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-slate-700">Phone Number (Optional)</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="mt-1 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-[#2f4692]"
              />
              <Label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                Account Active & Enabled
              </Label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formLoading}
                className="bg-[#2f4692] hover:bg-[#243a7a] text-white rounded-xl text-xs font-bold h-9"
              >
                {formLoading ? 'Saving...' : formMode === 'create' ? 'Create Account' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clear Database Dialog */}
      <Dialog open={isClearDbOpen} onOpenChange={setIsClearDbOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Purge Database Confirmation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              This will permanently delete all student, faculty, activity, publication, and metric records from MongoDB storage. Default admin accounts will be retained.
            </p>
            <p className="font-bold text-slate-900">
              Type <span className="text-rose-600 font-mono">DELETE ALL RECORDS</span> to proceed:
            </p>
            <Input
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="DELETE ALL RECORDS"
              className="rounded-xl border-rose-300 text-xs"
            />
          </div>
          <DialogFooter className="pt-4 border-t border-slate-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsClearDbOpen(false)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={clearConfirmText !== 'DELETE ALL RECORDS' || isClearing}
              onClick={handleClearDatabase}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold h-9"
            >
              {isClearing ? 'Purging...' : 'Confirm Purge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
