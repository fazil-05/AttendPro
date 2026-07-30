// src/pages/admin/ReportsPage.tsx
// Reports and analytics with export capabilities — Clean Light Theme

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, FileText, TrendingUp } from 'lucide-react';
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
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map((row: any) => Object.values(row).map(v => `"${v || ''}"`).join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${reportType}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Generate, view, and export attendance records</p>
        </div>
        <button onClick={exportCSV} disabled={!data || data.length === 0} className="btn btn-primary shadow-xs">
          <Download size={18} /> Export CSV
        </button>
      </div>

      {/* Report Type Selector */}
      <div className="glass-card p-1.5 bg-white border border-slate-200 shadow-xs flex gap-1 flex-wrap rounded-xl">
        {(['daily', 'monthly', 'late', 'absent'] as ReportType[]).map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
              reportType === type
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {type} Report
          </button>
        ))}
      </div>

      {/* Filter Controls */}
      <div className="glass-card p-4 bg-white border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center">
        {reportType === 'monthly' ? (
          <>
            <select value={month} onChange={e => setMonth(e.target.value)} className="form-input w-36">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select value={year} onChange={e => setYear(e.target.value)} className="form-input w-28">
              {['2024', '2025', '2026'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </>
        ) : (
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-input w-44"
          />
        )}
      </div>

      {/* Chart Section */}
      {monthlyChart && monthlyChart.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 bg-white border border-slate-200 shadow-xs"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-blue-600" />
            <h3 className="font-extrabold text-slate-900 text-base">Attendance Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={v => new Date(v).getDate().toString()} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }} />
              <Legend iconType="circle" iconSize={8} />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2.5} name="Present" />
              <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Data Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden bg-white border border-slate-200 shadow-xs"
      >
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={8} /></div>
        ) : !data || data.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700">No report records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  {Object.keys(data[0]).map(key => (
                    <th key={key} className="capitalize">{key.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row: any, i: number) => (
                  <tr key={i}>
                    {Object.entries(row).map(([k, v]: [string, any], j: number) => (
                      <td key={j} className="text-sm font-medium text-slate-800">
                        {k === 'status' ? <StatusBadge status={String(v) as any} size="sm" /> : String(v || '—')}
                      </td>
                    ))}
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
