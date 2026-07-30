// src/components/layout/TopBar.tsx
// Top navigation bar with search, notifications, and user info — Clean Light Theme

import React from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopBarProps {
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({ title = 'Dashboard' }) => {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6
      bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">

      {/* Left: Title + Date */}
      <div className="ml-10 md:ml-0">
        <h1 className="text-lg font-extrabold text-slate-900">{title}</h1>
        <p className="text-xs text-slate-500 font-medium hidden sm:block">{today}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200/60 bg-slate-50"
          id="notifications-btn"
        >
          <Bell size={18} className="text-slate-600" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-sm font-bold shadow-xs">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {user?.name}
            </p>
            <p className="text-xs text-blue-600 font-semibold capitalize">
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
