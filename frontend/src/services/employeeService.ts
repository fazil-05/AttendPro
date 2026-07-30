// src/services/employeeService.ts
// Employee CRUD — replaces backend employeeController
// Calls Supabase directly from the browser

import { supabase } from './supabase';
import type { User } from '../types';
import bcrypt from 'bcryptjs';

/** Generate next sequential employee ID e.g. EMP0001, EMP0002 */
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

    const last = data[0].employee_id as string;
    const num = parseInt(last.replace(/[^0-9]/g, ''), 10) || 0;
    return `EMP${String(num + 1).padStart(4, '0')}`;
  } catch {
    return `EMP${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

export interface EmployeeFilters {
  search?: string;
  branch_id?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * GET /api/employees → direct Supabase
 */
export async function getEmployees(
  filters: EmployeeFilters = {},
  currentUser?: { role: string; branch_id?: string }
) {
  const { search, branch_id, role, status, page = 1, limit = 20 } = filters;

  let query = supabase
    .from('users')
    .select('id, name, email, role, employee_id, status, photo, phone, address, branch_id, department_id, created_at', { count: 'exact' });

  // Branch managers can only see their branch employees
  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (role) query = query.eq('role', role);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('name', `%${search}%`);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data: usersData, error, count } = await query;
  if (error) throw new Error(`Failed to fetch employees: ${error.message}`);

  // Enrich with branch names
  const branchIds = Array.from(new Set((usersData || []).map(u => u.branch_id).filter(Boolean)));
  let branchMap: Record<string, unknown> = {};

  if (branchIds.length > 0) {
    const { data: branches } = await supabase
      .from('branches')
      .select('id, name, code')
      .in('id', branchIds as string[]);
    if (branches) {
      branches.forEach(b => { branchMap[b.id] = b; });
    }
  }

  const enrichedData = (usersData || []).map(u => ({
    ...u,
    branches: u.branch_id ? branchMap[u.branch_id] || null : null,
  }));

  return {
    data: enrichedData as User[],
    meta: { total: count || enrichedData.length, page, limit },
  };
}

/**
 * GET /api/employees/:id → direct Supabase
 */
export async function getEmployee(id: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, employee_id, status, photo, phone, address, branch_id, department_id, designation_id, shift_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Employee not found');

  let branch = null;
  if (data.branch_id) {
    const { data: b } = await supabase.from('branches').select('id, name, code, address').eq('id', data.branch_id).single();
    branch = b || null;
  }

  return { ...data, branches: branch } as unknown as User;
}

export interface CreateEmployeeData {
  name: string;
  email: string;
  password: string;
  role: string;
  branch_id?: string;
  department_id?: string;
  designation_id?: string;
  shift_id?: string;
  phone?: string;
  address?: string;
}

/**
 * POST /api/employees → direct Supabase
 */
export async function createEmployee(employeeData: CreateEmployeeData): Promise<User> {
  const { name, email, password, role, branch_id, department_id, designation_id, shift_id, phone, address } = employeeData;

  if (!name || !email || !password || !role) {
    throw new Error('Name, email, password, and role are required');
  }

  // Check email uniqueness
  const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
  if (existing) throw new Error('Email already exists');

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

  if (error) throw new Error('Failed to create employee: ' + error.message);
  return data as User;
}

export interface UpdateEmployeeData {
  name?: string;
  email?: string;
  role?: string;
  branch_id?: string | null;
  department_id?: string | null;
  designation_id?: string | null;
  shift_id?: string | null;
  phone?: string | null;
  address?: string | null;
  password?: string;
}

/**
 * PUT /api/employees/:id → direct Supabase
 */
export async function updateEmployee(id: string, updates: UpdateEmployeeData): Promise<User> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name) dbUpdates.name = updates.name.trim();
  if (updates.email) dbUpdates.email = updates.email.toLowerCase().trim();
  if (updates.role) dbUpdates.role = updates.role;
  if (updates.branch_id !== undefined) dbUpdates.branch_id = updates.branch_id || null;
  if (updates.department_id !== undefined) dbUpdates.department_id = updates.department_id || null;
  if (updates.designation_id !== undefined) dbUpdates.designation_id = updates.designation_id || null;
  if (updates.shift_id !== undefined) dbUpdates.shift_id = updates.shift_id || null;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone || null;
  if (updates.address !== undefined) dbUpdates.address = updates.address || null;
  if (updates.password && updates.password.length >= 6) {
    dbUpdates.password_hash = await bcrypt.hash(updates.password, 12);
  }

  const { data, error } = await supabase
    .from('users')
    .update(dbUpdates)
    .eq('id', id)
    .select('id, name, email, role, employee_id, status')
    .single();

  if (error || !data) throw new Error('Failed to update employee');
  return data as User;
}

/**
 * PATCH /api/employees/:id/status → direct Supabase
 */
export async function updateEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, status')
    .single();

  if (error || !data) throw new Error('Failed to update status');
  return data as unknown as User;
}

/**
 * DELETE /api/employees/:id → direct Supabase
 */
export async function deleteEmployee(id: string, currentUserId: string): Promise<void> {
  if (currentUserId === id) {
    throw new Error('You cannot delete your own super admin account');
  }

  // Nullify manager references
  await supabase.from('branches').update({ manager_id: null }).eq('manager_id', id);
  await supabase.from('departments').update({ manager_id: null }).eq('manager_id', id);

  const { error } = await supabase.from('users').delete().eq('id', id);
  if (error) throw new Error('Failed to delete employee: ' + error.message);
}

/**
 * GET /api/employees/stats → direct Supabase
 */
export async function getEmployeeStats(currentUser?: { role: string; branch_id?: string }) {
  let query = supabase.from('users').select('role, status, branch_id');

  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  }

  const { data, error } = await query;
  if (error) throw new Error('Failed to fetch stats');

  return {
    total: data?.length || 0,
    active: data?.filter(u => u.status === 'active').length || 0,
    inactive: data?.filter(u => u.status === 'inactive').length || 0,
    office_employees: data?.filter(u => u.role === 'office_employee').length || 0,
    field_employees: data?.filter(u => u.role === 'field_employee').length || 0,
    managers: data?.filter(u => u.role === 'branch_manager').length || 0,
  };
}
