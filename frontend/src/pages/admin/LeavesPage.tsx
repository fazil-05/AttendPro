// src/pages/admin/LeavesPage.tsx
// Leave management — view, approve, reject — Clean Light Theme

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { Leave } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
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
    casual: 'bg-blue-50 text-blue-700 border border-blue-200',
    sick: 'bg-red-50 text-red-700 border border-red-200',
    earned: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    maternity: 'bg-pink-50 text-pink-700 border border-pink-200',
    emergency: 'bg-amber-50 text-amber-700 border border-amber-200',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Leave Applications</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Manage and track employee leave requests</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="glass-card p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input w-40"
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
          className="form-input w-40"
          id="leave-type-filter"
        >
          <option value="">All Types</option>
          <option value="casual">Casual Leave</option>
          <option value="sick">Sick Leave</option>
          <option value="earned">Earned Leave</option>
          <option value="emergency">Emergency Leave</option>
        </select>
      </div>

      {/* Leave List Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : leaves.length === 0 ? (
          <div className="glass-card p-12 text-center bg-white border border-slate-200">
            <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">No leave requests found</p>
          </div>
        ) : (leaves as any[]).map((leave: any, idx: number) => (
          <motion.div
            key={leave.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className="glass-card p-5 bg-white border border-slate-200 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-xs">
                  {(leave.user?.name || leave.employee?.name || 'U').charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base">{leave.user?.name || leave.employee?.name || 'User'}</h3>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${leaveTypeColors[leave.leave_type]}`}>
                      {leave.leave_type} Leave
                    </span>
                    <StatusBadge status={leave.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {format(new Date(leave.start_date), 'dd MMM yyyy')} — {format(new Date(leave.end_date), 'dd MMM yyyy')}
                    {' '}<span className="font-bold text-slate-700">({leave.total_days} {leave.total_days === 1 ? 'day' : 'days'})</span>
                  </p>
                  {leave.reason && (
                    <p className="text-sm text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      "{leave.reason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons for Managers */}
              {!isEmployee && leave.status === 'pending' && (
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => setAction({ leave, type: 'approve' })}
                    className="btn btn-sm btn-success flex items-center gap-1"
                  >
                    <CheckCircle size={15} /> Approve
                  </button>
                  <button
                    onClick={() => setAction({ leave, type: 'reject' })}
                    className="btn btn-sm btn-danger flex items-center gap-1"
                  >
                    <XCircle size={15} /> Reject
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Approve/Reject Modal */}
      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setAction(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              {action.type === 'approve' ? 'Approve Leave' : 'Reject Leave'}
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to {action.type} this leave request for <span className="font-bold text-slate-900">{(action.leave as any)?.user?.name || (action.leave as any)?.employee?.name || 'Employee'}</span>?
            </p>

            {action.type === 'reject' && (
              <textarea
                placeholder="Reason for rejection (optional)..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="form-input mb-4"
                rows={3}
              />
            )}

            <div className="flex gap-3 justify-end">
              <button onClick={() => setAction(null)} className="btn btn-secondary text-sm">Cancel</button>
              <button
                onClick={() => approveMutation.mutate({
                  id: action.leave.id,
                  status: action.type === 'approve' ? 'approved' : 'rejected',
                  rejection_reason: rejectionReason,
                })}
                disabled={approveMutation.isPending}
                className={`btn text-sm ${action.type === 'approve' ? 'btn-success' : 'btn-danger'}`}
              >
                {approveMutation.isPending ? 'Processing...' : action.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default LeavesPage;
