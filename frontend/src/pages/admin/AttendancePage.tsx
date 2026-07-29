// src/pages/admin/AttendancePage.tsx
// Attendance overview table for admin/manager

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import type { Attendance } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

const AttendancePage: React.FC = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', date, statusFilter, page],
    queryFn: async () => {
      const { data } = await api.get('/attendance', {
        params: { date, status: statusFilter || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const records: Attendance[] = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Attendance Overview</h2>
        <p className="text-slate-500 text-sm">{total} records</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 dark:bg-slate-800/50 flex flex-wrap gap-3">
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
        className="glass-card overflow-hidden dark:bg-slate-800/50"
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
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Distance</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        No attendance records for this date
                      </td>
                    </tr>
                  ) : records.map(record => (
                    <tr key={record.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {(record.employee as any)?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-800 dark:text-white">
                              {(record.employee as any)?.name}
                            </p>
                            <p className="text-xs text-slate-400">{(record.employee as any)?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-slate-500">{format(new Date(record.date), 'dd MMM yyyy')}</td>
                      <td>
                        <span className="text-sm font-medium text-slate-800 dark:text-white">
                          {record.check_in ? format(new Date(record.check_in), 'HH:mm') : '—'}
                        </span>
                      </td>
                      <td className="text-sm text-slate-500">
                        {record.check_out ? format(new Date(record.check_out), 'HH:mm')
                          : record.check_in ? <span className="live-pulse text-green-500 text-xs">Live</span>
                          : '—'}
                      </td>
                      <td className="text-sm">{record.working_hours ? `${record.working_hours}h` : '—'}</td>
                      <td><StatusBadge status={record.status} size="sm" /></td>
                      <td className="text-sm text-slate-500">{record.distance ? `${record.distance}m` : '—'}</td>
                      <td>
                        {record.check_in_latitude && (
                          <a
                            href={`https://maps.google.com/?q=${record.check_in_latitude},${record.check_in_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            View Map
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
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
