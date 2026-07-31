// src/pages/admin/LiveTrackingPage.tsx
// Live Field Employee GPS Tracking & Active Customer Visit Monitoring

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Navigation, RefreshCw, Users, MapPin, Clock, Phone,
  Search, Shield, Activity, Compass, ZoomIn, ZoomOut, CheckCircle2, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { CardSkeleton } from '../../components/ui/SkeletonLoader';

export interface LiveEmployeeItem {
  id: string;
  customer_name: string;
  check_in_latitude: number;
  check_in_longitude: number;
  check_in_time: string;
  status: string;
  employee?: {
    id: string;
    name: string;
    employee_id: string;
    photo?: string;
    phone?: string;
  };
}

const LiveTrackingPage: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<LiveEmployeeItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Fetch live tracking data from API every 15 seconds
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['live-field-employees'],
    queryFn: async () => {
      const { data } = await api.get('/field-assignments/live');
      return (data.data || []) as LiveEmployeeItem[];
    },
    refetchInterval: 15000,
  });

  // Fetch all field assignments today for stats
  const { data: allAssignmentsData } = useQuery({
    queryKey: ['field-assignments-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await api.get(`/field-assignments?date=${today}`);
      return data.data || [];
    },
    refetchInterval: 20000,
  });

  const liveEmployees = data || [];
  const allAssignments = allAssignmentsData || [];

  const completedToday = allAssignments.filter((a: any) => a.status === 'completed').length;
  const pendingToday = allAssignments.filter((a: any) => a.status === 'pending').length;

  const filteredEmployees = liveEmployees.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.employee?.name?.toLowerCase().includes(q) ||
      item.employee?.employee_id?.toLowerCase().includes(q) ||
      item.customer_name?.toLowerCase().includes(q)
    );
  });

  // Calculate coordinates mapping for visual vector map (normalized 0-100% canvas)
  const getMapPosition = (lat: number, lng: number, index: number) => {
    if (!lat || !lng) {
      const fallbackPositions = [
        { x: 35, y: 40 }, { x: 60, y: 45 }, { x: 45, y: 65 },
        { x: 70, y: 30 }, { x: 30, y: 70 }, { x: 55, y: 55 }
      ];
      return fallbackPositions[index % fallbackPositions.length];
    }
    // Normalize coordinates around India range (lat 8-35, lng 68-97)
    const normX = Math.min(85, Math.max(15, ((lng - 68) / 29) * 70 + 15));
    const normY = Math.min(85, Math.max(15, 85 - ((lat - 8) / 27) * 70));
    return { x: normX, y: normY };
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE GPS RADAR
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Live Field Employee Tracking</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Real-time GPS location monitoring & active customer visit tracking</p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn btn-secondary shadow-2xs self-start sm:self-auto text-xs gap-2 font-bold"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin text-blue-600' : 'text-slate-600'} />
          {isFetching ? 'Syncing Map...' : 'Refresh Live Data'}
        </button>
      </div>

      {/* KPI Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active On Field</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Activity size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{liveEmployees.length}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Visits</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{pendingToday}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Today</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><CheckCircle2 size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-blue-600 mt-1">{completedToday}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Assignments</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Compass size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{allAssignments.length}</p>
        </div>
      </div>

      {/* Main Grid: Interactive Vector Map + Sidebar List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Interactive Live Map Canvas */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Interactive GPS Radar Map</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                <button
                  onClick={() => setZoomLevel(z => Math.min(z + 0.2, 1.8))}
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                <span className="text-[11px] font-mono font-bold px-1.5 text-slate-700">{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.max(z - 0.2, 0.8))}
                  className="p-1 text-slate-600 hover:bg-slate-100 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="h-[460px] w-full relative overflow-hidden bg-[#0f172a] select-none">
            {/* Dark Grid Background */}
            <div
              className="absolute inset-0 opacity-20 transition-transform duration-300"
              style={{
                backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px), radial-gradient(#1e40af 1px, #0f172a 1px)',
                backgroundSize: '24px 24px',
                transform: `scale(${zoomLevel})`,
              }}
            />

            {/* Radar Scanning Line */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-[380px] h-[380px] rounded-full border border-blue-500/40 animate-ping" />
              <div className="w-[240px] h-[240px] rounded-full border border-blue-400/30 absolute" />
            </div>

            {/* City Nodes Visual Highlights */}
            <div className="absolute inset-0 pointer-events-none p-6 text-[10px] font-mono font-bold text-slate-600 flex justify-between items-end opacity-60">
              <span>GPS SYNC ACTIVE • 15S PULSE</span>
              <span>GEO-RADIUS VALIDATION ON</span>
            </div>

            {/* Active Employee GPS Markers */}
            <div
              className="absolute inset-0 transition-transform duration-300"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
            >
              {liveEmployees.map((empItem, idx) => {
                const pos = getMapPosition(empItem.check_in_latitude, empItem.check_in_longitude, idx);
                const isSelected = selectedItem?.id === empItem.id;

                return (
                  <div
                    key={empItem.id}
                    className="absolute cursor-pointer transition-all duration-300"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                    onClick={() => setSelectedItem(empItem)}
                  >
                    {/* Geofence Pulse Circle */}
                    <div className="w-12 h-12 -translate-x-[6px] -translate-y-[6px] rounded-full bg-blue-500/20 border border-blue-400/40 animate-pulse absolute" />

                    {/* Employee Avatar Pin */}
                    <div className={`relative z-10 w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 border-2 ${
                      isSelected ? 'border-amber-400 scale-125 shadow-lg shadow-amber-500/50' : 'border-white shadow-md shadow-blue-500/30'
                    } flex items-center justify-center text-white font-extrabold text-xs transition-transform hover:scale-110`}>
                      {empItem.employee?.name?.charAt(0) || 'F'}
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    </div>

                    {/* Label Tag */}
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap shadow-md border border-slate-700/80 pointer-events-none">
                      {empItem.employee?.name || 'Staff'}
                    </div>
                  </div>
                );
              })}

              {liveEmployees.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Compass size={40} className="mb-2 text-blue-400/40 animate-spin" style={{ animationDuration: '10s' }} />
                  <p className="font-bold text-slate-300 text-sm">No Active Field Visits Currently Checked In</p>
                  <p className="text-xs text-slate-500 mt-1">Staff starting visits on their portal will appear live on map</p>
                </div>
              )}
            </div>

            {/* Selected Marker Detail Card Overlay */}
            <AnimatePresence>
              {selectedItem && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200 text-slate-900 z-30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                        {selectedItem.employee?.name?.charAt(0) || 'F'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{selectedItem.employee?.name}</h4>
                        <p className="text-xs text-blue-600 font-bold">🎯 {selectedItem.customer_name}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedItem(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-100 rounded-lg"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">CHECK-IN TIME</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Clock size={11} className="text-blue-600" />
                        {selectedItem.check_in_time ? new Date(selectedItem.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">EMPLOYEE ID</span>
                      <span className="font-mono font-bold text-slate-800">{selectedItem.employee?.employee_id || '—'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Active Field Staff Sidebar List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Active Staff On Duty ({liveEmployees.length})
            </h3>
          </div>

          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search active field staff..."
                className="form-input pl-8 py-1.5 text-xs rounded-lg"
              />
            </div>
          </div>

          <div className="p-3 space-y-2.5 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            ) : filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Shield size={36} className="mx-auto mb-2 opacity-30 text-blue-500" />
                <p className="font-bold text-slate-700 text-xs">No active field employees right now</p>
                <p className="text-[11px] text-slate-400 mt-1">Checked-in field visits will appear live on map</p>
              </div>
            ) : (
              filteredEmployees.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    selectedItem?.id === item.id
                      ? 'bg-blue-50/90 border-blue-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {item.employee?.name?.charAt(0) || 'F'}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{item.employee?.name}</h4>
                      <p className="text-[11px] text-blue-600 font-semibold truncate">📍 {item.customer_name}</p>
                      {item.check_in_time && (
                        <p className="text-[10px] text-slate-400">
                          Started: {new Date(item.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItem(item);
                    }}
                    className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex-shrink-0"
                    title="Focus on Radar Map"
                  >
                    <Navigation size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
