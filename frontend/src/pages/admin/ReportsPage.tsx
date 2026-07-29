// src/pages/admin/ReportsPage.tsx
// Reports and analytics with export capabilities

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, Calendar, Filter, FileText, Table, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../services/api';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { StatusBadge } from '../../components/ui/StatusBadge';

type ReportType = 'daily' | 'monthly' | 'late' | 'absent';

const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const { data, isLoading } = useQuery({
    queryKey: ['report', reportType, date, month, year],
    queryFn: async () => {
      if (reportType === 'daily') {
        const { data } = await api.get('/reports/daily', { params: { date } });
        return data.data;
      }
      if (reportType === 'monthly') {
        const { data } = await api.get('/reports/monthly', { params: { month, year } });
        return data.data;
      }
      if (reportType === 'late') {
        const { data } = await api.get('/reports/late', { params: { from_date: date, to_date: date } });
        return data.data;
      }
      if (reportType === 'absent') {
        const { data } = await api.get('/reports/absent', { params: { from_date: date, to_date: date } });
        return data.data;
      }
    },
  });

  const { data: monthlyChart } = useQuery({
    queryKey: ['attendance-chart', month, year],
    queryFn: async () => {
      const { data } = await api.get('/attendance/stats', { params: { month, year } });
      return data.data?.chartData || [];
    },
  });

  // CSV Export
  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const isMonthly = reportType === 'monthly';

    const headers = isMonthly
      ? ['Employee', 'Employee ID', 'Present', 'Late', 'Absent', 'Half Day', 'Leave', 'Working Hours']
      : ['Date', 'Employee', 'Employee ID', 'Check In', 'Check Out', 'Working Hours', 'Status', 'Distance'];

    const rows = data.map((item: any) => {
      if (isMonthly) {
        return [
          item.employee?.name, item.employee?.employee_id,
          item.present, item.late, item.absent, item.half_day, item.leave,
          item.total_working_hours?.toFixed(1),
        ].join(',');
      }
      return [
        item.date,
        item.employee?.name, item.employee?.employee_id,
        item.check_in ? format(new Date(item.check_in), 'HH:mm') : '',
        item.check_out ? format(new Date(item.check_out), 'HH:mm') : '',
        item.working_hours || '',
        item.status,
        item.distance ? `${item.distance}m` : '',
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${reportType}-${date || `${year}-${month}`}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Reports & Analytics</h2>
          <p className="text-slate-500 text-sm">Generate and export attendance reports</p>
        </div>
        <button onClick={exportCSV} className="btn btn-secondary" id="export-csv-btn">
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="glass-card p-1 dark:bg-slate-800/50 flex gap-1 flex-wrap">
        {(['daily', 'monthly', 'late', 'absent'] as ReportType[]).map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-all capitalize ${
              reportType === type
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
            id={`report-type-${type}`}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Date Filters */}
      <div className="glass-card p-4 dark:bg-slate-800/50 flex flex-wrap gap-3 items-center">
        {reportType === 'monthly' ? (
          <>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Month</label>
              <select value={month} onChange={e => setMonth(e.target.value)} className="form-input w-36" id="report-month">
                {Array.from({ length: 12 }, (_, i) => {
                  const m = String(i + 1).padStart(2, '0');
                  return <option key={m} value={m}>{new Date(2024, i).toLocaleString('default', { month: 'long' })}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="form-input w-28" id="report-year">
                {['2023', '2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="form-input"
              id="report-date"
            />
          </div>
        )}
      </div>

      {/* Monthly Chart */}
      {reportType === 'monthly' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 dark:bg-slate-800/50"
        >
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-500" />
            Monthly Trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => new Date(v).getDate().toString()} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} name="Present" />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} dot={false} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Report Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden dark:bg-slate-800/50"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white capitalize">{reportType} Attendance Data</h3>
        </div>

        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} cols={6} /></div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            <p>No data for the selected period</p>
          </div>
        ) : reportType === 'monthly' ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Present</th>
                  <th>Late</th>
                  <th>Absent</th>
                  <th>Half Day</th>
                  <th>Leave</th>
                  <th>Working Hours</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {(data as any[]).map((row: any) => {
                  const totalDays = row.present + row.late + row.absent + row.half_day + row.leave || 1;
                  const rate = Math.round(((row.present + row.late) / totalDays) * 100);
                  return (
                    <tr key={row.employee?.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                            {row.employee?.name?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{row.employee?.name}</p>
                            <p className="text-xs text-slate-400">{row.employee?.employee_id}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-green-600 font-medium">{row.present}</span></td>
                      <td><span className="text-amber-600 font-medium">{row.late}</span></td>
                      <td><span className="text-red-600 font-medium">{row.absent}</span></td>
                      <td><span className="text-indigo-600 font-medium">{row.half_day}</span></td>
                      <td><span className="text-purple-600 font-medium">{row.leave}</span></td>
                      <td className="font-medium">{row.total_working_hours?.toFixed(1)}h</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 max-w-16">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-medium">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
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
                </tr>
              </thead>
              <tbody>
                {(data as any[]).map((row: any) => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                          {row.employee?.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{row.employee?.name}</p>
                          <p className="text-xs text-slate-400">{row.employee?.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{format(new Date(row.date), 'dd MMM yyyy')}</td>
                    <td className="text-sm font-medium">
                      {row.check_in ? format(new Date(row.check_in), 'HH:mm') : '—'}
                    </td>
                    <td className="text-sm text-slate-500">
                      {row.check_out ? format(new Date(row.check_out), 'HH:mm') : '—'}
                    </td>
                    <td className="text-sm">{row.working_hours ? `${row.working_hours}h` : '—'}</td>
                    <td><StatusBadge status={row.status} size="sm" /></td>
                    <td className="text-sm text-slate-500">{row.distance ? `${row.distance}m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ReportsPage;
