// src/controllers/settingsController.ts
// Company settings, holidays, departments, and designations

import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';

/** GET /api/settings */
export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('company_settings').select('*').single();
  if (error) throw createError('Failed to fetch settings', 500);
  res.json({ success: true, data });
});

/** PUT /api/settings */
export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('company_settings').update(updates).select().single();
  if (error) throw createError('Failed to update settings', 500);
  res.json({ success: true, message: 'Settings updated', data });
});

/** GET /api/holidays */
export const getHolidays = asyncHandler(async (req: Request, res: Response) => {
  const { year, branch_id } = req.query as Record<string, string>;
  const y = year || new Date().getFullYear().toString();

  let query = supabase
    .from('holidays')
    .select('*')
    .gte('date', `${y}-01-01`)
    .lte('date', `${y}-12-31`)
    .order('date', { ascending: true });

  if (branch_id) {
    query = query.or(`branch_id.is.null,branch_id.eq.${branch_id}`);
  }

  const { data, error } = await query;
  if (error) throw createError('Failed to fetch holidays', 500);
  res.json({ success: true, data });
});

/** POST /api/holidays */
export const createHoliday = asyncHandler(async (req: Request, res: Response) => {
  const { name, date, type, branch_id, description } = req.body;
  if (!name || !date || !type) throw createError('Name, date, and type are required', 400);

  const { data, error } = await supabase
    .from('holidays')
    .insert({ name, date, type, branch_id: branch_id || null, description: description || null })
    .select()
    .single();

  if (error) throw createError('Failed to create holiday', 500);
  res.status(201).json({ success: true, message: 'Holiday created', data });
});

/** DELETE /api/holidays/:id */
export const deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw createError('Failed to delete holiday', 500);
  res.json({ success: true, message: 'Holiday deleted' });
});

/** GET /api/departments */
export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const { branch_id } = req.query as Record<string, string>;
  let query = supabase.from('departments').select('*, branches(id, name)').order('name');
  if (branch_id) query = query.eq('branch_id', branch_id);
  const { data, error } = await query;
  if (error) throw createError('Failed to fetch departments', 500);
  res.json({ success: true, data });
});

/** POST /api/departments */
export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { name, branch_id } = req.body;
  if (!name) throw createError('Department name is required', 400);
  const { data, error } = await supabase.from('departments').insert({ name, branch_id: branch_id || null }).select().single();
  if (error) throw createError('Failed to create department', 500);
  res.status(201).json({ success: true, data });
});

/** DELETE /api/departments/:id */
export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw createError('Failed to delete department', 500);
  res.json({ success: true, message: 'Department deleted' });
});

/** GET /api/designations */
export const getDesignations = asyncHandler(async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('designations').select('*').order('name');
  if (error) throw createError('Failed to fetch designations', 500);
  res.json({ success: true, data });
});

/** POST /api/designations */
export const createDesignation = asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) throw createError('Designation name is required', 400);
  const { data, error } = await supabase.from('designations').insert({ name }).select().single();
  if (error) throw createError('Failed to create designation', 500);
  res.status(201).json({ success: true, data });
});

/** GET /api/shifts */
export const getShifts = asyncHandler(async (_req: Request, res: Response) => {
  const { data, error } = await supabase.from('shifts').select('*').order('name');
  if (error) throw createError('Failed to fetch shifts', 500);
  res.json({ success: true, data });
});

/** GET /api/notifications */
export const getNotifications = asyncHandler(async (req: any, res: Response) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw createError('Failed to fetch notifications', 500);
  res.json({ success: true, data });
});

/** PATCH /api/notifications/read-all */
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
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active').neq('role', 'super_admin'),
    supabase.from('branches').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('attendance').select('status').eq('date', today),
  ]);

  const summary = {
    total_employees: totalEmployees || 0,
    total_branches: totalBranches || 0,
    today_present: todayAttendance?.filter(a => a.status === 'present').length || 0,
    today_late: todayAttendance?.filter(a => a.status === 'late').length || 0,
    today_absent: todayAttendance?.filter(a => a.status === 'absent').length || 0,
    today_on_leave: todayAttendance?.filter(a => a.status === 'leave').length || 0,
    today_half_day: todayAttendance?.filter(a => a.status === 'half_day').length || 0,
  };

  res.json({ success: true, data: summary });
});
