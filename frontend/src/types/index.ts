// src/types/index.ts
// Frontend TypeScript type definitions
// Module marker: ensures Vite treats this as a proper ES module
export const __types = true;

export type UserRole = 'super_admin' | 'branch_manager' | 'office_employee' | 'field_employee';
export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'holiday' | 'leave' | 'weekend';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'emergency';
export type FieldAssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employee_id: string;
  status: 'active' | 'inactive';
  photo?: string;
  phone?: string;
  address?: string;
  branch_id?: string;
  department_id?: string;
  designation_id?: string;
  shift_id?: string;
  created_at: string;
  branches?: { id: string; name: string; code: string };
  departments?: { id: string; name: string };
  designations?: { id: string; name: string };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  manager_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  manager?: { id: string; name: string; email: string; photo?: string };
  employee_count?: number;
}

export interface Department {
  id: string;
  name: string;
  branch_id?: string;
  created_at: string;
  branches?: { id: string; name: string };
}

export interface Designation {
  id: string;
  name: string;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  type: 'morning' | 'general' | 'night' | 'flexible';
  start_time: string;
  end_time: string;
  late_threshold: string;
  half_day_threshold: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  branch_id?: string;
  date: string;
  check_in?: string;
  check_out?: string;
  working_hours?: number;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_address?: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_address?: string;
  check_in_photo?: string;
  check_out_photo?: string;
  distance?: number;
  status: AttendanceStatus;
  device?: string;
  browser?: string;
  ip_address?: string;
  created_at: string;
  employee?: Partial<User>;
}

export interface FieldAssignment {
  id: string;
  employee_id: string;
  assigned_by: string;
  customer_name: string;
  customer_address?: string;
  latitude: number;
  longitude: number;
  radius: number;
  visit_date: string;
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: FieldAssignmentStatus;
  check_in_time?: string;
  check_out_time?: string;
  check_in_photo?: string;
  check_out_photo?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  remarks?: string;
  created_at: string;
  employee?: Partial<User>;
  assigner?: Partial<User>;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  total_days?: number;
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  employee?: Partial<User>;
  approver?: Partial<User>;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'regional' | 'festival' | 'optional';
  branch_id?: string;
  description?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_employees: number;
  total_branches: number;
  today_present: number;
  today_late: number;
  today_absent: number;
  today_on_leave: number;
  today_half_day: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  timestamp?: number;
}
