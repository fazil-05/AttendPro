// src/pages/admin/DashboardPage.tsx
// Super Admin / Manager Dashboard with stats and charts

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, Building2, CheckCircle, Clock, XCircle, UserX, UserCheck, Calendar } from 'lucide-react';
import api from '../../services/api';
import type { DashboardStats } from '../../types';
import { StatCardSkeleton } from '../../components/ui/SkeletonLoader';
import { useAuth } from '../../contexts/AuthContext';

// ─── Stat Card ────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  shadowColor: string;
  change?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, gradient, shadowColor, change, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="stat-card"
    style={{ background: gradient, boxShadow: `0 8px 24px ${shadowColor}` }}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-2.5 bg-white/20 rounded-xl">
        {icon}
      </div>
      {change && (
        <span className="text-white/70 text-xs font-medium">{change}</span>
      )}
    </div>
    <p className="text-3xl font-bold text-white mb-1">{value}</p>
    <p className="text-white/70 text-sm">{title}</p>
  </motion.div>
);

// ─── Chart colors ─────────────────────────────────────────
const COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  half_day: '#6366f1',
  leave: '#8b5cf6',
};

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard/stats');
      return data.data as DashboardStats;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch today's attendance summary
  const { data: todayData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/today');
      return data.data;
    },
    refetchInterval: 30000,
  });

  // Fetch monthly stats for charts
  const { data: monthlyStats } = useQuery({
    queryKey: ['attendance-stats-monthly'],
    queryFn: async () => {
      const { data } = await api.get('/attendance/stats');
      return data.data;
    },
  });

  // Pie chart data
  const pieData = statsData ? [
    { name: 'Present', value: statsData.today_present, color: COLORS.present },
    { name: 'Late', value: statsData.today_late, color: COLORS.late },
    { name: 'Absent', value: statsData.today_absent, color: COLORS.absent },
    { name: 'On Leave', value: statsData.today_on_leave, color: COLORS.leave },
    { name: 'Half Day', value: statsData.today_half_day, color: COLORS.half_day },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #06b6d4 100%)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <div className="absolute right-20 -bottom-10 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white' }} />
        <h2 className="text-xl font-bold mb-1">
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]}! 👋
        </h2>
        <p className="text-blue-100 text-sm">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Employees"
              value={statsData?.total_employees || 0}
              icon={<Users size={20} className="text-white" />}
              gradient="linear-gradient(135deg, #3b82f6, #1d4ed8)"
              shadowColor="rgba(59,130,246,0.3)"
              delay={0}
            />
            <StatCard
              title="Active Branches"
              value={statsData?.total_branches || 0}
              icon={<Building2 size={20} className="text-white" />}
              gradient="linear-gradient(135deg, #8b5cf6, #6d28d9)"
              shadowColor="rgba(139,92,246,0.3)"
              delay={0.05}
            />
            <StatCard
              title="Present Today"
              value={(statsData?.today_present || 0) + (statsData?.today_late || 0)}
              icon={<CheckCircle size={20} className="text-white" />}
              gradient="linear-gradient(135deg, #10b981, #059669)"
              shadowColor="rgba(16,185,129,0.3)"
              delay={0.1}
            />
            <StatCard
              title="Absent Today"
              value={statsData?.today_absent || 0}
              icon={<UserX size={20} className="text-white" />}
              gradient="linear-gradient(135deg, #ef4444, #dc2626)"
              shadowColor="rgba(239,68,68,0.3)"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5 flex items-center gap-4 dark:bg-slate-800/50"
        >
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <Clock size={20} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsData?.today_late || 0}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Late Today</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 flex items-center gap-4 dark:bg-slate-800/50"
        >
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
            <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsData?.today_on_leave || 0}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">On Leave</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 flex items-center gap-4 dark:bg-slate-800/50"
        >
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
            <UserCheck size={20} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{statsData?.today_half_day || 0}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Half Day</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-5 flex items-center gap-4 dark:bg-slate-800/50"
        >
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
            <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">
              {statsData?.total_employees
                ? Math.round(((statsData.today_present + statsData.today_late) / statsData.total_employees) * 100)
                : 0}%
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Attendance Rate</p>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card p-6 dark:bg-slate-800/50"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
            Monthly Attendance Overview
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyStats?.chartData?.slice(-14) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={v => new Date(v).getDate().toString()}
              />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 10, border: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="present" fill={COLORS.present} name="Present" radius={[4, 4, 0, 0]} />
              <Bar dataKey="late" fill={COLORS.late} name="Late" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" fill={COLORS.absent} name="Absent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-6 dark:bg-slate-800/50"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-4">
            Today's Summary
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
              No attendance data for today
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Attendance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card dark:bg-slate-800/50"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Today's Recent Attendance</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {todayData?.records?.length || 0} records
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
                <th>Status</th>
                <th>Distance</th>
              </tr>
            </thead>
            <tbody>
              {todayData?.records?.slice(0, 10).map((record: any) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {record.employee?.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white text-sm">{record.employee?.name}</p>
                        <p className="text-slate-400 text-xs">{record.employee?.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {record.check_in ? new Date(record.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">
                    {record.check_out ? new Date(record.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : <span className="live-pulse text-green-500 text-xs">Live</span>}
                  </td>
                  <td className="text-sm text-slate-600 dark:text-slate-400">
                    {record.working_hours ? `${record.working_hours}h` : '—'}
                  </td>
                  <td>
                    <span className={`badge badge-${record.status}`}>
                      {record.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-sm text-slate-500 dark:text-slate-400">
                    {record.distance ? `${record.distance}m` : '—'}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No attendance records for today yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default DashboardPage;
