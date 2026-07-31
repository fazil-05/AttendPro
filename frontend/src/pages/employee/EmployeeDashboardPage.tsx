import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Clock, Calendar, CheckCircle, Navigation,
  AlertCircle, ChevronRight, Shield, FileText, MapPin, Check
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

const EmployeeDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    queryKey: ['my-leaves'],
    queryFn: async () => {
      const { data } = await api.get('/leaves', { params: { limit: 5 } });
      return data.data || [];
    },
  });

  // Fetch my assigned field visits
  const { data: fieldAssignmentsData } = useQuery({
    queryKey: ['my-field-assignments'],
    queryFn: async () => {
      const { data } = await api.get('/field-assignments');
      return data.data || [];
    },
  });

  const updateAssignmentStatus = useMutation({
    mutationFn: ({ id, status, latitude, longitude }: { id: string; status: string; latitude?: number; longitude?: number }) =>
      api.patch(`/field-assignments/${id}/status`, { status, latitude, longitude }),
    onSuccess: () => {
      toast.success('Field visit status updated');
      queryClient.invalidateQueries({ queryKey: ['my-field-assignments'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update field assignment');
    },
  });

  const handleStartVisit = (assignment: any) => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    toast.loading('Checking GPS location for geofence...', { id: 'gps-check' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        toast.dismiss('gps-check');
        updateAssignmentStatus.mutate({
          id: assignment.id,
          status: 'in_progress',
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        toast.dismiss('gps-check');
        toast.error(`GPS Location Error: ${err.message}. Please allow location access.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Safe fallback arrays
  const monthlyLogs = historyData || [];
  const leaves = leavesData || [];
  const fieldAssignments = fieldAssignmentsData || [];

  // Active or pending field assignments
  const pendingOrActiveVisits = fieldAssignments.filter(
    (a: any) => a.status === 'pending' || a.status === 'accepted' || a.status === 'in_progress'
  );

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

      {/* Field Visit Notifications Widget (Shows when employee has assigned visits) */}
      {fieldAssignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5 bg-white border border-blue-200/80 shadow-sm rounded-2xl relative overflow-hidden"
        >
          <div className="h-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600 absolute top-0 left-0" />
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  Assigned Field Visits
                  {pendingOrActiveVisits.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                      {pendingOrActiveVisits.length} Active
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Customer visit tasks assigned to you by manager</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/field-assignments')}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              All Visits <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
            {fieldAssignments.slice(0, 4).map((visit: any) => (
              <div
                key={visit.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-xs transition-all space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{visit.customer_name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Calendar size={11} /> {visit.visit_date}
                    </p>
                  </div>
                  <StatusBadge status={visit.status} size="sm" />
                </div>

                {visit.customer_address && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium bg-white p-2 rounded-lg border border-slate-100">
                    <MapPin size={13} className="text-blue-600 flex-shrink-0" />
                    <span className="truncate">{visit.customer_address}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    🎯 Radius: {visit.radius || 100}m
                  </span>

                  {/* Actions for employee */}
                  {visit.status === 'pending' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateAssignmentStatus.mutate({ id: visit.id, status: 'accepted' })}
                        className="btn btn-xs py-1 px-2.5 bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => updateAssignmentStatus.mutate({ id: visit.id, status: 'rejected' })}
                        className="btn btn-xs py-1 px-2 bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {visit.status === 'accepted' && (
                    <button
                      onClick={() => handleStartVisit(visit)}
                      className="btn btn-xs py-1 px-3 bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Navigation size={12} /> Start Visit (GPS)
                    </button>
                  )}

                  {visit.status === 'in_progress' && (
                    <button
                      onClick={() => updateAssignmentStatus.mutate({ id: visit.id, status: 'completed' })}
                      className="btn btn-xs py-1 px-3 bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 flex items-center gap-1"
                    >
                      <Check size={12} /> Complete Visit
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
                onClick={() => navigate('/my-leaves')}
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
                        {leave.from_date ? format(new Date(leave.from_date), 'dd MMM') : '—'} - {leave.to_date ? format(new Date(leave.to_date), 'dd MMM') : '—'}
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
              onClick={() => navigate('/my-leaves')}
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
