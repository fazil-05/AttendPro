// src/services/attendanceService.ts
// Attendance service — replaces backend attendanceController
// Calls Supabase directly from the browser

import { supabase } from './supabase';
import type { Attendance } from '../types';
import { isWithinGeofence } from '../utils/haversine';
import { determineAttendanceStatus, calculateWorkingHours } from '../utils/attendanceStatus';

export interface CheckInPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  address?: string;
  photo_url: string;
  device?: string;
  browser?: string;
  network_type?: string;
  branch_id?: string;
}

/**
 * POST /api/attendance/checkin → direct Supabase + client-side geofencing
 */
export async function checkIn(
  userId: string,
  userRole: string,
  userBranchId: string | undefined,
  payload: CheckInPayload
): Promise<Attendance> {
  const today = new Date().toISOString().split('T')[0];

  // Check for duplicate check-in
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, check_in')
    .eq('employee_id', userId)
    .eq('date', today)
    .single();

  if (existing?.check_in) {
    throw new Error('You have already checked in today.');
  }

  if (!payload.latitude || !payload.longitude) throw new Error('GPS coordinates are required');
  if (!payload.photo_url) throw new Error('Selfie photo is required');

  const effectiveBranchId = payload.branch_id || userBranchId;

  let distance: number | null = null;

  // Geofence check for office employees
  if (userRole === 'office_employee' && effectiveBranchId) {
    const { data: branch } = await supabase
      .from('branches')
      .select('latitude, longitude, radius')
      .eq('id', effectiveBranchId)
      .single();

    if (!branch) throw new Error('Branch not found');

    const geofence = isWithinGeofence(
      branch.latitude,
      branch.longitude,
      payload.latitude,
      payload.longitude,
      branch.radius
    );
    distance = geofence.distance;

    if (!geofence.inside) {
      throw new Error(
        `You are outside the office premises (${geofence.distance}m away, allowed: ${branch.radius}m). Check-in failed.`
      );
    }
  }

  // Check if today is a holiday
  const { data: holiday } = await supabase
    .from('holidays')
    .select('id')
    .eq('date', today)
    .or(effectiveBranchId ? `branch_id.is.null,branch_id.eq.${effectiveBranchId}` : 'branch_id.is.null')
    .maybeSingle();

  if (holiday) {
    throw new Error('Today is a holiday. No attendance required.');
  }

  // Get shift settings
  const { data: employee } = await supabase
    .from('users')
    .select('shift_id, shifts(late_threshold, half_day_threshold)')
    .eq('id', userId)
    .single();

  const shiftData = (employee as unknown as { shifts?: { late_threshold?: string; half_day_threshold?: string } })?.shifts;
  const shiftTiming = {
    lateThreshold: shiftData?.late_threshold || '09:15',
    halfDayThreshold: shiftData?.half_day_threshold || '10:00',
  };

  const checkInTime = new Date();
  const status = determineAttendanceStatus(checkInTime, shiftTiming, false, false, false);

  const attendanceData = {
    employee_id: userId,
    branch_id: effectiveBranchId || null,
    date: today,
    check_in: checkInTime.toISOString(),
    check_in_latitude: payload.latitude,
    check_in_longitude: payload.longitude,
    check_in_address: payload.address || null,
    check_in_photo: payload.photo_url,
    distance,
    status,
    device: payload.device || null,
    browser: payload.browser || null,
    network_type: payload.network_type || null,
    accuracy: payload.accuracy || null,
    altitude: payload.altitude || null,
  };

  const { data, error } = existing
    ? await supabase.from('attendance').update(attendanceData).eq('id', existing.id).select().single()
    : await supabase.from('attendance').insert(attendanceData).select().single();

  if (error) throw new Error('Failed to save attendance: ' + error.message);
  return data as unknown as Attendance;
}

export interface CheckOutPayload {
  latitude?: number;
  longitude?: number;
  address?: string;
  photo_url?: string;
}

/**
 * POST /api/attendance/checkout → direct Supabase
 */
export async function checkOut(userId: string, payload: CheckOutPayload): Promise<Attendance> {
  const today = new Date().toISOString().split('T')[0];

  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', userId)
    .eq('date', today)
    .single();

  if (!attendance?.check_in) throw new Error('You have not checked in today.');
  if (attendance?.check_out) throw new Error('You have already checked out today.');

  const checkOutTime = new Date();
  const checkInTime = new Date(attendance.check_in as string);
  const workingHours = calculateWorkingHours(checkInTime, checkOutTime);

  const { data, error } = await supabase
    .from('attendance')
    .update({
      check_out: checkOutTime.toISOString(),
      check_out_latitude: payload.latitude || null,
      check_out_longitude: payload.longitude || null,
      check_out_address: payload.address || null,
      check_out_photo: payload.photo_url || null,
      working_hours: workingHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attendance.id)
    .select()
    .single();

  if (error) throw new Error('Failed to save check-out');
  return data as unknown as Attendance;
}

export interface AttendanceFilters {
  employee_id?: string;
  branch_id?: string;
  date?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * GET /api/attendance → direct Supabase
 */
export async function getAttendance(
  filters: AttendanceFilters = {},
  currentUser?: { role: string; id: string; branch_id?: string }
) {
  const { employee_id, branch_id, date, from_date, to_date, status, page = 1, limit = 50 } = filters;

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(id, name, employee_id, photo, role,
        branches(id, name), departments(id, name))
    `, { count: 'exact' });

  // Scope by role
  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  } else if (
    currentUser?.role === 'office_employee' ||
    currentUser?.role === 'field_employee'
  ) {
    query = query.eq('employee_id', currentUser.id);
  }

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (branch_id) query = query.eq('branch_id', branch_id);
  if (date) query = query.eq('date', date);
  if (from_date) query = query.gte('date', from_date);
  if (to_date) query = query.lte('date', to_date);
  if (status) query = query.eq('status', status);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('date', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error('Failed to fetch attendance');

  return {
    data: (data || []) as unknown as Attendance[],
    meta: { total: count || 0, page, limit },
  };
}

/**
 * GET /api/attendance/today → direct Supabase
 */
export async function getTodayAttendance(currentUser?: { role: string; branch_id?: string }) {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(id, name, employee_id, photo, role)
    `)
    .eq('date', today);

  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  }

  const { data, error } = await query.order('check_in', { ascending: false });
  if (error) throw new Error('Failed to fetch today attendance');

  const records = (data || []) as unknown as (Attendance & { employee: unknown })[];

  const summary = {
    present: records.filter(a => a.status === 'present').length,
    late: records.filter(a => a.status === 'late').length,
    half_day: records.filter(a => a.status === 'half_day').length,
    absent: records.filter(a => a.status === 'absent').length,
    on_leave: records.filter(a => a.status === 'leave').length,
    checked_in: records.filter(a => a.check_in && !a.check_out).length,
    checked_out: records.filter(a => a.check_out).length,
  };

  return { records, summary };
}

/**
 * GET /api/attendance/stats → direct Supabase
 */
export async function getAttendanceStats(
  month?: number,
  year?: number,
  branch_id?: string,
  currentUser?: { role: string; branch_id?: string }
) {
  const currentDate = new Date();
  const m = month || currentDate.getMonth() + 1;
  const y = year || currentDate.getFullYear();

  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const toDate = new Date(y, m, 0).toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select('status, date, branch_id')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch stats');

  // Group by date for chart data
  const byDate: Record<string, Record<string, number>> = {};
  data?.forEach(record => {
    if (!byDate[record.date]) {
      byDate[record.date] = { present: 0, late: 0, absent: 0, half_day: 0, leave: 0 };
    }
    if (byDate[record.date][record.status] !== undefined) {
      byDate[record.date][record.status]++;
    }
  });

  const chartData = Object.entries(byDate).map(([date, counts]) => ({ date, ...counts }));
  const totals = {
    present: data?.filter(a => a.status === 'present').length || 0,
    late: data?.filter(a => a.status === 'late').length || 0,
    absent: data?.filter(a => a.status === 'absent').length || 0,
    half_day: data?.filter(a => a.status === 'half_day').length || 0,
    on_leave: data?.filter(a => a.status === 'leave').length || 0,
  };

  return { chartData, totals };
}
