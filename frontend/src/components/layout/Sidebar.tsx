// src/components/layout/Sidebar.tsx
// Collapsible sidebar navigation

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Building2, Clock, FileText, CalendarDays,
  MapPin, Settings, LogOut, ChevronLeft, ChevronRight, Bell,
  ClipboardList, BarChart3, Navigation, Menu, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Admin Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', roles: ['super_admin', 'branch_manager'] },
  { label: 'My Dashboard', icon: <LayoutDashboard size={20} />, path: '/employee-dashboard', roles: ['office_employee', 'field_employee'] },
  { label: 'Employees', icon: <Users size={20} />, path: '/employees', roles: ['super_admin', 'branch_manager'] },
  { label: 'Branches', icon: <Building2 size={20} />, path: '/branches', roles: ['super_admin'] },
  { label: 'Attendance Overview', icon: <Clock size={20} />, path: '/attendance', roles: ['super_admin', 'branch_manager'] },
  { label: 'Mark Attendance', icon: <Navigation size={20} />, path: '/mark-attendance', roles: ['office_employee', 'field_employee'] },
  { label: 'My Attendance', icon: <Clock size={20} />, path: '/my-attendance', roles: ['office_employee', 'field_employee'] },
  { label: 'Field Visits', icon: <MapPin size={20} />, path: '/field-assignments', roles: ['super_admin', 'branch_manager', 'field_employee'] },
  { label: 'Live Tracking', icon: <Navigation size={20} />, path: '/live-tracking', roles: ['super_admin', 'branch_manager'] },
  { label: 'Leaves', icon: <CalendarDays size={20} />, path: '/leaves', roles: ['super_admin', 'branch_manager', 'office_employee', 'field_employee'] },
  { label: 'Holidays', icon: <CalendarDays size={20} />, path: '/holidays', roles: ['super_admin'] },
  { label: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', roles: ['super_admin', 'branch_manager'] },
  { label: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: ['super_admin'] },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const filteredItems = navItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="sidebar" style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
          <Clock size={18} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-bold text-sm leading-tight">AttendPro</p>
            <p className="text-slate-400 text-xs">Enterprise HRMS</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="ml-auto p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors hidden md:flex"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {filteredItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
            title={collapsed ? item.label : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <span className="nav-icon flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700/50 space-y-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="sidebar-nav-item w-full"
          title={collapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="sidebar-nav-item w-full text-red-400 hover:text-red-300 hover:bg-red-900/20"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <SidebarContent />
      </div>

      {/* Mobile Hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white shadow-lg"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="md:hidden fixed inset-y-0 left-0 z-50"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
