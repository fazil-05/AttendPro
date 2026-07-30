// src/pages/admin/HolidaysPage.tsx — Clean Light Theme
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, Calendar, Flag, Star, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../../services/api';
import type { Holiday } from '../../types';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  date: z.string().min(1, 'Date is required'),
  type: z.enum(['national', 'regional', 'festival', 'optional']),
  description: z.string().optional(),
});

type HolidayForm = z.infer<typeof schema>;

const typeIcons = {
  national: <Flag size={14} className="text-red-500" />,
  regional: <Globe size={14} className="text-blue-500" />,
  festival: <Star size={14} className="text-amber-500" />,
  optional: <Calendar size={14} className="text-green-500" />,
};

const typeColors: Record<string, string> = {
  national: 'bg-red-50 border-red-200 text-red-700',
  regional: 'bg-blue-50 border-blue-200 text-blue-700',
  festival: 'bg-amber-50 border-amber-200 text-amber-700',
  optional: 'bg-emerald-50 border-emerald-200 text-emerald-700',
};

const HolidaysPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [year] = useState(new Date().getFullYear().toString());
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);

  const { data: holidays } = useQuery({
    queryKey: ['holidays', year],
    queryFn: async () => {
      const { data } = await api.get('/holidays', { params: { year } });
      return data.data as Holiday[];
    },
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<HolidayForm>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'national' },
  });

  const createMutation = useMutation({
    mutationFn: (data: HolidayForm) => api.post('/holidays', data),
    onSuccess: () => {
      toast.success('Holiday added');
      reset();
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/holidays/${id}`),
    onSuccess: () => {
      toast.success('Holiday removed');
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Company Holidays</h2>
          <p className="text-slate-500 text-xs sm:text-sm">{holidays?.length || 0} holidays in {year}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn btn-primary" id="add-holiday-btn">
          <Plus size={18} /> Add Holiday
        </button>
      </div>

      {/* Add Holiday Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setShowForm(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative glass-card p-6 bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Holiday</h3>
            <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Holiday Name *</label>
                <input {...register('name')} className="form-input" placeholder="e.g. Independence Day" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input type="date" {...register('date')} className="form-input" />
                  {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
                  <select {...register('type')} className="form-input capitalize">
                    <option value="national">National</option>
                    <option value="regional">Regional</option>
                    <option value="festival">Festival</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary text-xs">Save Holiday</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Grid of Holidays */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {holidays?.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card p-4 bg-white border ${typeColors[h.type]} rounded-xl shadow-xs flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white shadow-xs border border-slate-100">
                {typeIcons[h.type]}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{h.name}</h4>
                <p className="text-xs text-slate-500 font-medium">
                  {format(new Date(h.date), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDeleteTarget(h)}
              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Holiday"
        message={`Delete "${deleteTarget?.name}"?`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default HolidaysPage;
