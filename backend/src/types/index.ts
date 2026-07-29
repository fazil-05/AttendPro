// src/types/index.ts
// Central TypeScript type definitions for the entire backend

export type UserRole = 'super_admin' | 'branch_manager' | 'office_employee' | 'field_employee';

export type AttendanceStatus = 'present' | 'late' | 'half_day' | 'absent' | 'holiday' | 'leave' | 'weekend';

export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export type LeaveType = 'casual' | 'sick' | 'earned' | 'maternity' | 'emergency';

export type FieldAssignmentStatus = 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed';

export type ShiftType = 'morning' | 'general' | 'night' | 'flexible';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch_id?: string;
  department_id?: string;
  designation_id?: string;
  shift_id?: string;
  employee_id: string;
  status: 'active' | 'inactive';
  photo?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  manager_id?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  branch_id: string;
  created_at: string;
}

export interface Designation {
  id: string;
  name: string;
  department_id?: string;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  late_threshold: string;  // HH:MM
  half_day_threshold: string; // HH:MM
  branch_id?: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  check_in?: string;       // ISO timestamp
  check_out?: string;      // ISO timestamp
  working_hours?: number;  // in hours
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_in_address?: string;
  check_out_latitude?: number;
  check_out_longitude?: number;
  check_out_address?: string;
  check_in_photo?: string;  // URL
  check_out_photo?: string; // URL
  distance?: number;        // meters from office
  status: AttendanceStatus;
  device?: string;
  browser?: string;
  ip_address?: string;
  network_type?: string;
  accuracy?: number;
  branch_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  visit_date: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  status: FieldAssignmentStatus;
  check_in_time?: string;
  check_out_time?: string;
  check_in_photo?: string;
  check_out_photo?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  check_out_latitude?: number;
  check_out_longitude?: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface Leave {
  id: string;
  employee_id: string;
  leave_type: LeaveType;
  from_date: string;
  to_date: string;
  reason: string;
  status: LeaveStatus;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  total_days?: number;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'national' | 'regional' | 'festival' | 'optional';
  branch_id?: string; // null = global
  description?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource: string;
  resource_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

export interface CompanySettings {
  id: string;
  company_name: string;
  company_logo?: string;
  check_in_start: string;   // HH:MM  e.g. "09:00"
  check_in_end: string;     // HH:MM  e.g. "10:00"
  late_threshold: string;   // HH:MM  e.g. "09:15"
  half_day_threshold: string; // HH:MM e.g. "10:00"
  default_radius: number;   // meters
  working_days: number[];   // 0=Sun, 1=Mon, ..., 6=Sat
  timezone: string;
  email_notifications: boolean;
  auto_absent_time: string; // HH:MM e.g. "18:00"
  updated_at: string;
}

// Request augmentation for Express
export interface AuthRequest extends Express.Request {
  user?: {
    id: string;
    role: UserRole;
    branch_id?: string;
    email: string;
  };
}
