// src/pages/admin/EmployeesPage.tsx
// Employee management list with inline Add/Edit modals and Employee Attendance Calendar View

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight,
  UserPlus, X, Lock, Mail, User as UserIcon, Phone, MapPin,
  Calendar, ChevronLeft, ChevronRight, CheckCircle, Clock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 overflow-y-auto max-h-[90vh] border border-slate-200"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('name')}
                placeholder="e.g. John Doe"
                className="form-input pl-9 text-sm"
              />
            </div>
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                placeholder="employee@company.com"
                className="form-input pl-9 text-sm"
              />
            </div>
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password {isEditing ? '(Leave blank to keep current)' : '*'}
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('password')}
                type="password"
                placeholder={isEditing ? '••••••••' : 'At least 6 characters'}
                className="form-input pl-9 text-sm"
              />
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role *</label>
              <select {...register('role')} className="form-input text-sm">
                <option value="office_employee">Office Employee</option>
                <option value="field_employee">Field Employee</option>
                <option value="branch_manager">Branch Manager</option>
                <option value="super_admin">Super Admin</option>
              </select>
              {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch</label>
              <select {...register('branch_id')} className="form-input text-sm">
                <option value="">No Branch Assigned</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('phone')}
                  placeholder="+91 9876543210"
                  className="form-input pl-9 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Address / Location</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('address')}
                  placeholder="City, State"
                  className="form-input pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-2">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs py-2 px-5 shadow-sm"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── Employee Calendar View Modal Component ─────────────
const EmployeeCalendarModal: React.FC<{
  employee: User;
  onClose: () => void;
}> = ({ employee, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOffset = getDay(monthStart);

  const fromDate = format(monthStart, 'yyyy-MM-dd');
  const toDate = format(monthEnd, 'yyyy-MM-dd');

  // Query employee attendance for this month
  const { data: attendanceData } = useQuery({
    queryKey: ['employee-attendance-calendar', employee.id, fromDate, toDate],
    queryFn: async () => {
      const { data } = await api.get('/attendance', {
        params: { employee_id: employee.id, from_date: fromDate, to_date: toDate, limit: 100 },
      });
      return data.data || [];
    },
  });

  const attendanceLogs = attendanceData || [];

  // Summary statistics
  const presentDays = attendanceLogs.filter((a: any) => a.status === 'present').length;
  const lateDays = attendanceLogs.filter((a: any) => a.status === 'late').length;
  const leaveDays = attendanceLogs.filter((a: any) => a.status === 'leave').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base shadow-xs">
              {employee.name?.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg">{employee.name}</h3>
                <span className="font-mono text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                  {employee.employee_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium capitalize">
                {employee.role?.replace(/_/g, ' ')} • {(employee.branches as any)?.name || 'Main Branch'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {/* Month Selector & Summary Stats */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-900 text-sm min-w-[130px] text-center">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <CheckCircle size={13} /> Present: {presentDays}
            </span>
            <span className="flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              <Clock size={13} /> Late: {lateDays}
            </span>
            <span className="flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
              <Calendar size={13} /> On Leave: {leaveDays}
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="text-xs font-extrabold text-slate-400 py-1 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {/* Empty offset cells */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`offset-${i}`} className="h-16 rounded-xl bg-slate-50/50" />
          ))}

          {/* Days of Month */}
          {daysInMonth.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const log = attendanceLogs.find((a: any) => a.date === dateStr);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;

            let bgClass = 'bg-white border-slate-200 text-slate-800';
            let badgeText = '';

            if (log) {
              if (log.status === 'present') {
                bgClass = 'bg-emerald-50 border-emerald-300 text-emerald-900';
                badgeText = 'Present';
              } else if (log.status === 'late') {
                bgClass = 'bg-amber-50 border-amber-300 text-amber-900';
                badgeText = 'Late';
              } else if (log.status === 'absent') {
                bgClass = 'bg-red-50 border-red-300 text-red-900';
                badgeText = 'Absent';
              } else if (log.status === 'leave') {
                bgClass = 'bg-purple-50 border-purple-300 text-purple-900';
                badgeText = 'Leave';
              }
            } else if (isWeekend) {
              bgClass = 'bg-slate-50 border-slate-100 text-slate-400';
              badgeText = 'Off';
            }

            return (
              <div
                key={dateStr}
                className={`h-16 p-1.5 rounded-xl border flex flex-col justify-between transition-all ${bgClass}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">{format(day, 'd')}</span>
                  {badgeText && (
                    <span className="text-[10px] font-bold uppercase px-1 rounded">
                      {badgeText}
                    </span>
                  )}
                </div>
                {log?.check_in && (
                  <span className="text-[10px] font-mono font-semibold truncate">
                    {format(new Date(log.check_in), 'hh:mm a')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Employees Page ────────────────────────────────
const EmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState<User | null>(null);
  const [selectedCalendarEmp, setSelectedCalendarEmp] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{ user: User; newStatus: 'active' | 'inactive' } | null>(null);

  // Query employees
  const { data, isLoading } = useQuery({
    queryKey: ['employees', search, roleFilter, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/employees', {
        params: { search: search || undefined, role: roleFilter || undefined, status: statusFilter || undefined, page, limit: 15 },
      });
      return data;
    },
  });

  // Query branches for modal
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches');
      return data.data as Branch[];
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/employees/${id}/status`, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Employee ${vars.status === 'active' ? 'activated' : 'deactivated'} successfully!`);
      setToggleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast.error('Failed to change status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/employees/${id}`),
    onSuccess: () => {
      toast.success('Employee deleted successfully!');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: () => toast.error('Failed to delete employee'),
  });

  const employees: User[] = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 15);
  const branches = branchesData || [];

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800 border border-purple-200',
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
              <div className="flex items-start justify-between gap-2">
                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setSelectedCalendarEmp(emp)}
                >
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {emp.name?.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm hover:text-blue-600 transition-colors">{emp.name}</h3>
                    <p className="text-xs text-slate-500 break-all">{emp.email}</p>
                  </div>
                </div>
                <StatusBadge status={emp.status} size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="font-mono bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                  {emp.employee_id}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full capitalize font-semibold ${roleColors[emp.role] || ''}`}>
                  {emp.role?.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedCalendarEmp(emp)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                >
                  <Calendar size={13} /> Attendance Calendar
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setEditEmployee(emp); setShowAddModal(true); }}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(emp)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
          <div className="table-container border-0">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Role</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      <UserIcon className="mx-auto mb-2 opacity-30 text-blue-500" size={40} />
                      <p className="font-semibold text-slate-700">No employees found</p>
                    </td>
                  </tr>
                ) : employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setSelectedCalendarEmp(emp)}
                      >
                        {emp.photo ? (
                          <img src={emp.photo} alt={emp.name} className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                            {emp.name?.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                            {emp.name}
                            <Calendar size={13} className="text-slate-400 group-hover:text-blue-600" />
                          </p>
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
                    <td>
                      <StatusBadge status={emp.status} size="sm" />
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedCalendarEmp(emp)}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="View Attendance Calendar"
                        >
                          <Calendar size={16} />
                        </button>
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
        )}
      </motion.div>

      {/* Shared Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-sm btn-secondary text-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-sm btn-secondary text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <EmployeeFormModal
            employee={editEmployee}
            branches={branches}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              queryClient.invalidateQueries({ queryKey: ['employees'] });
            }}
          />
        )}
      </AnimatePresence>

      {/* Employee Attendance Calendar Modal */}
      <AnimatePresence>
        {selectedCalendarEmp && (
          <EmployeeCalendarModal
            employee={selectedCalendarEmp}
            onClose={() => setSelectedCalendarEmp(null)}
          />
        )}
      </AnimatePresence>

      {/* Toggle Status Confirm */}
      <ConfirmDialog
        isOpen={!!toggleTarget}
        title={`${toggleTarget?.newStatus === 'active' ? 'Activate' : 'Deactivate'} Employee`}
        message={`Are you sure you want to ${toggleTarget?.newStatus} ${toggleTarget?.user?.name}?`}
        onConfirm={() => toggleTarget && toggleStatusMutation.mutate({ id: toggleTarget.user.id, status: toggleTarget.newStatus })}
        onCancel={() => setToggleTarget(null)}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Employee"
        message={`Are you sure you want to delete ${deleteTarget?.name}? This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default EmployeesPage;
