// src/pages/employee/EmployeeLeavesPage.tsx
// My Leave Applications — employee-only view: apply for leave & track status

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, Calendar, Clock, CheckCircle, AlertCircle,
  X, FileText, ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

// ─── Schema ──────────────────────────────────────────────────
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

// ─── Leave type styling ───────────────────────────────────────
const leaveTypeColors: Record<string, string> = {
  casual:    'bg-blue-50 text-blue-700 border border-blue-200',
  sick:      'bg-red-50 text-red-700 border border-red-200',
  earned:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  maternity: 'bg-pink-50 text-pink-700 border border-pink-200',
  emergency: 'bg-amber-50 text-amber-700 border border-amber-200',
};

// Status card styling
const statusCardStyle: Record<string, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  pending: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Clock size={14} className="text-amber-600" />,
    label: 'Pending Review',
  },
  approved: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: <CheckCircle size={14} className="text-emerald-600" />,
    label: 'Approved',
  },
  rejected: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <AlertCircle size={14} className="text-red-600" />,
    label: 'Rejected',
  },
};

// ─── Component ────────────────────────────────────────────────
const EmployeeLeavesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  // ── Fetch MY leaves only ───────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-leaves', statusFilter],
    queryFn: async () => {
      const { data } = await api.get('/leaves', {
        params: { status: statusFilter || undefined },
      });
      return data.data as any[];
    },
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  const leaves = data || [];

  // Summary counts
  const pendingCount  = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'rejected').length;

  // ── Apply Leave form ───────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ApplyLeaveForm>({
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
    onSuccess: res => {
      toast.success(res.data?.message || 'Leave application submitted! Pending admin review.');
      reset();
      setShowApplyModal(false);
      queryClient.invalidateQueries({ queryKey: ['my-leaves'] });
      queryClient.invalidateQueries({ queryKey: ['my-leaves-summary'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to submit leave request.');
    },
  });

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            My Leave Applications
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Apply for leaves and track your application status in real-time
          </p>
        </div>
        <button
          onClick={() => setShowApplyModal(true)}
          className="btn btn-primary shadow-md shadow-blue-500/20 py-2.5 flex items-center justify-center gap-2"
          id="apply-leave-btn"
        >
          <Plus size={18} /> Apply for Leave
        </button>
      </div>

      {/* ── Summary Stats ──────────────────────────────────── */}
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
            <p className="text-xs text-slate-500 font-semibold">Pending</p>
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

      {/* ── Filters ────────────────────────────────────────── */}
      <div className="glass-card p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="form-input w-44 text-xs sm:text-sm"
            id="my-leave-status-filter"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button
          onClick={() => refetch()}
          className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
        >
          <ChevronDown size={13} className="rotate-180" /> Refresh
        </button>
      </div>

      {/* ── Leave Cards ────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : leaves.length === 0 ? (
          <div className="glass-card p-12 text-center bg-white border border-slate-200 shadow-xs">
            <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-700 font-bold text-base">No leave applications found</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;+ Apply for Leave&quot; to submit your first request
            </p>
            <button
              onClick={() => setShowApplyModal(true)}
              className="btn btn-primary mt-4 text-xs px-5"
            >
              <Plus size={14} className="mr-1" /> Apply for Leave
            </button>
          </div>
        ) : (
          leaves.map((leave: any, idx: number) => {
            const fromDate = leave.from_date || leave.start_date;
            const toDate   = leave.to_date   || leave.end_date;
            const style    = statusCardStyle[leave.status] || statusCardStyle.pending;

            return (
              <motion.div
                key={leave.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="glass-card p-5 bg-white border border-slate-200 shadow-xs hover:border-blue-200 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: leave details */}
                  <div className="flex items-start gap-4 flex-1">
                    {/* Status color bar */}
                    <div className={`w-1.5 self-stretch rounded-full ${
                      leave.status === 'approved' ? 'bg-emerald-400' :
                      leave.status === 'rejected' ? 'bg-red-400' :
                      'bg-amber-400'
                    }`} />

                    <div className="space-y-2 flex-1">
                      {/* Top row: type + status badge */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${leaveTypeColors[leave.leave_type] || 'bg-slate-100 text-slate-700'}`}>
                          {leave.leave_type} Leave
                        </span>
                        <StatusBadge status={leave.status} size="sm" />
                        <span className="text-xs text-slate-500 font-medium">
                          {leave.total_days || 1} {leave.total_days === 1 ? 'day' : 'days'}
                        </span>
                      </div>

                      {/* Date range */}
                      <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-500" />
                        {fromDate ? format(new Date(fromDate), 'dd MMM yyyy') : '—'}
                        {' '}&rarr;{' '}
                        {toDate ? format(new Date(toDate), 'dd MMM yyyy') : '—'}
                      </p>

                      {/* Reason */}
                      {leave.reason && (
                        <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 leading-relaxed">
                          <span className="font-bold text-slate-800">Reason: </span>
                          {leave.reason}
                        </div>
                      )}

                      {/* Rejection note */}
                      {leave.status === 'rejected' && leave.rejection_reason && (
                        <div className="text-xs text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-100 mt-1">
                          <span className="font-bold">Admin Note: </span>
                          {leave.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: status box */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold self-start ${style.bg} ${style.border}`}>
                    {style.icon}
                    <span>{style.label}</span>
                  </div>
                </div>

                {/* Applied on */}
                <p className="text-[11px] text-slate-400 mt-3 ml-5.5">
                  Applied on {leave.created_at ? format(new Date(leave.created_at), 'dd MMM yyyy, hh:mm a') : '—'}
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ── Apply Leave Modal ───────────────────────────────── */}
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
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Apply for Leave</h3>
                    <p className="text-xs text-slate-500">
                      Submitting as <span className="font-semibold text-slate-700">{user?.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(d => applyMutation.mutate(d))} className="space-y-4">
                {/* Leave type */}
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

                {/* Date range */}
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

                {/* Reason */}
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

                {/* Info note */}
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
                  <Clock size={13} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  Your leave request will be reviewed by the admin and status will be updated here.
                </div>

                {/* Actions */}
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
    </div>
  );
};

export default EmployeeLeavesPage;
