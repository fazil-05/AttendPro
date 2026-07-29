// src/pages/employee/EmployeeDashboardPage.tsx
// Dedicated dashboard portal for Office and Field Employees

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Clock, Calendar, CheckCircle, Navigation,
  AlertCircle, ChevronRight, Shield, FileText
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's attendance
  const { data: todayAttendance } = useQuery({
    queryKey: ['my-today-attendance', today],
    queryFn: async () => {
      const { data } = await api.get('/attendance', { params: { date: today } });
      return data.data?.[0] || null;
    },
  });

  // Fetch monthly attendance history
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['my-attendance-history'],
    queryFn: async () => {
      const { data } = await api.get('/attendance', { params: { limit: 10 } });
      return data.data || [];
    },
  });

  // Fetch my leaves
  const { data: leavesData } = useQuery({
    queryKey: ['my-leaves-summary'],
    queryFn: async () => {
      const { data } = await api.get('/leaves', { params: { limit: 5 } });
      return data.data || [];
    },
  });

  // Calculate monthly stats from history
  const monthlyRecords = historyData || [];
  const presentCount = monthlyRecords.filter((r: any) => r.status === 'present').length;
  const lateCount = monthlyRecords.filter((r: any) => r.status === 'late').length;
  const absentCount = monthlyRecords.filter((r: any) => r.status === 'absent').length;
  const leaveCount = monthlyRecords.filter((r: any) => r.status === 'leave').length;

  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="space-y-6">
      {/* Employee Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 border border-white/20">
                {user?.role?.replace('_', ' ')}
              </span>
              <span className="text-xs text-blue-200">ID: {user?.employee_id || 'EMP-USER'}</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              Welcome, {user?.name}! 👋
            </h2>
            <p className="text-blue-200 text-sm">
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          <button
            onClick={() => navigate('/mark-attendance')}
            className="btn bg-white text-blue-700 hover:bg-blue-50 font-bold shadow-lg"
            id="quick-mark-attendance-btn"
          >
            <Navigation size={18} />
            {hasCheckedOut ? 'View Today\'s Entry' : hasCheckedIn ? 'Mark Check-Out' : 'Mark Check-In Now'}
          </button>
        </div>
      </motion.div>

      {/* Today's Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 dark:bg-slate-800/50"
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-blue-500" />
            Today's Attendance Status
          </h3>
          {todayAttendance?.status && (
            <StatusBadge status={todayAttendance.status} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
            <p className="text-xs text-slate-400 mb-1">Check In Time</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {todayAttendance?.check_in
                ? format(new Date(todayAttendance.check_in), 'hh:mm a')
                : 'Not Checked In'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
            <p className="text-xs text-slate-400 mb-1">Check Out Time</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {todayAttendance?.check_out
                ? format(new Date(todayAttendance.check_out), 'hh:mm a')
                : hasCheckedIn ? <span className="live-pulse text-green-500 text-sm font-semibold">Active Working</span> : '—'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
            <p className="text-xs text-slate-400 mb-1">Total Hours</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white">
              {todayAttendance?.working_hours ? `${todayAttendance.working_hours} hrs` : '—'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <CheckCircle size={20} className="text-white" />
            <span className="text-white/80 text-xs font-semibold">Present</span>
          </div>
          <p className="text-3xl font-bold text-white">{presentCount}</p>
          <p className="text-white/70 text-xs mt-1">Days this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 8px 24px rgba(245,158,11,0.25)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <Clock size={20} className="text-white" />
            <span className="text-white/80 text-xs font-semibold">Late</span>
          </div>
          <p className="text-3xl font-bold text-white">{lateCount}</p>
          <p className="text-white/70 text-xs mt-1">Days this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 8px 24px rgba(239,68,68,0.25)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <AlertCircle size={20} className="text-white" />
            <span className="text-white/80 text-xs font-semibold">Absent</span>
          </div>
          <p className="text-3xl font-bold text-white">{absentCount}</p>
          <p className="text-white/70 text-xs mt-1">Days this month</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-card"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 8px 24px rgba(139,92,246,0.25)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar size={20} className="text-white" />
            <span className="text-white/80 text-xs font-semibold">Leaves</span>
          </div>
          <p className="text-3xl font-bold text-white">{leaveCount}</p>
          <p className="text-white/70 text-xs mt-1">Approved leaves</p>
        </motion.div>
      </div>

      {/* Main Grid: Recent Attendance + Leave Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Attendance Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 glass-card overflow-hidden dark:bg-slate-800/50"
        >
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Attendance Logs</h3>
            <button
              onClick={() => navigate('/my-attendance')}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              View Full History <ChevronRight size={14} />
            </button>
          </div>

          {historyLoading ? (
            <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
          ) : (
            <div className="table-container border-0">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">
                        No recent attendance records
                      </td>
                    </tr>
                  ) : (
                    monthlyRecords.slice(0, 7).map((rec: any) => (
                      <tr key={rec.id}>
                        <td className="font-medium text-sm text-slate-800 dark:text-white">
                          {format(new Date(rec.date), 'dd MMM yyyy')}
                        </td>
                        <td className="text-sm">
                          {rec.check_in ? format(new Date(rec.check_in), 'hh:mm a') : '—'}
                        </td>
                        <td className="text-sm">
                          {rec.check_out ? format(new Date(rec.check_out), 'hh:mm a') : '—'}
                        </td>
                        <td className="text-sm">{rec.working_hours ? `${rec.working_hours}h` : '—'}</td>
                        <td><StatusBadge status={rec.status} size="sm" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* My Leaves Side Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 dark:bg-slate-800/50 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={18} className="text-purple-500" />
                My Leaves
              </h3>
              <button
                onClick={() => navigate('/leaves')}
                className="btn btn-sm btn-secondary text-xs"
              >
                Apply Leave
              </button>
            </div>

            <div className="space-y-3">
              {(leavesData as any[])?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No leave requests submitted yet
                </div>
              ) : (
                (leavesData as any[])?.slice(0, 4).map((leave: any) => (
                  <div
                    key={leave.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-white capitalize">
                        {leave.leave_type} Leave
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(new Date(leave.from_date), 'MMM d')} – {format(new Date(leave.to_date), 'MMM d')}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield size={14} className="text-green-500" />
              <span>Location & selfie verification active for all check-ins.</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
