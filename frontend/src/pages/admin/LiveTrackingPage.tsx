// src/pages/admin/LiveTrackingPage.tsx
// Live Field Employee GPS Tracking & Active Customer Visit Monitoring

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Navigation, RefreshCw, Users, MapPin, Clock, Phone,
  Search, Shield, Activity, Compass
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CardSkeleton } from '../../components/ui/SkeletonLoader';

// Fix Leaflet marker icon paths in React bundle
const customEmployeeIcon = L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="
      position: relative;
      width: 38px;
      height: 38px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: 3px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(37,99,235,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 10px;
        height: 10px;
        background-color: #10b981;
        border: 2px solid white;
        border-radius: 50%;
      "></span>
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -34],
});

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
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch live tracking data from API every 15 seconds
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['live-field-employees'],
    queryFn: async () => {
      const { data } = await api.get('/field-assignments/live');
      return (data.data || []) as LiveEmployeeItem[];
    },
    refetchInterval: 15000,
  });

  // Also fetch all field assignments today for stats
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

  // Default Map Center (Hyderabad / India default or active staff coords)
  const defaultCenter = liveEmployees.length > 0 && liveEmployees[0].check_in_latitude
    ? { lat: Number(liveEmployees[0].check_in_latitude), lng: Number(liveEmployees[0].check_in_longitude) }
    : { lat: 17.4474, lng: 78.3762 }; // Hyderabad default center

  const activeMapCenter = selectedLocation || defaultCenter;

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            LIVE GPS TRACKING
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Live Field Employee Tracking</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Monitor active field staff locations & customer visit status in real-time</p>
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
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Navigation size={16} /></div>
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

      {/* Main Grid: Live Map + Employee Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* Leaflet Live GPS Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">Real-Time Field Map View</h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Showing {filteredEmployees.length} active location marker(s)
            </span>
          </div>

          <div className="h-[460px] w-full relative z-10 bg-slate-100">
            <MapContainer
              center={[activeMapCenter.lat, activeMapCenter.lng]}
              zoom={12}
              scrollWheelZoom={true}
              className="h-full w-full rounded-b-2xl"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {liveEmployees.map((empItem) => {
                if (!empItem.check_in_latitude || !empItem.check_in_longitude) return null;
                const lat = Number(empItem.check_in_latitude);
                const lng = Number(empItem.check_in_longitude);

                return (
                  <React.Fragment key={empItem.id}>
                    {/* Geofence Visual Ring */}
                    <Circle
                      center={[lat, lng]}
                      radius={150}
                      pathOptions={{
                        color: '#2563eb',
                        fillColor: '#3b82f6',
                        fillOpacity: 0.15,
                        weight: 2,
                      }}
                    />

                    {/* Employee Marker */}
                    <Marker position={[lat, lng]} icon={customEmployeeIcon}>
                      <Popup className="rounded-xl shadow-lg">
                        <div className="p-1 max-w-xs space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                              {empItem.employee?.name?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-xs">{empItem.employee?.name}</h4>
                              <p className="text-[10px] text-slate-500 font-mono">{empItem.employee?.employee_id}</p>
                            </div>
                          </div>

                          <div className="p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                            <p className="font-semibold text-slate-800">
                              🎯 Customer: <span className="text-blue-700">{empItem.customer_name}</span>
                            </p>
                            {empItem.check_in_time && (
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Clock size={11} /> Checked In: {new Date(empItem.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>
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
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 hover:bg-white hover:border-blue-300 transition-all flex items-center justify-between gap-2"
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
                    onClick={() => {
                      if (item.check_in_latitude && item.check_in_longitude) {
                        setSelectedLocation({
                          lat: Number(item.check_in_latitude),
                          lng: Number(item.check_in_longitude),
                        });
                      }
                    }}
                    className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex-shrink-0"
                    title="Focus on Map"
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
