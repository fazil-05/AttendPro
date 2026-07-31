// src/pages/admin/AttendancePage.tsx
// Attendance overview table for admin/manager — Branch column, Xh Xm hours, Still Working indicator

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, CheckCircle, AlertCircle, Building2, MapPin } from 'lucide-react';
import api from '../../services/api';
import type { Attendance } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

// ─── Format working hours as Xh Xm ──────────────────────────
function formatHours(hours: number | null | undefined): string {
  if (!hours) return '—';
  const totalMins = Math.round(hours * 60);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

const AttendancePage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'branch_manager';

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', date, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/attendance', {
        params: { date, status: statusFilter || undefined, page, limit: 20 },
      });
      return data;
    },
    refetchInterval: isAdmin ? 30_000 : undefined, // auto-refresh for admin
  });

  const records: (Attendance & { employee?: any; branch?: any })[] = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 20);

  // Summary counts for today
  const presentCount  = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const checkedInNow  = records.filter(r => r.check_in && !r.check_out).length;
  const checkedOutNow = records.filter(r => !!r.check_out).length;
  const lateCount     = records.filter(r => r.status === 'late').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {isAdmin ? 'Attendance Overview' : 'My Attendance'}
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm">
            {format(new Date(date), 'EEEE, dd MMMM yyyy')} · {total} record{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Summary stats (admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{presentCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Present</p>
            </div>
          </div>
          <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Clock size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{checkedInNow}</p>
              <p className="text-xs text-slate-500 font-semibold">Still Working</p>
            </div>
          </div>
          <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
              <CheckCircle size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{checkedOutNow}</p>
              <p className="text-xs text-slate-500 font-semibold">Checked Out</p>
            </div>
          </div>
          <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertCircle size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{lateCount}</p>
              <p className="text-xs text-slate-500 font-semibold">Late</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap gap-3">
        <input
          type="date"
          value={date}
          onChange={e => { setDate(e.target.value); setPage(1); }}
          className="form-input w-44"
          id="attendance-date-filter"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="form-input w-40"
          id="attendance-status-filter"
        >
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
          <option value="half_day">Half Day</option>
          <option value="leave">On Leave</option>
          <option value="holiday">Holiday</option>
        </select>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden bg-white border border-slate-200 shadow-xs"
      >
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={7} /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    {isAdmin && <th>Branch</th>}
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Working Hours</th>
                    <th>Status</th>
                    {isAdmin && <th>Location</th>}
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 6} className="text-center py-14 text-slate-400">
                        <Clock size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="font-medium text-sm">No attendance records for this date</p>
                      </td>
                    </tr>
                  ) : records.map(record => {
                    const emp = (record as any).employee;
                    const branchName = (record as any).branch?.name || (record as any).branch_name || '—';
                    const isStillWorking = record.check_in && !record.check_out;

                    return (
                      <tr key={record.id}>
                        {/* Employee */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-xs flex-shrink-0">
                              {emp?.name?.charAt(0)?.toUpperCase() || 'E'}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-slate-900">{emp?.name || '—'}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{emp?.employee_id || ''}</p>
                            </div>
                          </div>
                        </td>

                        {/* Branch (admin only) */}
                        {isAdmin && (
                          <td>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                              <Building2 size={12} className="text-slate-400" />
                              {branchName}
                            </div>
                          </td>
                        )}

                        {/* Date */}
                        <td className="text-sm text-slate-600 font-medium">
                          {format(new Date(record.date), 'dd MMM yyyy')}
                        </td>

                        {/* Check In */}
                        <td>
                          {record.check_in ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">
                                {format(new Date(record.check_in), 'hh:mm a')}
                              </span>
                              <CheckCircle size={12} className="text-emerald-500" />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Check Out */}
                        <td>
                          {record.check_out ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-bold text-slate-900">
                                {format(new Date(record.check_out), 'hh:mm a')}
                              </span>
                              <CheckCircle size={12} className="text-emerald-500" />
                            </div>
                          ) : isStillWorking ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 animate-pulse">
                              ⚡ Still Working
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Working Hours */}
                        <td>
                          {record.check_out ? (
                            <span className="text-sm font-bold text-slate-900">
                              {formatHours(record.working_hours)}
                            </span>
                          ) : isStillWorking ? (
                            <span className="text-xs text-green-600 font-semibold">Active</span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td><StatusBadge status={record.status} size="sm" /></td>

                        {/* Location (admin only) */}
                        {isAdmin && (
                          <td>
                            {record.check_in_latitude ? (
                              <a
                                href={`https://maps.google.com/?q=${record.check_in_latitude},${record.check_in_longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <MapPin size={11} /> View Map
                              </a>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Page {page} of {totalPages} · {total} total records
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-sm btn-secondary">Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-sm btn-secondary">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AttendancePage;
