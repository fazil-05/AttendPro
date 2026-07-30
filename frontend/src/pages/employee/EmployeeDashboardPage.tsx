// src/pages/employee/EmployeeDashboardPage.tsx
// Dedicated dashboard portal for Office and Field Employees — Clean Light Theme

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

  // Safe fallback arrays
  const monthlyLogs = historyData || [];
  const leaves = leavesData || [];

  // Calculate monthly stats from history
  const daysPresent = monthlyLogs.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  const daysLate = monthlyLogs.filter((a: any) => a.status === 'late').length;
  const daysAbsent = monthlyLogs.filter((a: any) => a.status === 'absent').length;

  const isFieldEmployee = user?.role === 'field_employee';
  const hasCheckedIn = !!todayAttendance?.check_in;
  const hasCheckedOut = !!todayAttendance?.check_out;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white overflow-hidden relative shadow-md"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-2">
              <Shield size={13} />
              {isFieldEmployee ? 'Field Employee Portal' : 'Office Employee Portal'}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Welcome back, {user?.name}! 👋
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {format(new Date(), 'EEEE, dd MMMM yyyy')} • {(user as any)?.branch?.name || (user as any)?.branches?.name || 'Main HQ'}
            </p>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => navigate('/mark-attendance')}
            className="btn bg-white text-blue-700 hover:bg-blue-50 font-bold px-6 py-3 shadow-lg flex items-center justify-center gap-2"
          >
            <Navigation size={18} className="text-blue-600 animate-pulse" />
            {hasCheckedOut ? 'View Today Status' : hasCheckedIn ? 'Clock Out Now' : 'Clock In Now'}
          </button>
        </div>
      </motion.div>

      {/* Today Status Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 bg-white border border-slate-200/80 shadow-xs"
      >
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Today's Attendance Status
          </h3>
          {todayAttendance?.status && (
            <StatusBadge status={todayAttendance.status} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">Check In Time</p>
            <p className="text-lg font-bold text-slate-900">
              {todayAttendance?.check_in
                ? format(new Date(todayAttendance.check_in), 'hh:mm a')
                : 'Not Checked In'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">Check Out Time</p>
            <p className="text-lg font-bold text-slate-900">
              {todayAttendance?.check_out
                ? format(new Date(todayAttendance.check_out), 'hh:mm a')
                : hasCheckedIn ? <span className="live-pulse text-green-600 text-sm font-bold">Active Working</span> : '—'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <p className="text-xs text-slate-500 font-semibold mb-1">Total Hours</p>
            <p className="text-lg font-bold text-slate-900">
              {todayAttendance?.working_hours ? `${todayAttendance.working_hours} hrs` : '—'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{daysPresent}</p>
            <p className="text-xs text-slate-500 font-semibold">Days Attended</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{daysLate}</p>
            <p className="text-xs text-slate-500 font-semibold">Late Arrivals</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{daysAbsent}</p>
            <p className="text-xs text-slate-500 font-semibold">Days Absent</p>
          </div>
        </div>

        <div className="glass-card p-4 bg-white border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-xl font-bold text-slate-900">{leaves.length}</p>
            <p className="text-xs text-slate-500 font-semibold">Leave Applications</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Attendance Logs + Leave Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Logs Table */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 glass-card overflow-hidden bg-white border border-slate-200/80 shadow-xs"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Attendance Logs</h3>
            <button
              onClick={() => navigate('/my-attendance')}
              className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>

          {historyLoading ? (
            <div className="p-4"><TableSkeleton rows={5} /></div>
          ) : monthlyLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No attendance logs found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
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
                  {monthlyLogs.map((log: any) => (
                    <tr key={log.id}>
                      <td className="font-semibold text-sm text-slate-900">
                        {format(new Date(log.date), 'dd MMM yyyy')}
                      </td>
                      <td className="text-sm font-medium text-slate-700">
                        {log.check_in ? format(new Date(log.check_in), 'hh:mm a') : '—'}
                      </td>
                      <td className="text-sm text-slate-600">
                        {log.check_out ? format(new Date(log.check_out), 'hh:mm a') : '—'}
                      </td>
                      <td className="text-sm text-slate-600 font-medium">
                        {log.working_hours ? `${log.working_hours}h` : '—'}
                      </td>
                      <td>
                        <StatusBadge status={log.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Quick Leave Request & Summary Widget */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <FileText size={18} className="text-purple-600" />
                Recent Leaves
              </h3>
              <button
                onClick={() => navigate('/leaves')}
                className="text-xs text-blue-600 font-semibold hover:underline"
              >
                Apply Leave
              </button>
            </div>

            {leaves.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-sm">
                No leave requests filed yet
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave: any) => (
                  <div
                    key={leave.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-900 capitalize">{leave.leave_type} Leave</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {format(new Date(leave.start_date), 'dd MMM')} - {format(new Date(leave.end_date), 'dd MMM')}
                      </p>
                    </div>
                    <StatusBadge status={leave.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => navigate('/leaves')}
              className="btn btn-secondary w-full justify-center text-xs"
            >
              Request New Leave
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
