// src/controllers/employeeController.ts
// Employee (User) CRUD controller with resilient Supabase queries

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Generate next sequential employee ID e.g. EMP0001, EMP0002
 */
async function generateEmployeeId(): Promise<string> {
  try {
    const { data } = await supabase
      .from('users')
      .select('employee_id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!data || data.length === 0 || !data[0]?.employee_id) {
      return 'EMP0001';
    }

    const last = data[0].employee_id;
    const num = parseInt(last.replace(/[^0-9]/g, ''), 10) || 0;
    return `EMP${String(num + 1).padStart(4, '0')}`;
  } catch {
    return `EMP${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

/**
 * GET /api/employees
 * Get all employees (filtered by branch for managers).
 */
export const getEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { search, branch_id, role, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  let query = supabase
    .from('users')
    .select('id, name, email, role, employee_id, status, photo, phone, address, branch_id, department_id, created_at', { count: 'exact' });

  // Branch managers can only see their branch employees
  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query = query.range(offset, offset + parseInt(limit) - 1).order('created_at', { ascending: false });

  const { data: usersData, error, count } = await query;
  if (error) {
    console.error('getEmployees error:', error);
    throw createError(`Failed to fetch employees: ${error.message}`, 500);
  }

  // Fetch branches separately for safety
  const branchIds = Array.from(new Set((usersData || []).map(u => u.branch_id).filter(Boolean)));
  let branchMap: Record<string, any> = {};

  if (branchIds.length > 0) {
    const { data: branches } = await supabase.from('branches').select('id, name, code').in('id', branchIds);
    if (branches) {
      branches.forEach(b => { branchMap[b.id] = b; });
    }
  }

  const enrichedData = (usersData || []).map(u => ({
    ...u,
    branches: u.branch_id ? branchMap[u.branch_id] || null : null,
  }));

  res.json({
    success: true,
    data: enrichedData,
    meta: { total: count || enrichedData.length, page: parseInt(page), limit: parseInt(limit) },
  });
});

/**
 * GET /api/employees/:id
 * Get a single employee by ID.
 */
export const getEmployee = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, employee_id, status, photo, phone, address, branch_id, department_id, designation_id, shift_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) throw createError('Employee not found', 404);

  let branch = null;
  if (data.branch_id) {
    const { data: b } = await supabase.from('branches').select('id, name, code, address').eq('id', data.branch_id).single();
    branch = b || null;
  }

  res.json({ success: true, data: { ...data, branches: branch } });
});

/**
 * POST /api/employees
 * Create a new employee.
 */
export const createEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    name, email, password, role, branch_id, department_id,
    designation_id, shift_id, phone, address,
  } = req.body;

  if (!name || !email || !password || !role) {
    throw createError('Name, email, password, and role are required', 400);
  }

  // Check email uniqueness
  const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
  if (existing) throw createError('Email already exists', 409);

  const password_hash = await bcrypt.hash(password, 12);
  const employee_id = await generateEmployeeId();

  const { data, error } = await supabase
    .from('users')
    .insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password_hash,
      role,
      employee_id,
      branch_id: branch_id || null,
      department_id: department_id || null,
      designation_id: designation_id || null,
      shift_id: shift_id || null,
      phone: phone || null,
      address: address || null,
      status: 'active',
    })
    .select('id, name, email, role, employee_id, status, branch_id')
    .single();

  if (error) {
    console.error('createEmployee insert error:', error);
    throw createError('Failed to create employee: ' + error.message, 500);
  }

  res.status(201).json({ success: true, message: 'Employee created successfully', data });
});

/**
 * PUT /api/employees/:id
 * Update employee details.
 */
export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name, email, role, branch_id, department_id,
    designation_id, shift_id, phone, address, password,
  } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name) updates.name = name.trim();
  if (email) updates.email = email.toLowerCase().trim();
  if (role) updates.role = role;
  if (branch_id !== undefined) updates.branch_id = branch_id || null;
  if (department_id !== undefined) updates.department_id = department_id || null;
  if (designation_id !== undefined) updates.designation_id = designation_id || null;
  if (shift_id !== undefined) updates.shift_id = shift_id || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (address !== undefined) updates.address = address || null;
  if (password && password.length >= 6) {
    updates.password_hash = await bcrypt.hash(password, 12);
  }

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select('id, name, email, role, employee_id, status')
    .single();

  if (error || !data) throw createError('Failed to update employee', 500);

  res.json({ success: true, message: 'Employee updated successfully', data });
});

/**
 * PATCH /api/employees/:id/status
 * Activate or deactivate an employee.
 */
export const updateEmployeeStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    throw createError("Status must be 'active' or 'inactive'", 400);
  }

  const { data, error } = await supabase
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, status')
    .single();

  if (error || !data) throw createError('Failed to update status', 500);

  res.json({ success: true, message: `Employee ${status === 'active' ? 'activated' : 'deactivated'}`, data });
});

/**
 * DELETE /api/employees/:id
 * Delete an employee completely from the database.
 */
export const deleteEmployee = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (req.user?.id === id) {
    throw createError('You cannot delete your own super admin account', 400);
  }

  // Nullify manager references if this user is a manager
  await supabase.from('branches').update({ manager_id: null }).eq('manager_id', id);
  await supabase.from('departments').update({ manager_id: null }).eq('manager_id', id);

  // Hard delete from users table
  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw createError('Failed to delete employee: ' + error.message, 500);

  res.json({ success: true, message: 'Employee deleted successfully' });
});

/**
 * GET /api/employees/stats
 * Get employee statistics for dashboard.
 */
export const getEmployeeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  let query = supabase.from('users').select('role, status, branch_id');

  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query;
  if (error) throw createError('Failed to fetch stats', 500);

  const stats = {
    total: data?.length || 0,
    active: data?.filter(u => u.status === 'active').length || 0,
    inactive: data?.filter(u => u.status === 'inactive').length || 0,
    office_employees: data?.filter(u => u.role === 'office_employee').length || 0,
    field_employees: data?.filter(u => u.role === 'field_employee').length || 0,
    managers: data?.filter(u => u.role === 'branch_manager').length || 0,
  };

  res.json({ success: true, data: stats });
});
