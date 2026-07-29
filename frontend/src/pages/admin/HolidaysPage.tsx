// src/pages/admin/HolidaysPage.tsx
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
  national: 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
  regional: 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800',
  festival: 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800',
  optional: 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800',
};

const HolidaysPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear().toString());
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Holiday Management</h2>
          <p className="text-slate-500 text-sm">{holidays?.length || 0} holidays in {year}</p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={e => setYear(e.target.value)} className="form-input w-28" id="holiday-year">
            {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowForm(s => !s)} className="btn btn-primary" id="add-holiday-btn">
            <Plus size={18} /> Add Holiday
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="glass-card p-5 dark:bg-slate-800/50"
        >
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Add New Holiday</h3>
          <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <input {...register('name')} placeholder="Holiday name" className="form-input" id="holiday-name" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <input {...register('date')} type="date" className="form-input" id="holiday-date" />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div>
              <select {...register('type')} className="form-input" id="holiday-type">
                <option value="national">National</option>
                <option value="regional">Regional</option>
                <option value="festival">Festival</option>
                <option value="optional">Optional</option>
              </select>
            </div>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary" id="save-holiday-btn">
              {isSubmitting ? 'Saving...' : 'Add Holiday'}
            </button>
          </form>
        </motion.div>
      )}

      {/* Holiday Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {holidays?.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`glass-card p-4 border ${typeColors[h.type]} dark:bg-slate-800/50`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 mb-2">
                {typeIcons[h.type as keyof typeof typeIcons]}
                <span className="text-xs font-medium text-slate-500 capitalize">{h.type}</span>
              </div>
              <button
                onClick={() => setDeleteTarget(h)}
                className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white">{h.name}</h3>
            <p className="text-sm text-slate-500 mt-1">
              <Calendar size={13} className="inline mr-1" />
              {format(new Date(h.date), 'EEEE, MMMM d, yyyy')}
            </p>
            {h.description && <p className="text-xs text-slate-400 mt-1">{h.description}</p>}
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Remove Holiday"
        message={`Remove "${deleteTarget?.name}" from holidays?`}
        variant="danger"
        confirmLabel="Remove"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default HolidaysPage;
