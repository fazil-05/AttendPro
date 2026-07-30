// src/controllers/leaveController.ts
// Leave application and approval controller

import { Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * GET /api/leaves
 * Get leave requests (filtered by role).
 */
export const getLeaves = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, employee_id, from_date, to_date, page = '1', limit = '50' } = req.query as Record<string, string>;

  let query = supabase
    .from('leaves')
    .select('*', { count: 'exact' });

  // Employees see only their own leaves
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

  // Hydrate user/employee info reliably
  const employeeIds = [...new Set(data?.map(l => l.employee_id).filter(Boolean) || [])];
  const usersMap: Record<string, any> = {};

  if (employeeIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, employee_id, photo, role, branch_id')
      .in('id', employeeIds);

    users?.forEach(u => {
      usersMap[u.id] = u;
    });
  }

  const enrichedData = data?.map(leave => ({
    ...leave,
    employee: usersMap[leave.employee_id] || { name: 'Employee', employee_id: 'EMP' },
    user: usersMap[leave.employee_id] || { name: 'Employee', employee_id: 'EMP' },
  }));

  res.json({ success: true, data: enrichedData, meta: { total: count, page: parseInt(page), limit: parseInt(limit) } });
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

  // Insert leave record into database
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
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Leave creation error:', error);
    throw createError('Failed to apply leave', 500);
  }

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
    throw createError('Status must be approved or rejected', 400);
  }

  const updateData: any = {
    status,
    approved_by: req.user!.id,
    updated_at: new Date().toISOString(),
  };

  if (rejection_reason) {
    updateData.rejection_reason = rejection_reason;
  }

  const { data, error } = await supabase
    .from('leaves')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw createError('Failed to update leave status', 500);

  res.json({ success: true, message: `Leave request ${status} successfully`, data });
});

/**
 * DELETE /api/leaves/:id
 * Cancel or delete a leave request.
 */
export const deleteLeave = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('leaves')
    .delete()
    .eq('id', id);

  if (error) throw createError('Failed to delete leave request', 500);

  res.json({ success: true, message: 'Leave request deleted successfully' });
});
