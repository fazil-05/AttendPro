// src/pages/admin/LeavesPage.tsx
// Leave management — Apply for leaves (employees) & Approve/Reject leave requests (admin/manager) — Clean Light Theme

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, XCircle, Calendar, Clock, AlertCircle, X, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { Leave } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

// ─── Apply Leave Form Schema ──────────────────────────────
const applyLeaveSchema = z.object({
  leave_type: z.enum(['casual', 'sick', 'earned', 'emergency', 'maternity']),
  from_date: z.string().min(1, 'From date is required'),
  to_date: z.string().min(1, 'To date is required'),
  reason: z.string().min(5, 'Reason must be at least 5 characters long'),
}).refine(data => new Date(data.from_date) <= new Date(data.to_date), {
  message: 'From date cannot be after to date',
  path: ['to_date'],
});

type ApplyLeaveForm = z.infer<typeof applyLeaveSchema>;

const leaveTypeColors: Record<string, string> = {
  casual: 'bg-blue-50 text-blue-700 border border-blue-200',
  sick: 'bg-red-50 text-red-700 border border-red-200',
  earned: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  maternity: 'bg-pink-50 text-pink-700 border border-pink-200',
  emergency: 'bg-amber-50 text-amber-700 border border-amber-200',
};

const LeavesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [action, setAction] = useState<{ leave: any; type: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isEmployee = user?.role === 'office_employee' || user?.role === 'field_employee';
  const isAdminOrManager = user?.role === 'super_admin' || user?.role === 'branch_manager';

  // Fetch Leave Requests
  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter, typeFilter],
    queryFn: async () => {
      const { data } = await api.get('/leaves', {
        params: { status: statusFilter || undefined, leave_type: typeFilter || undefined },
      });
      return data.data as Leave[];
    },
    refetchInterval: 30_000, // auto-refresh every 30s to catch new employee submissions
  });

  // Apply Leave Mutation
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ApplyLeaveForm>({
    resolver: zodResolver(applyLeaveSchema),
    defaultValues: {
      leave_type: 'casual',
      from_date: new Date().toISOString().split('T')[0],
      to_date: new Date().toISOString().split('T')[0],
      reason: '',
    },
  });

  const applyMutation = useMutation({
    mutationFn: (formData: ApplyLeaveForm) => api.post('/leaves', formData),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Leave application submitted successfully!');
      reset();
      setShowApplyModal(false);
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves-summary'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit leave request.');
    },
  });

  // Approve/Reject Mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) =>
      api.patch(`/leaves/${id}/status`, { status, rejection_reason }),
    onSuccess: (_, vars) => {
      toast.success(`Leave request ${vars.status} successfully`);
      setAction(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update leave status.');
    },
  });

  const leaves = data || [];

  // Summary counts
  const pendingCount = leaves.filter((l: any) => l.status === 'pending').length;
  const approvedCount = leaves.filter((l: any) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l: any) => l.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header with Apply Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {isAdminOrManager ? 'Leave Applications & Approvals' : 'My Leave Applications'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {isAdminOrManager
              ? 'Review, approve, or reject employee leave requests across your company'
              : 'Apply for leaves and track your application status'}
          </p>
        </div>

        {/* Apply Leave Button — employees only */}
        {isEmployee && (
          <button
            onClick={() => setShowApplyModal(true)}
            className="btn btn-primary shadow-md shadow-blue-500/20 py-2.5 flex items-center justify-center gap-2"
            id="apply-leave-btn"
          >
            <Plus size={18} /> Apply for Leave
          </button>
        )}
      </div>

      {/* Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FileText size={18} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{leaves.length}</p>
            <p className="text-xs text-slate-500 font-semibold">Total Requests</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{pendingCount}</p>
            <p className="text-xs text-slate-500 font-semibold">Pending Review</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle size={18} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{approvedCount}</p>
            <p className="text-xs text-slate-500 font-semibold">Approved</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
            <AlertCircle size={18} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{rejectedCount}</p>
            <p className="text-xs text-slate-500 font-semibold">Rejected</p>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="glass-card p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input w-44 text-xs sm:text-sm"
          id="leave-status-filter"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="form-input w-44 text-xs sm:text-sm"
          id="leave-type-filter"
        >
          <option value="">All Leave Types</option>
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="earned">Earned Leave</option>
          <option value="emergency">Emergency Leave</option>
          <option value="maternity">Maternity Leave</option>
        </select>
      </div>

      {/* Leave List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : leaves.length === 0 ? (
          <div className="glass-card p-12 text-center bg-white border border-slate-200 shadow-xs">
            <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-bold text-base">No leave applications found</p>
            <p className="text-xs text-slate-400 mt-1">
              {isEmployee ? 'Click "+ Apply for Leave" to submit a new request' : 'No employee leave requests match your filter'}
            </p>
          </div>
        ) : (leaves as any[]).map((leave: any, idx: number) => {
          const startDate = leave.from_date || leave.start_date;
          const endDate = leave.to_date || leave.end_date;
          const employeeName = leave.employee?.name || leave.user?.name || user?.name;
          const employeeCode = leave.employee?.employee_id || leave.user?.employee_id;

          return (
            <motion.div
              key={leave.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="glass-card p-5 bg-white border border-slate-200 shadow-xs hover:border-blue-200 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-xs">
                    {employeeName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-base">{employeeName}</h3>
                      {employeeCode && (
                        <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-semibold">
                          {employeeCode}
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${leaveTypeColors[leave.leave_type] || 'bg-slate-100 text-slate-700'}`}>
                        {leave.leave_type} Leave
                      </span>
                      <StatusBadge status={leave.status} size="sm" />
                    </div>

                    <p className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Calendar size={13} className="text-blue-600" />
                      {startDate ? format(new Date(startDate), 'dd MMM yyyy') : '—'} — {endDate ? format(new Date(endDate), 'dd MMM yyyy') : '—'}
                      <span className="text-slate-800 font-bold ml-1">
                        ({leave.total_days || 1} {leave.total_days === 1 ? 'day' : 'days'})
                      </span>
                    </p>

                    {leave.reason && (
                      <div className="text-xs text-slate-700 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        <span className="font-bold text-slate-900">Reason: </span>
                        "{leave.reason}"
                      </div>
                    )}

                    {leave.status === 'rejected' && leave.rejection_reason && (
                      <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100 mt-2">
                        <span className="font-bold">Rejection Note: </span>
                        {leave.rejection_reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve & Reject Actions for Admins/Managers */}
                {isAdminOrManager && leave.status === 'pending' && (
                  <div className="flex items-center gap-2 self-start md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 w-full md:w-auto">
                    <button
                      onClick={() => setAction({ leave, type: 'approve' })}
                      className="btn btn-sm btn-success flex-1 md:flex-initial justify-center gap-1.5 py-2 font-bold"
                    >
                      <CheckCircle size={15} /> Approve
                    </button>
                    <button
                      onClick={() => setAction({ leave, type: 'reject' })}
                      className="btn btn-sm btn-danger flex-1 md:flex-initial justify-center gap-1.5 py-2 font-bold"
                    >
                      <XCircle size={15} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Apply Leave Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setShowApplyModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-lg shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Apply for Leave</h3>
                    <p className="text-xs text-slate-500">Submit a leave request for manager approval</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit(d => applyMutation.mutate(d))} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Leave Type *</label>
                  <select {...register('leave_type')} className="form-input text-xs sm:text-sm capitalize">
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick Leave</option>
                    <option value="earned">Earned Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="maternity">Maternity Leave</option>
                  </select>
                  {errors.leave_type && <p className="text-red-500 text-xs mt-1">{errors.leave_type.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">From Date *</label>
                    <input type="date" {...register('from_date')} className="form-input text-xs sm:text-sm" />
                    {errors.from_date && <p className="text-red-500 text-xs mt-1">{errors.from_date.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">To Date *</label>
                    <input type="date" {...register('to_date')} className="form-input text-xs sm:text-sm" />
                    {errors.to_date && <p className="text-red-500 text-xs mt-1">{errors.to_date.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Leave *</label>
                  <textarea
                    {...register('reason')}
                    rows={3}
                    placeholder="Provide a reason for taking leave..."
                    className="form-input text-xs sm:text-sm"
                  />
                  {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
                </div>

                <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowApplyModal(false)}
                    className="btn btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || applyMutation.isPending}
                    className="btn btn-primary text-xs px-5 shadow-sm"
                  >
                    {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Approve / Reject Confirmation Modal ─────────────────── */}
      <AnimatePresence>
        {action && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setAction(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {action.type === 'approve' ? 'Approve Leave Request' : 'Reject Leave Request'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Are you sure you want to {action.type} the leave request for{' '}
                <span className="font-bold text-slate-900">
                  {action.leave?.employee?.name || action.leave?.user?.name || 'Employee'}
                </span>?
              </p>

              {action.type === 'reject' && (
                <div className="mb-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    placeholder="State reason for rejecting leave request..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="form-input text-xs sm:text-sm"
                    rows={3}
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button onClick={() => setAction(null)} className="btn btn-secondary text-xs">
                  Cancel
                </button>
                <button
                  onClick={() => approveMutation.mutate({
                    id: action.leave.id,
                    status: action.type === 'approve' ? 'approved' : 'rejected',
                    rejection_reason: rejectionReason,
                  })}
                  disabled={approveMutation.isPending}
                  className={`btn text-xs px-5 ${action.type === 'approve' ? 'btn-success' : 'btn-danger'}`}
                >
                  {approveMutation.isPending ? 'Processing...' : action.type === 'approve' ? 'Approve Leave' : 'Reject Leave'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LeavesPage;
