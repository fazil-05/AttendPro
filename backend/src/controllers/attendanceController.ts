// src/controllers/attendanceController.ts
// Attendance check-in, check-out, and reporting controller

import { Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { isWithinGeofence } from '../utils/haversine';
import { determineAttendanceStatus, calculateWorkingHours } from '../utils/attendanceStatus';

/**
 * POST /api/attendance/checkin
 * Mark employee check-in with GPS and role-based photo validation.
 */
export const checkIn = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const today = new Date().toISOString().split('T')[0];

  // Prevent duplicate check-in
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, check_in')
    .eq('employee_id', userId)
    .eq('date', today)
    .single();

  if (existing?.check_in) {
    throw createError('You have already checked in today.', 400);
  }

  const {
    latitude, longitude, accuracy, altitude,
    address, photo_url, device, browser, ip_address, network_type,
    branch_id,
  } = req.body;

  // Get employee's role & branch for geofencing and photo validation
  const { data: user } = await supabase
    .from('users')
    .select('role, branch_id')
    .eq('id', userId)
    .single();

  if (!latitude || !longitude) throw createError('GPS coordinates are required', 400);

  // Require photo ONLY for field workers
  if (user?.role === 'field_employee' && !photo_url) {
    throw createError('Selfie photo is required for field workers', 400);
  }

  const effectiveBranchId = branch_id || user?.branch_id;

  let distance: number | null = null;

  // For office employees, enforce geofencing
  if (user?.role === 'office_employee' && effectiveBranchId) {
    const { data: branch } = await supabase
      .from('branches')
      .select('latitude, longitude, radius')
      .eq('id', effectiveBranchId)
      .single();

    if (!branch) throw createError('Branch not found', 404);

    const geofence = isWithinGeofence(
      branch.latitude, branch.longitude,
      parseFloat(latitude), parseFloat(longitude),
      branch.radius
    );
    distance = geofence.distance;

    if (!geofence.inside) {
      res.status(400).json({
        success: false,
        message: 'You are outside the office premises. Check-in failed.',
        data: { distance: geofence.distance, allowed_radius: branch.radius },
      });
      return;
    }
  }

  // Check shift settings
  const { data: employee } = await supabase
    .from('users')
    .select('shift_id, shifts(late_threshold, half_day_threshold)')
    .eq('id', userId)
    .single();

  const shiftData = (employee as any)?.shifts;
  const shiftTiming = {
    lateThreshold: shiftData?.late_threshold || '09:15',
    halfDayThreshold: shiftData?.half_day_threshold || '12:00',
  };

  const checkInTime = new Date();
  const status = determineAttendanceStatus(checkInTime, shiftTiming);

  const attendanceData = {
    employee_id: userId,
    branch_id: effectiveBranchId || null,
    date: today,
    check_in: checkInTime.toISOString(),
    check_in_latitude: parseFloat(latitude),
    check_in_longitude: parseFloat(longitude),
    check_in_address: address || null,
    check_in_photo: photo_url || null,
    distance: distance,
    status,
    device: device || null,
    browser: browser || null,
    ip_address: ip_address || req.ip,
    network_type: network_type || null,
    accuracy: accuracy ? parseFloat(accuracy) : null,
    altitude: altitude ? parseFloat(altitude) : null,
  };

  const { data, error } = existing
    ? await supabase.from('attendance').update(attendanceData).eq('id', existing.id).select().single()
    : await supabase.from('attendance').insert(attendanceData).select().single();

  if (error) throw createError('Failed to save attendance: ' + error.message, 500);

  res.json({
    success: true,
    message: `Check-in successful! Status: ${status}`,
    data,
  });
});

/**
 * POST /api/attendance/checkout
 * Mark employee check-out with automatic fallback creation.
 */
export const checkOut = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const today = new Date().toISOString().split('T')[0];
  const { latitude, longitude, address, photo_url } = req.body;

  const checkOutTime = new Date();

  // Find today's attendance record
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('employee_id', userId)
    .eq('date', today)
    .single();

  if (attendance) {
    const checkInTime = attendance.check_in ? new Date(attendance.check_in) : checkOutTime;
    const workingHours = calculateWorkingHours(checkInTime, checkOutTime);

    const { data, error } = await supabase
      .from('attendance')
      .update({
        check_out: checkOutTime.toISOString(),
        check_out_latitude: latitude ? parseFloat(latitude) : null,
        check_out_longitude: longitude ? parseFloat(longitude) : null,
        check_out_address: address || null,
        check_out_photo: photo_url || null,
        working_hours: workingHours,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attendance.id)
      .select()
      .single();

    if (error) throw createError('Failed to save check-out', 500);

    res.json({
      success: true,
      message: `Check-out successful! Working hours: ${workingHours}h`,
      data,
    });
  } else {
    // Auto-create check-out record if check-in record wasn't created yet
    const { data: user } = await supabase
      .from('users')
      .select('branch_id')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('attendance')
      .insert({
        employee_id: userId,
        branch_id: user?.branch_id || null,
        date: today,
        check_out: checkOutTime.toISOString(),
        check_out_latitude: latitude ? parseFloat(latitude) : null,
        check_out_longitude: longitude ? parseFloat(longitude) : null,
        check_out_address: address || null,
        check_out_photo: photo_url || null,
        working_hours: 0,
        status: 'present',
      })
      .select()
      .single();

    if (error) throw createError('Failed to save check-out', 500);

    res.json({
      success: true,
      message: 'Check-out successful!',
      data,
    });
  }
});

/**
 * GET /api/attendance
 * Get attendance records with filters.
 */
export const getAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    employee_id, branch_id, date, from_date, to_date,
    status, page = '1', limit = '50'
  } = req.query as Record<string, string>;

  let query = supabase
    .from('attendance')
    .select('*', { count: 'exact' });

  // Scope by role
  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (req.user?.role === 'office_employee' || req.user?.role === 'field_employee') {
    query = query.eq('employee_id', req.user.id);
  }

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (branch_id) query = query.eq('branch_id', branch_id);
  if (date) query = query.eq('date', date);
  if (status) query = query.eq('status', status);
  if (from_date) query = query.gte('date', from_date);
  if (to_date) query = query.lte('date', to_date);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query = query.range(offset, offset + parseInt(limit) - 1).order('date', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw createError('Failed to fetch attendance', 500);

  // Enrich employee details reliably
  const employeeIds = [...new Set(data?.map(a => a.employee_id).filter(Boolean) || [])];
  const usersMap: Record<string, any> = {};

  if (employeeIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, employee_id, photo, role, branch_id')
      .in('id', employeeIds);

    users?.forEach(u => {
      usersMap[u.id] = u;
    });
  }

  const enrichedData = data?.map(rec => ({
    ...rec,
    employee: usersMap[rec.employee_id] || { name: 'Employee', employee_id: 'EMP' },
  }));

  res.json({
    success: true,
    data: enrichedData,
    meta: { total: count, page: parseInt(page), limit: parseInt(limit) },
  });
});

/**
 * GET /api/attendance/today
 * Get today's attendance summary.
 */
export const getTodayAttendance = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select('*')
    .eq('date', today);

  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query.order('check_in', { ascending: false });
  if (error) throw createError('Failed to fetch today attendance', 500);

  // Enrich employee details
  const employeeIds = [...new Set(data?.map(a => a.employee_id).filter(Boolean) || [])];
  const usersMap: Record<string, any> = {};

  if (employeeIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, employee_id, photo, role')
      .in('id', employeeIds);

    users?.forEach(u => {
      usersMap[u.id] = u;
    });
  }

  const enrichedRecords = data?.map(rec => ({
    ...rec,
    employee: usersMap[rec.employee_id] || { name: 'Employee', employee_id: 'EMP' },
  }));

  const summary = {
    present: data?.filter(a => a.status === 'present').length || 0,
    late: data?.filter(a => a.status === 'late').length || 0,
    half_day: data?.filter(a => a.status === 'half_day').length || 0,
    absent: data?.filter(a => a.status === 'absent').length || 0,
    on_leave: data?.filter(a => a.status === 'leave').length || 0,
    checked_in: data?.filter(a => a.check_in && !a.check_out).length || 0,
    checked_out: data?.filter(a => a.check_out).length || 0,
  };

  res.json({ success: true, data: { records: enrichedRecords, summary } });
});

/**
 * GET /api/attendance/stats
 * Monthly attendance statistics for dashboard charts.
 */
export const getAttendanceStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { month, year, branch_id } = req.query as Record<string, string>;
  const currentDate = new Date();
  const m = parseInt(month || String(currentDate.getMonth() + 1));
  const y = parseInt(year || String(currentDate.getFullYear()));

  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const toDate = new Date(y, m, 0).toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select('status, date, branch_id')
    .gte('date', fromDate)
    .lte('date', toDate);

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query;
  if (error) throw createError('Failed to fetch stats', 500);

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

  res.json({ success: true, data: { chartData, totals } });
});
