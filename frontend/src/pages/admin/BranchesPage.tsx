// src/pages/admin/BranchesPage.tsx
// Branch management with automatic address-to-coordinate geocoding (no manual lat/lng required)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, ToggleRight, ToggleLeft, MapPin, Users, Building2, Navigation, CheckCircle2, Loader2 } from 'lucide-react';
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

  const { register, handleSubmit, getValue, setValue, watch, formState: { errors, isSubmitting } } = useForm<BranchForm>({
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

    // Auto-geocode if coordinates haven't been captured yet
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
        // Fallback default coordinates (Hyderabad) if network fails
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {branch ? 'Edit Branch' : 'Create New Branch'}
              </h2>
              <p className="text-xs text-slate-400">Coordinates are captured automatically from address</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="branch-modal-form">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Branch Name *</label>
              <input {...register('name')} className="form-input" placeholder="e.g. Hyderabad HQ" id="branch-name" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Branch Code *</label>
              <input {...register('code')} className="form-input uppercase" placeholder="e.g. HYD01" id="branch-code" />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
          </div>

          {/* Location Address Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Location / Office Address *
            </label>
            <div className="relative">
              <textarea
                {...register('address')}
                className="form-input pr-24"
                rows={2}
                placeholder="Enter full office address or landmark (e.g. Hitech City, Hyderabad)"
                id="branch-address"
              />
              <button
                type="button"
                onClick={() => geocodeAddress()}
                disabled={isGeocoding}
                className="absolute right-2 bottom-2 btn btn-xs btn-secondary text-xs"
              >
                {isGeocoding ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
                Geocode
              </button>
            </div>
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
          </div>

          {/* Auto-Captured Geocode Status */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" />
              <div>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  {coords ? 'Location Coordinates Captured' : 'Location Not Yet Captured'}
                </p>
                <p className="text-slate-400">
                  {coords
                    ? `Lat: ${coords.latitude.toFixed(6)}, Lng: ${coords.longitude.toFixed(6)}`
                    : 'Coordinates will auto-fetch from address on save'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={detectGPSLocation}
              disabled={isGeocoding}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1 flex-shrink-0"
            >
              <Navigation size={12} />
              Use Current GPS
            </button>
          </div>

          {/* Attendance Radius */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Geofence Radius (meters) *
            </label>
            <input {...register('radius')} type="number" min="50" max="1000" className="form-input" id="branch-radius" />
            {errors.radius && <p className="text-red-500 text-xs mt-1">{errors.radius.message}</p>}
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting || isGeocoding} className="btn btn-primary flex-1" id="save-branch-btn">
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/branches/${id}`),
    onSuccess: () => {
      toast.success('Branch deleted');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to delete branch'),
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/branches/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Branch status updated');
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  const branches = data || [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Branches</h2>
          <p className="text-slate-500 text-sm">{branches.length} branches configured</p>
        </div>
        <button
          onClick={() => { setEditBranch(null); setShowForm(true); }}
          className="btn btn-primary"
          id="add-branch-btn"
        >
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : branches.map((branch, index) => (
          <motion.div
            key={branch.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card p-5 dark:bg-slate-800/50"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-white">{branch.name}</h3>
                  <span className="text-xs font-mono text-slate-400">{branch.code}</span>
                </div>
              </div>
              <StatusBadge status={branch.status} size="sm" />
            </div>

            <div className="space-y-2 mb-4">
              {branch.address && (
                <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <span className="line-clamp-2">{branch.address}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="text-blue-500 font-medium">Geofence Radius: {branch.radius}m</span>
              </div>
              {branch.employee_count !== undefined && (
                <div className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users size={14} />
                  <span>{branch.employee_count} employees</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => { setEditBranch(branch); setShowForm(true); }}
                className="btn btn-sm btn-secondary flex-1"
              >
                <Edit size={14} /> Edit
              </button>
              <button
                onClick={() => toggleStatus.mutate({ id: branch.id, status: branch.status === 'active' ? 'inactive' : 'active' })}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title={branch.status === 'active' ? 'Disable' : 'Enable'}
              >
                {branch.status === 'active'
                  ? <ToggleRight size={18} className="text-green-500" />
                  : <ToggleLeft size={18} className="text-slate-400" />
                }
              </button>
              <button
                onClick={() => setDeleteTarget(branch)}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        ))}

        {!isLoading && branches.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No branches yet</p>
            <p className="text-sm">Create your first branch to get started</p>
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
