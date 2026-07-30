// src/services/settingsService.ts
// Settings, holidays, departments, designations, shifts, notifications, dashboard stats
// Replaces backend settingsController

import { supabase } from './supabase';

// ─── Company Settings ─────────────────────────────────────────

export async function getSettings() {
  const { data, error } = await supabase.from('company_settings').select('*').single();
  if (error) throw new Error('Failed to fetch settings');
  return data;
}

export async function updateSettings(updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('company_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw new Error('Failed to update settings');
  return data;
}

// ─── Holidays ─────────────────────────────────────────────────

export async function getHolidays(year?: string, branch_id?: string) {
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
  if (error) throw new Error('Failed to fetch holidays');
  return data || [];
}

export async function createHoliday(holidayData: {
  name: string;
  date: string;
  type: string;
  branch_id?: string;
  description?: string;
}) {
  const { name, date, type, branch_id, description } = holidayData;
  if (!name || !date || !type) throw new Error('Name, date, and type are required');

  const { data, error } = await supabase
    .from('holidays')
    .insert({ name, date, type, branch_id: branch_id || null, description: description || null })
    .select()
    .single();

  if (error) throw new Error('Failed to create holiday');
  return data;
}

export async function deleteHoliday(id: string) {
  const { error } = await supabase.from('holidays').delete().eq('id', id);
  if (error) throw new Error('Failed to delete holiday');
}

// ─── Departments ──────────────────────────────────────────────

export async function getDepartments(branch_id?: string) {
  let query = supabase.from('departments').select('*, branches(id, name)').order('name');
  if (branch_id) query = query.eq('branch_id', branch_id);
  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch departments');
  return data || [];
}

export async function createDepartment(name: string, branch_id?: string) {
  if (!name) throw new Error('Department name is required');
  const { data, error } = await supabase
    .from('departments')
    .insert({ name, branch_id: branch_id || null })
    .select()
    .single();
  if (error) throw new Error('Failed to create department');
  return data;
}

export async function deleteDepartment(id: string) {
  const { error } = await supabase.from('departments').delete().eq('id', id);
  if (error) throw new Error('Failed to delete department');
}

// ─── Designations ─────────────────────────────────────────────

export async function getDesignations() {
  const { data, error } = await supabase.from('designations').select('*').order('name');
  if (error) throw new Error('Failed to fetch designations');
  return data || [];
}

export async function createDesignation(name: string) {
  if (!name) throw new Error('Designation name is required');
  const { data, error } = await supabase.from('designations').insert({ name }).select().single();
  if (error) throw new Error('Failed to create designation');
  return data;
}

// ─── Shifts ───────────────────────────────────────────────────

export async function getShifts() {
  const { data, error } = await supabase.from('shifts').select('*').order('name');
  if (error) throw new Error('Failed to fetch shifts');
  return data || [];
}

// ─── Notifications ────────────────────────────────────────────

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error('Failed to fetch notifications');
  return data || [];
}

export async function markAllNotificationsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
}

// ─── Dashboard Stats ──────────────────────────────────────────

export async function getDashboardStats() {
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

  return {
    total_employees: totalEmployees || 0,
    total_branches: totalBranches || 0,
    today_present: todayAttendance?.filter(a => a.status === 'present').length || 0,
    today_late: todayAttendance?.filter(a => a.status === 'late').length || 0,
    today_absent: todayAttendance?.filter(a => a.status === 'absent').length || 0,
    today_on_leave: todayAttendance?.filter(a => a.status === 'leave').length || 0,
    today_half_day: todayAttendance?.filter(a => a.status === 'half_day').length || 0,
  };
}
