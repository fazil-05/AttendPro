// src/controllers/leaveController.ts
// Leave application and approval controller

import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { sendLeaveStatusEmail } from '../services/email';

/**
 * GET /api/leaves
 * Get leave requests (filtered by role).
 */
export const getLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, employee_id, from_date, to_date, page = '1', limit = '20' } = req.query as Record<string, string>;

  let query = supabase
    .from('leaves')
    .select(`
      *,
      employee:users!leaves_employee_id_fkey(id, name, employee_id, photo,
        branches(id, name), departments(id, name)),
      approver:users!leaves_approved_by_fkey(id, name)
    `, { count: 'exact' });

  // Employees see only their own
  if (req.user?.role === 'office_employee' || req.user?.role === 'field_employee') {
    query = query.eq('employee_id', req.user.id);
  } else if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    // Get employee IDs in this branch
    const { data: branchUsers } = await supabase
      .from('users')
      .select('id')
      .eq('branch_id', req.user.branch_id);
    const ids = branchUsers?.map(u => u.id) || [];
    query = query.in('employee_id', ids);
  }

  if (employee_id) query = query.eq('employee_id', employee_id);
  if (status) query = query.eq('status', status);
  if (from_date) query = query.gte('from_date', from_date);
  if (to_date) query = query.lte('to_date', to_date);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query = query.range(offset, offset + parseInt(limit) - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw createError('Failed to fetch leaves', 500);

  res.json({ success: true, data, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
});

/**
 * POST /api/leaves
 * Apply for leave.
 */
export const applyLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { leave_type, from_date, to_date, reason } = req.body;
  const employeeId = req.user!.id;

  if (!leave_type || !from_date || !to_date || !reason) {
    throw createError('Leave type, dates, and reason are required', 400);
  }

  const from = new Date(from_date);
  const to = new Date(to_date);

  if (from > to) throw createError('From date cannot be after to date', 400);

  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Check for overlapping leaves
  const { data: overlap } = await supabase
    .from('leaves')
    .select('id')
    .eq('employee_id', employeeId)
    .neq('status', 'rejected')
    .or(`from_date.lte.${to_date},to_date.gte.${from_date}`)
    .single();

  if (overlap) throw createError('You already have a leave request in this date range.', 400);

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

  if (error) throw createError('Failed to apply leave', 500);

  res.status(201).json({ success: true, message: 'Leave application submitted successfully', data });
});

/**
 * PATCH /api/leaves/:id/status
 * Approve or reject a leave request.
 */
export const updateLeaveStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejection_reason } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    throw createError("Status must be 'approved' or 'rejected'", 400);
  }

  const { data: leave } = await supabase
    .from('leaves')
    .select(`*, employee:users!leaves_employee_id_fkey(name, email)`)
    .eq('id', id)
    .single();

  if (!leave) throw createError('Leave request not found', 404);
  if (leave.status !== 'pending') throw createError('Leave request already processed', 400);

  const { data, error } = await supabase
    .from('leaves')
    .update({
      status,
      approved_by: req.user!.id,
      approved_at: new Date().toISOString(),
      rejection_reason: rejection_reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw createError('Failed to update leave status', 500);

  // Send email notification
  if (leave.employee) {
    const emp = leave.employee as { name: string; email: string };
    await sendLeaveStatusEmail(
      emp.email,
      emp.name,
      leave.leave_type,
      status,
      leave.from_date,
      leave.to_date,
      rejection_reason
    );
  }

  res.json({ success: true, message: `Leave ${status} successfully`, data });
});

/**
 * DELETE /api/leaves/:id
 * Cancel a pending leave request.
 */
export const cancelLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { data: leave } = await supabase.from('leaves').select('employee_id, status').eq('id', id).single();
  if (!leave) throw createError('Leave not found', 404);
  if (leave.employee_id !== req.user!.id) throw createError('Unauthorized', 403);
  if (leave.status !== 'pending') throw createError('Cannot cancel a processed leave request', 400);

  await supabase.from('leaves').delete().eq('id', id);

  res.json({ success: true, message: 'Leave request cancelled' });
});
