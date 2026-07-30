// src/components/layout/AppLayout.tsx
// Main authenticated app layout wrapper — Clean Light Theme

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Enterprise Dashboard',
  '/employee-dashboard': 'Employee Portal',
  '/employees': 'Employee Management',
  '/employees/new': 'Add Employee',
  '/branches': 'Branch Management',
  '/branches/new': 'Add Branch',
  '/attendance': 'Attendance Overview',
  '/mark-attendance': 'Mark Attendance',
  '/my-attendance': 'My Attendance',
  '/field-assignments': 'Field Visit Assignments',
  '/live-tracking': 'Live Employee Tracking',
  '/leaves': 'Leave Management',
  '/holidays': 'Holiday Management',
  '/reports': 'Reports & Analytics',
  '/settings': 'Company Settings',
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const title = pageTitles[location.pathname] || 'Attendance System';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
      />
      <div
        className={`min-h-screen flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]'
        }`}
        id="main-content"
      >
        <TopBar title={title} />
        <main className="flex-1 p-4 md:p-6 bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
