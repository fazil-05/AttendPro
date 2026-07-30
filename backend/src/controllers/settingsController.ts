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
