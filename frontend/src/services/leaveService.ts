// src/services/leaveService.ts
// Leave management — replaces backend leaveController

import { supabase } from './supabase';
import type { Leave } from '../types';

export interface LeaveFilters {
  status?: string;
  employee_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

/**
 * GET /api/leaves → direct Supabase
 */
export async function getLeaves(
  filters: LeaveFilters = {},
  currentUser?: { role: string; id: string; branch_id?: string }
) {
  const { status, employee_id, from_date, to_date, page = 1, limit = 20 } = filters;

  let query = supabase
    .from('leaves')
    .select(`
      *,
      employee:users!leaves_employee_id_fkey(id, name, employee_id, photo,
        branches(id, name), departments(id, name)),
      approver:users!leaves_approved_by_fkey(id, name)
    `, { count: 'exact' });

  // Scope by role
  if (currentUser?.role === 'office_employee' || currentUser?.role === 'field_employee') {
    query = query.eq('employee_id', currentUser.id);
  } else if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    const { data: branchUsers } = await supabase
      .from('users')
      .select('id')
      .eq('branch_id', currentUser.branch_id);
    const ids = branchUsers?.map(u => u.id) || [];
    if (ids.length > 0) {
      query = query.in('employee_id', ids);
    }
  }

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (status) query = query.eq('status', status);
  if (from_date) query = query.gte('from_date', from_date);
  if (to_date) query = query.lte('to_date', to_date);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error('Failed to fetch leaves');

  return {
    data: (data || []) as unknown as Leave[],
    meta: { total: count || 0, page, limit },
  };
}

export interface ApplyLeaveData {
  leave_type: string;
  from_date: string;
  to_date: string;
  reason: string;
}

/**
 * POST /api/leaves → direct Supabase
 */
export async function applyLeave(employeeId: string, leaveData: ApplyLeaveData): Promise<Leave> {
  const { leave_type, from_date, to_date, reason } = leaveData;

  if (!leave_type || !from_date || !to_date || !reason) {
    throw new Error('Leave type, dates, and reason are required');
  }

  const from = new Date(from_date);
  const to = new Date(to_date);
  if (from > to) throw new Error('From date cannot be after to date');

  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check for overlapping leaves
  const { data: overlap } = await supabase
    .from('leaves')
    .select('id')
    .eq('employee_id', employeeId)
    .neq('status', 'rejected')
    .or(`from_date.lte.${to_date},to_date.gte.${from_date}`)
    .maybeSingle();

  if (overlap) throw new Error('You already have a leave request in this date range.');

  const { data, error } = await supabase
    .from('leaves')
    .insert({
      employee_id: employeeId,
      leave_type,
      from_date,
      to_date,
      total_days: totalDays,
      reason,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to apply leave');
  return data as unknown as Leave;
}

/**
 * PATCH /api/leaves/:id/status → direct Supabase
 * NOTE: Email notification is stubbed — wire up Supabase Edge Function for production.
 */
export async function updateLeaveStatus(
  id: string,
  status: 'approved' | 'rejected',
  approverId: string,
  rejection_reason?: string
): Promise<Leave> {
  if (!['approved', 'rejected'].includes(status)) {
    throw new Error("Status must be 'approved' or 'rejected'");
  }

  const { data: leave } = await supabase
    .from('leaves')
    .select('*, employee:users!leaves_employee_id_fkey(name, email)')
    .eq('id', id)
    .single();

  if (!leave) throw new Error('Leave request not found');
  if (leave.status !== 'pending') throw new Error('Leave request already processed');

  const { data, error } = await supabase
    .from('leaves')
    .update({
      status,
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      rejection_reason: rejection_reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Failed to update leave status');

  // TODO: Send email notification via Supabase Edge Function
  console.log('[DEV] Leave status email notification stubbed for production Edge Function.');

  return data as unknown as Leave;
}

/**
 * DELETE /api/leaves/:id → direct Supabase (cancel pending leave)
 */
export async function cancelLeave(id: string, currentUserId: string): Promise<void> {
  const { data: leave } = await supabase
    .from('leaves')
    .select('employee_id, status')
    .eq('id', id)
    .single();

  if (!leave) throw new Error('Leave not found');
  if (leave.employee_id !== currentUserId) throw new Error('Unauthorized');
  if (leave.status !== 'pending') throw new Error('Cannot cancel a processed leave request');

  await supabase.from('leaves').delete().eq('id', id);
}
