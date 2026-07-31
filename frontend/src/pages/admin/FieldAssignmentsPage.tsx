// src/pages/admin/FieldAssignmentsPage.tsx
// Field Visit Assignments — Full Management & Geofenced Visit Tracking

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Plus, MapPin, Calendar, Clock, CheckCircle2, XCircle, AlertCircle,
  Building2, Users, Search, Filter, Navigation, UserCheck, Check, X, Loader2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { Employee } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { CardSkeleton } from '../../components/ui/SkeletonLoader';

export interface FieldAssignmentItem {
  id: string;
  employee_id: string;
  assigned_by: string;
  customer_name: string;
  customer_address?: string;
  latitude: number;
  longitude: number;
  radius: number;
  visit_date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  remarks?: string;
  check_in_time?: string;
  check_out_time?: string;
  created_at: string;
  employee?: { id: string; name: string; employee_id: string; photo?: string };
  assigner?: { id: string; name: string };
}

const assignmentSchema = z.object({
  employee_id: z.string().min(1, 'Select an employee'),
  customer_name: z.string().min(2, 'Customer name is required'),
  customer_address: z.string().optional(),
  visit_date: z.string().min(1, 'Visit date is required'),
  priority: z.enum(['low', 'medium', 'high']),
  radius: z.string().min(1, 'Geofence radius is required'),
  notes: z.string().optional(),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

const CreateAssignmentModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      visit_date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      radius: '100',
    },
  });

  // Fetch employees list for dropdown
  const { data: employees } = useQuery({
    queryKey: ['employees-field'],
    queryFn: async () => {
      const { data } = await api.get('/employees?limit=100');
      return (data.data as Employee[]).filter(
        e => e.role === 'field_employee' || e.role === 'office_employee' || !e.role
      );
    },
  });

  const addressValue = watch('customer_address');

  // Auto-geocode address using Nominatim
  const geocodeAddress = async () => {
    if (!addressValue || addressValue.length < 3) {
      toast.error('Please enter a customer address first');
      return;
    }

    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressValue)}&limit=1`,
        { headers: { 'User-Agent': 'AttendanceSystem/1.0' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCoords({ latitude: lat, longitude: lon });
        toast.success(`Location found: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      } else {
        toast.error('Address not found on map. Using default GPS coordinates.');
        setCoords({ latitude: 17.4474, longitude: 78.3762 });
      }
    } catch {
      toast.error('Could not auto-geocode location. Using current position.');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => setCoords({ latitude: 17.4474, longitude: 78.3762 })
        );
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  const onSubmit = async (data: AssignmentForm) => {
    let finalCoords = coords;
    if (!finalCoords) {
      finalCoords = { latitude: 17.4474, longitude: 78.3762 };
    }

    const payload = {
      ...data,
      latitude: finalCoords.latitude,
      longitude: finalCoords.longitude,
      radius: parseInt(data.radius),
    };

    try {
      await api.post('/field-assignments', payload);
      toast.success('Field visit assigned successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create field assignment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-200 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Assign Field Visit</h2>
              <p className="text-xs text-slate-500">Create a geofenced customer visit assignment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Employee *</label>
            <select {...register('employee_id')} className="form-input text-xs sm:text-sm">
              <option value="">Select Employee</option>
              {employees?.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="text-red-500 text-xs mt-1">{errors.employee_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Target Name *</label>
              <input {...register('customer_name')} className="form-input text-xs sm:text-sm" placeholder="e.g. Apex Tech Corp" />
              {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Visit Date *</label>
              <input {...register('visit_date')} type="date" className="form-input text-xs sm:text-sm" />
              {errors.visit_date && <p className="text-red-500 text-xs mt-1">{errors.visit_date.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Customer Address</label>
            <div className="relative">
              <input
                {...register('customer_address')}
                className="form-input text-xs sm:text-sm pr-20"
                placeholder="e.g. MG Road, Bengaluru"
              />
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={isGeocoding}
                className="absolute right-1.5 top-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[11px] font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
              >
                {isGeocoding ? <Loader2 size={11} className="animate-spin" /> : <Navigation size={11} />}
                Geocode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select {...register('priority')} className="form-input text-xs sm:text-sm">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Geofence Radius (Meters)</label>
              <input {...register('radius')} type="number" className="form-input text-xs sm:text-sm" placeholder="100" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Instructions</label>
            <textarea {...register('notes')} rows={2} className="form-input text-xs sm:text-sm" placeholder="Details or agenda for field visit..." />
          </div>

          {coords && (
            <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900">📍 Map Coordinates:</span>
              <span className="font-mono text-blue-700 font-bold">{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs py-1.5 px-4">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary text-xs py-1.5 px-5 shadow-xs">
              {isSubmitting ? 'Assigning...' : 'Assign Visit'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const FieldAssignmentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['field-assignments', statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const { data } = await api.get(`/field-assignments?${params.toString()}`);
      return data.data as FieldAssignmentItem[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/field-assignments/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Assignment status updated');
      queryClient.invalidateQueries({ queryKey: ['field-assignments'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  const assignments = data || [];

  const filteredAssignments = assignments.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.customer_name?.toLowerCase().includes(q) ||
      item.customer_address?.toLowerCase().includes(q) ||
      item.employee?.name?.toLowerCase().includes(q) ||
      item.employee?.employee_id?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'pending').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    completed: assignments.filter(a => a.status === 'completed').length,
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Low</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Field Visit Assignments</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Manage geofenced customer visits & track field staff status</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary shadow-xs self-start sm:self-auto"
        >
          <Plus size={16} />
          Assign Field Visit
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Visits</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><MapPin size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-slate-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-amber-600 mt-1">{stats.pending}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In Progress</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Navigation size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-indigo-600 mt-1">{stats.in_progress}</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={16} /></div>
          </div>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">{stats.completed}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {['all', 'pending', 'in_progress', 'completed', 'rejected'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customer, address..."
            className="form-input pl-8 py-1.5 text-xs rounded-lg"
          />
        </div>
      </div>

      {/* Assignments Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : filteredAssignments.map((assignment, index) => (
          <motion.div
            key={assignment.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="group relative bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-400/40 transition-all duration-200 flex flex-col justify-between overflow-hidden"
          >
            {/* Priority Indicator Line */}
            <div className={`h-1 w-full ${
              assignment.priority === 'high' ? 'bg-red-500' :
              assignment.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
            }`} />

            <div className="p-4 space-y-2.5">
              {/* Header: Customer Name & Status */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors leading-tight">
                    {assignment.customer_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getPriorityBadge(assignment.priority)}
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar size={11} /> {assignment.visit_date}
                    </span>
                  </div>
                </div>
                <StatusBadge status={assignment.status} size="sm" />
              </div>

              {/* Address */}
              {assignment.customer_address && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 font-medium">
                  <MapPin size={13} className="flex-shrink-0 text-blue-600" />
                  <span className="truncate">{assignment.customer_address}</span>
                </div>
              )}

              {/* Employee Info */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px]">
                    {assignment.employee?.name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">{assignment.employee?.name || 'Unassigned'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{assignment.employee?.employee_id}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-semibold">
                  <Navigation size={10} /> {assignment.radius}m Radius
                </span>
              </div>

              {assignment.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                  <strong className="text-slate-700">Note:</strong> {assignment.notes}
                </p>
              )}
            </div>

            {/* Quick Actions Footer */}
            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                {assignment.check_in_time ? `In: ${new Date(assignment.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not started'}
              </span>

              {assignment.status === 'pending' && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: 'accepted' })}
                    className="btn btn-xs py-1 px-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-[11px] font-bold"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: 'rejected' })}
                    className="btn btn-xs py-1 px-2.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-[11px] font-bold"
                  >
                    Reject
                  </button>
                </div>
              )}

              {assignment.status === 'accepted' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: 'in_progress' })}
                  className="btn btn-xs py-1 px-3 bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-bold shadow-2xs"
                >
                  Start Visit
                </button>
              )}

              {assignment.status === 'in_progress' && (
                <button
                  onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: 'completed' })}
                  className="btn btn-xs py-1 px-3 bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-bold shadow-2xs"
                >
                  Complete
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {!isLoading && filteredAssignments.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <MapPin size={44} className="mx-auto mb-3 opacity-30 text-blue-500" />
            <p className="font-bold text-slate-700">No field visit assignments found</p>
            <p className="text-xs text-slate-400 mt-1">Click "+ Assign Field Visit" to schedule a customer visit</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <CreateAssignmentModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['field-assignments'] });
          }}
        />
      )}
    </div>
  );
};

export default FieldAssignmentsPage;
