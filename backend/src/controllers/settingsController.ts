// src/controllers/settingsController.ts
// Settings, notifications, and dashboard stats controller

import { Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';

/** GET /api/settings */
export const getSettings = asyncHandler(async (req: any, res: Response) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw createError('Failed to fetch settings', 500);
  }

  res.json({ success: true, data: data || {} });
});

/** PUT /api/settings */
export const updateSettings = asyncHandler(async (req: any, res: Response) => {
  const {
    company_name, work_start_time, work_end_time, late_threshold,
    half_day_threshold, default_geofence_radius, leave_approval_chain,
    overtime_enabled, overtime_rate, currency, timezone
  } = req.body;

  const { data, error } = await supabase
    .from('settings')
    .upsert({
      id: 1, // Single settings row
      company_name,
      work_start_time,
      work_end_time,
      late_threshold,
      half_day_threshold,
      default_geofence_radius,
      leave_approval_chain,
      overtime_enabled,
      overtime_rate,
      currency,
      timezone,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw createError('Failed to update settings', 500);

  res.json({ success: true, message: 'Settings updated successfully', data });
});

/** GET /api/notifications */
export const getNotifications = asyncHandler(async (req: any, res: Response) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw createError('Failed to fetch notifications', 500);

  res.json({ success: true, data });
});

/** PUT /api/notifications/read */
export const markAllNotificationsRead = asyncHandler(async (req: any, res: Response) => {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', req.user.id)
    .eq('read', false);

  res.json({ success: true, message: 'All notifications marked as read' });
});

/** GET /api/dashboard/stats */
export const getDashboardStats = asyncHandler(async (req: any, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalEmployees },
    { count: totalBranches },
    { data: todayAttendance },
    { data: activeLeaves },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('role', 'super_admin'),
    supabase.from('branches').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('attendance').select('status').eq('date', today),
    supabase.from('leaves').select('id').lte('from_date', today).gte('to_date', today).eq('status', 'approved'),
  ]);

  const attendanceOnLeave = todayAttendance?.filter(a => a.status === 'leave').length || 0;
  const leaveTableOnLeave = activeLeaves?.length || 0;

  const summary = {
    total_employees: totalEmployees || 0,
    total_branches: totalBranches || 0,
    today_present: todayAttendance?.filter(a => a.status === 'present').length || 0,
    today_late: todayAttendance?.filter(a => a.status === 'late').length || 0,
    today_absent: todayAttendance?.filter(a => a.status === 'absent').length || 0,
    today_on_leave: Math.max(attendanceOnLeave, leaveTableOnLeave),
    today_half_day: todayAttendance?.filter(a => a.status === 'half_day').length || 0,
  };

  res.json({ success: true, data: summary });
});

// ─── Holidays ─────────────────────────────────────────────────

/** GET /api/holidays */
export const getHolidays = asyncHandler(async (_req: any, res: Response) => {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw createError('Failed to fetch holidays', 500);
  res.json({ success: true, data: data || [] });
});

/** POST /api/holidays */
export const createHoliday = asyncHandler(async (req: any, res: Response) => {
  const { name, date, type, branch_id, description } = req.body;
  if (!name || !date) throw createError('Name and date are required', 400);

  const { data, error } = await supabase
    .from('holidays')
    .insert({ name, date, type: type || 'national', branch_id: branch_id || null, description: description || null })
    .select()
    .single();

  if (error) throw createError('Failed to create holiday', 500);
  res.status(201).json({ success: true, message: 'Holiday created', data });
});

/** DELETE /api/holidays/:id */
export const deleteHoliday = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw createError('Failed to delete holiday', 500);
  res.json({ success: true, message: 'Holiday deleted' });
});

// ─── Departments ──────────────────────────────────────────────

/** GET /api/departments */
export const getDepartments = asyncHandler(async (_req: any, res: Response) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*, branches(id, name)')
    .order('name', { ascending: true });

  if (error) throw createError('Failed to fetch departments', 500);
  res.json({ success: true, data: data || [] });
});

/** POST /api/departments */
export const createDepartment = asyncHandler(async (req: any, res: Response) => {
  const { name, branch_id } = req.body;
  if (!name) throw createError('Department name is required', 400);

  const { data, error } = await supabase
    .from('departments')
    .insert({ name, branch_id: branch_id || null })
    .select()
    .single();

  if (error) throw createError('Failed to create department', 500);
  res.status(201).json({ success: true, message: 'Department created', data });
});

/** DELETE /api/departments/:id */
export const deleteDepartment = asyncHandler(async (req: any, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw createError('Failed to delete department', 500);
  res.json({ success: true, message: 'Department deleted' });
});

// ─── Designations ─────────────────────────────────────────────

/** GET /api/designations */
export const getDesignations = asyncHandler(async (_req: any, res: Response) => {
  const { data, error } = await supabase
    .from('designations')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw createError('Failed to fetch designations', 500);
  res.json({ success: true, data: data || [] });
});

/** POST /api/designations */
export const createDesignation = asyncHandler(async (req: any, res: Response) => {
  const { name } = req.body;
  if (!name) throw createError('Designation name is required', 400);

  const { data, error } = await supabase
    .from('designations')
    .insert({ name })
    .select()
    .single();

  if (error) throw createError('Failed to create designation', 500);
  res.status(201).json({ success: true, message: 'Designation created', data });
});

// ─── Shifts ───────────────────────────────────────────────────

/** GET /api/shifts */
export const getShifts = asyncHandler(async (_req: any, res: Response) => {
  const { data, error } = await supabase
    .from('shifts')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw createError('Failed to fetch shifts', 500);
  res.json({ success: true, data: data || [] });
});

