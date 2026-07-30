// src/pages/admin/LeavesPage.tsx
// Leave management — view, approve, reject

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { Leave } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

const LeavesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('');
  const [action, setAction] = useState<{ leave: Leave; type: 'approve' | 'reject' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const isEmployee = user?.role === 'office_employee' || user?.role === 'field_employee';

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter, typeFilter],
    queryFn: async () => {
      const { data } = await api.get('/leaves', {
        params: { status: statusFilter || undefined, leave_type: typeFilter || undefined },
      });
      return data.data as Leave[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) =>
      api.patch(`/leaves/${id}/status`, { status, rejection_reason }),
    onSuccess: (_, vars) => {
      toast.success(`Leave ${vars.status} successfully`);
      setAction(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    },
    onError: () => toast.error('Operation failed'),
  });

  const leaves = data || [];

  const leaveTypeColors: Record<string, string> = {
    casual: 'bg-blue-100 text-blue-700',
    sick: 'bg-red-100 text-red-700',
    earned: 'bg-green-100 text-green-700',
    maternity: 'bg-pink-100 text-pink-700',
    emergency: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Leave Management</h2>
          <p className="text-slate-500 text-sm">{leaves.length} requests</p>
        </div>
        {isEmployee && (
          <button className="btn btn-primary" id="apply-leave-btn">
            <Calendar size={18} />
            Apply Leave
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-card p-4 dark:bg-slate-800/50 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input w-40"
          id="leave-status-filter"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="form-input w-40"
          id="leave-type-filter"
        >
          <option value="">All Types</option>
          <option value="casual">Casual</option>
          <option value="sick">Sick</option>
          <option value="earned">Earned</option>
          <option value="maternity">Maternity</option>
          <option value="emergency">Emergency</option>
        </select>
      </div>

      {/* Leave Cards */}
      {isLoading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : (
        <div className="space-y-3">
          {leaves.length === 0 ? (
            <div className="glass-card p-12 text-center dark:bg-slate-800/50">
              <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No leave requests found</p>
            </div>
          ) : (leaves as Leave[]).map((leave: Leave, idx: number) => (
            <motion.div
              key={leave.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="glass-card p-5 dark:bg-slate-800/50"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Employee Info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(leave.employee as any)?.name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">
                      {(leave.employee as any)?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-slate-400">{(leave.employee as any)?.employee_id}</p>
                  </div>
                </div>

                {/* Leave Info */}
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <span className={`badge text-xs px-2 py-0.5 rounded-full ${leaveTypeColors[leave.leave_type] || ''}`}>
                    {leave.leave_type?.charAt(0).toUpperCase() + leave.leave_type?.slice(1)} Leave
                  </span>
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <Calendar size={13} />
                    <span>
                      {format(new Date(leave.from_date), 'MMM d')} – {format(new Date(leave.to_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{leave.total_days || 1} day{leave.total_days !== 1 ? 's' : ''}</span>
                  <StatusBadge status={leave.status} size="sm" />
                </div>

                {/* Actions */}
                {!isEmployee && leave.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => setAction({ leave, type: 'approve' })}
                      className="btn btn-sm btn-success"
                      id={`approve-leave-${leave.id}`}
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                    <button
                      onClick={() => setAction({ leave, type: 'reject' })}
                      className="btn btn-sm btn-danger"
                      id={`reject-leave-${leave.id}`}
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Reason */}
              {leave.reason && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 pl-13 bg-slate-50 dark:bg-slate-900/30 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-600 dark:text-slate-300">Reason: </span>
                  {leave.reason}
                </p>
              )}
              {leave.rejection_reason && (
                <p className="mt-2 text-sm text-red-500 pl-3">
                  <span className="font-medium">Rejection reason: </span>
                  {leave.rejection_reason}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Approve Confirm */}
      <ConfirmDialog
        isOpen={!!action && action.type === 'approve'}
        title="Approve Leave Request"
        message={`Approve ${(action?.leave.employee as any)?.name}'s ${action?.leave.leave_type} leave?`}
        confirmLabel="Approve"
        variant="info"
        onConfirm={() => action && approveMutation.mutate({ id: action.leave.id, status: 'approved' })}
        onCancel={() => setAction(null)}
        isLoading={approveMutation.isPending}
      />

      {/* Reject Dialog */}
      {action?.type === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setAction(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md"
          >
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Reject Leave Request</h3>
            <p className="text-slate-500 text-sm mb-4">
              Rejecting {(action.leave.employee as any)?.name}'s leave request.
            </p>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Rejection Reason (optional)
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="form-input"
              rows={3}
              placeholder="Provide a reason for rejection..."
              id="rejection-reason"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAction(null)} className="btn btn-secondary flex-1">Cancel</button>
              <button
                onClick={() => approveMutation.mutate({ id: action.leave.id, status: 'rejected', rejection_reason: rejectionReason })}
                disabled={approveMutation.isPending}
                className="btn btn-danger flex-1"
                id="confirm-reject-btn"
              >
                {approveMutation.isPending ? 'Processing...' : 'Reject Leave'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeavesPage;
