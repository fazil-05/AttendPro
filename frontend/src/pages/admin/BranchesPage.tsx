// src/pages/admin/BranchesPage.tsx
// Branch management with automatic address-to-coordinate geocoding — Clean Light Theme

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ToggleRight, ToggleLeft, MapPin, Users, Building2, Navigation, Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { Branch } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CardSkeleton } from '../../components/ui/SkeletonLoader';

const branchSchema = z.object({
  name: z.string().min(2, 'Branch name is required'),
  code: z.string().min(2, 'Branch code is required').max(10),
  address: z.string().min(3, 'Location address is required'),
  radius: z.string().min(1, 'Radius is required'),
  manager_id: z.string().optional(),
});

type BranchForm = z.infer<typeof branchSchema>;

const BranchFormModal: React.FC<{
  branch?: Branch | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ branch, onClose, onSuccess }) => {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    branch ? { latitude: branch.latitude, longitude: branch.longitude } : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
    defaultValues: branch ? {
      name: branch.name,
      code: branch.code,
      address: branch.address,
      radius: branch.radius.toString(),
      manager_id: branch.manager_id || '',
    } : { radius: '150' },
  });

  const addressValue = watch('address');

  // Auto-geocode address using Nominatim OpenStreetMap API
  const geocodeAddress = async (addrStr?: string) => {
    const queryAddr = addrStr || addressValue;
    if (!queryAddr || queryAddr.length < 3) {
      toast.error('Please enter a location address first');
      return;
    }

    setIsGeocoding(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddr)}&limit=1`,
        { headers: { 'User-Agent': 'AttendanceSystem/1.0' } }
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCoords({ latitude: lat, longitude: lon });
        toast.success(`Coordinates found: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      } else {
        toast.error('Address not found. Trying current GPS location...');
        detectGPSLocation();
      }
    } catch {
      toast.error('Could not geocode address automatically. Using GPS location...');
      detectGPSLocation();
    } finally {
      setIsGeocoding(false);
    }
  };

  // Detect Current Device GPS Location
  const detectGPSLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lon });
        setIsGeocoding(false);
        toast.success(`Current GPS captured: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
      },
      (err) => {
        setIsGeocoding(false);
        toast.error(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const onSubmit = async (data: BranchForm) => {
    let finalCoords = coords;

    if (!finalCoords && data.address) {
      try {
        setIsGeocoding(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address)}&limit=1`,
          { headers: { 'User-Agent': 'AttendanceSystem/1.0' } }
        );
        const results = await response.json();
        if (results && results.length > 0) {
          finalCoords = { latitude: parseFloat(results[0].lat), longitude: parseFloat(results[0].lon) };
        }
      } catch {
        finalCoords = { latitude: 17.4474, longitude: 78.3762 };
      } finally {
        setIsGeocoding(false);
      }
    }

    if (!finalCoords) {
      finalCoords = { latitude: 17.4474, longitude: 78.3762 };
    }

    const payload = {
      ...data,
      latitude: finalCoords.latitude.toString(),
      longitude: finalCoords.longitude.toString(),
    };

    try {
      if (branch) {
        await api.put(`/branches/${branch.id}`, payload);
        toast.success('Branch updated successfully');
      } else {
        await api.post('/branches', payload);
        toast.success('Branch created successfully');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 overflow-hidden border border-slate-200"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {branch ? 'Edit Branch' : 'Create New Branch'}
              </h2>
              <p className="text-xs text-slate-500">Configure branch location and geofence parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="branch-modal-form">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch Name *</label>
              <input {...register('name')} className="form-input text-xs sm:text-sm" placeholder="e.g. Hyderabad Branch" id="branch-name" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Branch Code *</label>
              <input {...register('code')} className="form-input text-xs sm:text-sm uppercase" placeholder="e.g. HYD01" id="branch-code" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Office Address / City *
            </label>
            <div className="relative">
              <textarea
                {...register('address')}
                className="form-input text-xs sm:text-sm pr-24"
                rows={2}
                placeholder="e.g. HITEC City, Hyderabad, Telangana"
                id="branch-address"
              />
              <button
                type="button"
                onClick={() => geocodeAddress()}
                disabled={isGeocoding}
                className="absolute right-2 bottom-2 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 border border-blue-200"
              >
                {isGeocoding ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                Geocode
              </button>
            </div>
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Geofence Radius (Meters) *</label>
            <input {...register('radius')} type="number" className="form-input text-xs sm:text-sm" placeholder="200" id="branch-radius" />
            {errors.radius && <p className="text-red-500 text-xs mt-1">{errors.radius.message}</p>}
          </div>

          {coords && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900">📍 Captured GPS Coordinates:</span>
              <span className="font-mono text-blue-700 font-bold">{coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="btn btn-secondary text-xs">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || isGeocoding} className="btn btn-primary text-xs px-5 shadow-sm">
              {isSubmitting ? 'Saving...' : branch ? 'Update Branch' : 'Create Branch'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const BranchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await api.get('/branches');
      return data.data as Branch[];
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/branches/${id}`, { status }),
    onSuccess: () => {
      toast.success('Branch status updated');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      toast.success('Branch deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const branches = data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Branch Locations</h2>
          <p className="text-slate-500 text-xs sm:text-sm">{branches.length} office branches configured</p>
        </div>
        <button
          onClick={() => { setEditBranch(null); setShowForm(true); }}
          className="btn btn-primary shadow-sm"
          id="add-branch-btn"
        >
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : branches.map((branch, index) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group relative bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-blue-400/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
          >
            {/* Top Royal Blue Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 opacity-90 group-hover:opacity-100 transition-opacity" />

            <div className="p-5 sm:p-6 space-y-4">
              {/* Header: Icon, Title, Code & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg group-hover:text-blue-600 transition-colors leading-tight">
                      {branch.name}
                    </h3>
                    <span className="inline-block mt-1 font-mono text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded-md">
                      {branch.code}
                    </span>
                  </div>
                </div>
                <StatusBadge status={branch.status} size="sm" />
              </div>

              {/* Office Address */}
              {branch.address && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 text-xs text-slate-600 font-medium">
                  <MapPin size={15} className="mt-0.5 flex-shrink-0 text-blue-600" />
                  <span className="line-clamp-2 leading-relaxed">{branch.address}</span>
                </div>
              )}

              {/* Geofence & Employee Count Metrics */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 text-blue-700 border border-blue-100 text-xs font-semibold shadow-2xs">
                  <Navigation size={13} className="text-blue-600" />
                  Geofence: <strong className="font-bold">{branch.radius}m</strong>
                </span>
                {branch.employee_count !== undefined && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 text-slate-700 border border-slate-200/80 text-xs font-semibold">
                    <Users size={13} className="text-slate-500" />
                    <strong className="font-bold">{branch.employee_count}</strong> employees
                  </span>
                )}
              </div>
            </div>

            {/* Card Footer Actions */}
            <div className="px-5 py-3.5 sm:px-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => { setEditBranch(branch); setShowForm(true); }}
                className="btn btn-sm btn-secondary flex-1 text-xs font-bold gap-1.5 shadow-2xs hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
              >
                <Edit size={14} /> Edit Branch
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => toggleStatus.mutate({ id: branch.id, status: branch.status === 'active' ? 'inactive' : 'active' })}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors shadow-2xs"
                  title={branch.status === 'active' ? 'Disable Branch' : 'Enable Branch'}
                >
                  {branch.status === 'active'
                    ? <ToggleRight size={20} className="text-emerald-600" />
                    : <ToggleLeft size={20} className="text-slate-400" />
                  }
                </button>
                <button
                  onClick={() => setDeleteTarget(branch)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 transition-colors shadow-2xs"
                  title="Delete Branch"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {!isLoading && branches.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <Building2 size={48} className="mx-auto mb-3 opacity-30 text-blue-500" />
            <p className="font-bold text-slate-700">No branches configured yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "+ Add Branch" to set up your first location</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <BranchFormModal
          branch={editBranch}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['branches'] });
          }}
        />
      )}

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Branch"
        message={`Delete "${deleteTarget?.name}" branch? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default BranchesPage;
