// src/App.tsx
// Main application router with protected routes

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import type { UserRole } from './types';

// ─── Lazy-loaded pages ───────────────────────────────────────
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const EmployeeDashboardPage = lazy(() => import('./pages/employee/EmployeeDashboardPage'));
const EmployeesPage = lazy(() => import('./pages/admin/EmployeesPage'));
const BranchesPage = lazy(() => import('./pages/admin/BranchesPage'));
const AttendancePage = lazy(() => import('./pages/admin/AttendancePage'));
const LeavesPage = lazy(() => import('./pages/admin/LeavesPage'));
const HolidaysPage = lazy(() => import('./pages/admin/HolidaysPage'));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'));
const MarkAttendancePage = lazy(() => import('./pages/attendance/MarkAttendancePage'));

// ─── Query Client ────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// ─── Loading Spinner ─────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading...</p>
    </div>
  </div>
);

// ─── Protected Route ─────────────────────────────────────────
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    const defaultHome = (user.role === 'office_employee' || user.role === 'field_employee')
      ? '/employee-dashboard'
      : '/dashboard';
    return <Navigate to={defaultHome} replace />;
  }

  return <>{children}</>;
};

// ─── Public Route ─────────────────────────────────────────────
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (isAuthenticated) {
    const target = (user?.role === 'office_employee' || user?.role === 'field_employee')
      ? '/employee-dashboard'
      : '/dashboard';
    return <Navigate to={target} replace />;
  }
  return <>{children}</>;
};

// ─── Home Route Redirect ────────────────────────────────────────
const HomeRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const target = (user?.role === 'office_employee' || user?.role === 'field_employee')
    ? '/employee-dashboard'
    : '/dashboard';
  return <Navigate to={target} replace />;
};

// ─── App ──────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        <PublicRoute><Suspense fallback={<PageLoader />}><LoginPage /></Suspense></PublicRoute>
      } />

      {/* Protected — Main Layout */}
      <Route element={
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      }>
        {/* Admin Dashboard */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Employee Dashboard */}
        <Route path="/employee-dashboard" element={
          <ProtectedRoute allowedRoles={['office_employee', 'field_employee']}>
            <Suspense fallback={<PageLoader />}><EmployeeDashboardPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Admin / Manager Modules */}
        <Route path="/employees" element={
          <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
            <Suspense fallback={<PageLoader />}><EmployeesPage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/branches" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}><BranchesPage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/attendance" element={
          <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
            <Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/leaves" element={
          <Suspense fallback={<PageLoader />}><LeavesPage /></Suspense>
        } />
        <Route path="/holidays" element={
          <ProtectedRoute allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}><HolidaysPage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['super_admin', 'branch_manager']}>
            <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Employee Routes */}
        <Route path="/mark-attendance" element={
          <ProtectedRoute allowedRoles={['office_employee', 'field_employee']}>
            <Suspense fallback={<PageLoader />}><MarkAttendancePage /></Suspense>
          </ProtectedRoute>
        } />
        <Route path="/my-attendance" element={
          <ProtectedRoute allowedRoles={['office_employee', 'field_employee']}>
            <Suspense fallback={<PageLoader />}><AttendancePage /></Suspense>
          </ProtectedRoute>
        } />

        {/* Field assignments placeholder */}
        <Route path="/field-assignments" element={
          <div className="glass-card p-8 text-center text-slate-500">
            <p className="text-lg font-medium">Field Visit Assignments</p>
            <p className="text-sm mt-1">Module ready — connect to /api/field-assignments</p>
          </div>
        } />
        <Route path="/live-tracking" element={
          <div className="glass-card p-8 text-center text-slate-500">
            <p className="text-lg font-medium">Live Field Employee Tracking</p>
            <p className="text-sm mt-1">Map view of active field employees</p>
          </div>
        } />
        <Route path="/settings" element={
          <div className="glass-card p-8 text-center text-slate-500">
            <p className="text-lg font-medium">Company Settings</p>
            <p className="text-sm mt-1">Configure attendance timings, radius, and company info</p>
          </div>
        } />
      </Route>

      {/* Redirects */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            containerStyle={{ zIndex: 9999 }}
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
              },
              // Deduplicate identical toasts
              id: undefined,
            }}
            gutter={8}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
