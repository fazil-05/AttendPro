// src/pages/admin/EmployeesPage.tsx
// Employee management list with search, filter, inline Add/Edit modals in Clean White & Royal Blue

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, UserPlus, X, Lock, Mail, User as UserIcon, Phone, MapPin, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { User, Branch } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton, CardSkeleton } from '../../components/ui/SkeletonLoader';

// ─── Add/Edit Employee Form Schema ─────────────────────────
const employeeSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
  role: z.enum(['super_admin', 'branch_manager', 'office_employee', 'field_employee']),
  branch_id: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

// ─── Add/Edit Employee Modal Component ───
const EmployeeFormModal: React.FC<{
  employee?: User | null;
  branches: Branch[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ employee, branches, onClose, onSuccess }) => {
  const isEditing = !!employee;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      name: employee.name,
      email: employee.email,
      role: employee.role,
      branch_id: employee.branch_id || '',
      phone: employee.phone || '',
      address: employee.address || '',
      password: '',
    } : {
      role: 'office_employee',
    },
  });

  const onSubmit = async (data: EmployeeForm) => {
    try {
      if (isEditing && employee) {
        await api.put(`/employees/${employee.id}`, data);
        toast.success(`Employee ${data.name} updated successfully!`);
      } else {
        if (!data.password) {
          toast.error('Password is required for new employees');
          return;
        }
        await api.post('/employees', data);
        toast.success(`Employee ${data.name} created successfully!`);
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save employee');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 overflow-y-auto max-h-[90vh] border border-blue-100"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing ? 'Update employee details' : 'Create a new employee account'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="employee-modal-form">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('name')}
                placeholder="e.g. Rahul Sharma"
                className="form-input pl-9"
                id="emp-name-input"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          {/* Email + Password */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="rahul@company.com"
                  className="form-input pl-9"
                  id="emp-email-input"
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isEditing ? 'New Password (optional)' : 'Password *'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className="form-input pl-9"
                  id="emp-password-input"
                />
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
          </div>

          {/* Role + Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                User Role *
              </label>
              <select {...register('role')} className="form-input" id="emp-role-select">
                <option value="office_employee">Office Employee</option>
                <option value="field_employee">Field Employee</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch
              </label>
              <select {...register('branch_id')} className="form-input" id="emp-branch-select">
                <option value="">Select Branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone + Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('phone')}
                  placeholder="+91 9876543210"
                  className="form-input pl-9"
                  id="emp-phone-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Address
              </label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('address')}
                  placeholder="Hyderabad, TS"
                  className="form-input pl-9"
                  id="emp-address-input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 py-2.5">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1 py-2.5" id="save-employee-btn">
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? 'Update' : 'Save Employee'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Main Employees Page Component ──────────────────────────
const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ user: User; newStatus: string } | null>(null);

  // Fetch branches for dropdown
  const { data: branchesData } = useQuery({
    queryKey: ['branches-list'],
    queryFn: async () => {
      const { data } = await api.get('/branches');
      return (data.data || []) as Branch[];
    },
  });

  // Fetch employees list
  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/employees', {
        params: { search, role: roleFilter, status: statusFilter, page, limit: 15 },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success('Employee deleted successfully');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast.error('Failed to delete employee'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/employees/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Employee status updated');
      setToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const employees: User[] = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 15);
  const branches = branchesData || [];

  const roleColors: Record<string, string> = {
    super_admin: 'bg-blue-100 text-blue-800 border border-blue-200',
    branch_manager: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    office_employee: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    field_employee: 'bg-amber-100 text-amber-800 border border-amber-200',
  };

  return (
    <div className="space-y-4 sm:space-y-5 px-1 sm:px-0">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Employees</h2>
          <p className="text-slate-500 text-xs sm:text-sm">{total} total employees registered in system</p>
        </div>
        <button
          onClick={() => { setEditEmployee(null); setShowAddModal(true); }}
          className="btn btn-primary w-full sm:w-auto justify-center py-2.5 shadow-md shadow-blue-500/20"
          id="add-employee-btn"
        >
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      {/* Responsive Filter Panel */}
      <div className="glass-card p-3.5 sm:p-4 bg-white border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="form-input pl-10 text-sm"
              id="employee-search"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="form-input text-xs sm:text-sm sm:w-44"
              id="role-filter"
            >
              <option value="">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="branch_manager">Branch Manager</option>
              <option value="office_employee">Office Employee</option>
              <option value="field_employee">Field Employee</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-input text-xs sm:text-sm sm:w-36"
              id="status-filter"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📱 MOBILE CARD VIEW (< md screens) */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : employees.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400 bg-white">
            <UserIcon className="mx-auto mb-2 opacity-30 text-blue-500" size={36} />
            <p className="font-semibold text-slate-700">No employees found</p>
            <p className="text-xs text-slate-400 mt-1">Tap "+ Add Employee" to create one</p>
          </div>
        ) : (
          employees.map(emp => (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-4 bg-white border border-slate-200 shadow-sm space-y-3"
            >
              {/* Card Header: Avatar + Info + Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {emp.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{emp.name}</h3>
                    <p className="text-xs text-slate-500 break-all">{emp.email}</p>
                  </div>
                </div>
                <StatusBadge status={emp.status} size="sm" />
              </div>

              {/* Badges: ID, Role, Branch */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                  {emp.employee_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full capitalize font-semibold ${roleColors[emp.role] || ''}`}>
                  {emp.role?.replace(/_/g, ' ')}
                </span>
                {(emp.branches as any)?.name && (
                  <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded font-medium">
                    <Building2 size={12} className="text-blue-600" />
                    {(emp.branches as any).name}
                  </span>
                )}
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setEditEmployee(emp); setShowAddModal(true); }}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                >
                  <Edit size={13} /> Edit
                </button>
                <button
                  onClick={() => setToggleTarget({ user: emp, newStatus: emp.status === 'active' ? 'inactive' : 'active' })}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors"
                >
                  {emp.status === 'active' ? (
                    <>
                      <ToggleRight size={14} className="text-emerald-600" /> Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleLeft size={14} /> Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteTarget(emp)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold flex items-center gap-1 hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 💻 DESKTOP TABLE VIEW (≥ md screens) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden md:block glass-card overflow-hidden bg-white border border-slate-200 shadow-sm"
      >
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={7} /></div>
        ) : (
          <>
            <div className="table-container border-0">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Employee ID</th>
                    <th>Role</th>
                    <th>Branch</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <UserIcon className="mx-auto mb-2 opacity-30 text-blue-500" size={40} />
                        <p className="font-semibold text-slate-700">No employees found</p>
                        <p className="text-xs text-slate-400 mt-1">Click "+ Add Employee" to register the first employee</p>
                      </td>
                    </tr>
                  ) : employees.map(emp => (
                    <tr key={emp.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                              {emp.name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                            <p className="text-slate-500 text-xs">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="font-mono text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded">
                          {emp.employee_id}
                        </span>
                      </td>
                      <td>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${roleColors[emp.role] || ''}`}>
                          {emp.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-sm text-slate-600 font-medium">
                        {(emp.branches as any)?.name || '—'}
                      </td>
                      <td className="text-sm text-slate-600">
                        {(emp.departments as any)?.name || '—'}
                      </td>
                      <td>
                        <StatusBadge status={emp.status} size="sm" />
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setEditEmployee(emp); setShowAddModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Edit Employee"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setToggleTarget({ user: emp, newStatus: emp.status === 'active' ? 'inactive' : 'active' })}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                            title={emp.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {emp.status === 'active' ? <ToggleRight size={16} className="text-emerald-600" /> : <ToggleLeft size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(emp)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Shared Pagination */}
      {totalPages > 1 && (
        <div className="glass-card px-4 sm:px-6 py-3 border border-slate-200 flex items-center justify-between bg-white shadow-sm">
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Page {page} of {totalPages} ({total} results)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {showAddModal && (
        <EmployeeFormModal
          employee={editEmployee}
          branches={branches}
          onClose={() => { setShowAddModal(false); setEditEmployee(null); }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditEmployee(null);
            queryClient.invalidateQueries({ queryKey: ['employees'] });
          }}
        />
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />

      {/* Toggle Status Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={`${toggleTarget?.newStatus === 'active' ? 'Activate' : 'Deactivate'} Employee`}
        message={`Are you sure you want to ${toggleTarget?.newStatus === 'active' ? 'activate' : 'deactivate'} ${toggleTarget?.user.name}?`}
        confirmLabel={toggleTarget?.newStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={toggleTarget?.newStatus === 'inactive' ? 'warning' : 'info'}
        onConfirm={() => toggleTarget && toggleStatusMutation.mutate({ id: toggleTarget.user.id, status: toggleTarget.newStatus })}
        onCancel={() => setToggleTarget(null)}
        isLoading={toggleStatusMutation.isPending}
      />
    </div>
  );
};

export default EmployeesPage;
