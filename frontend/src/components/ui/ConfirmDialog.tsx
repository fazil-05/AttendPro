// src/components/ui/ConfirmDialog.tsx
// Confirmation modal dialog

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, title, message, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', variant = 'danger',
  onConfirm, onCancel, isLoading = false,
}) => {
  const iconColors = {
    danger: 'text-red-500 bg-red-50',
    warning: 'text-amber-500 bg-amber-50',
    info: 'text-blue-500 bg-blue-50',
  };

  const btnClasses = {
    danger: 'btn-danger',
    warning: 'btn bg-amber-500 text-white hover:bg-amber-600',
    info: 'btn-primary',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative glass-card p-6 w-full max-w-md dark:bg-slate-800"
            style={{ background: 'white' }}
          >
            <button
              onClick={onCancel}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>

            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-xl ${iconColors[variant]} flex-shrink-0`}>
                <AlertTriangle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={onCancel} className="btn btn-secondary">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`btn ${btnClasses[variant]}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
