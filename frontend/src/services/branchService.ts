// src/services/branchService.ts
// Branch CRUD — replaces backend branchController

import { supabase } from './supabase';
import type { Branch } from '../types';

/**
 * GET /api/branches → direct Supabase
 */
export async function getBranches(status?: string): Promise<Branch[]> {
  let query = supabase
    .from('branches')
    .select('id, name, code, address, latitude, longitude, radius, status, manager_id, created_at')
    .order('name', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch branches: ${error.message}`);

  // Enrich with manager data
  const managerIds = Array.from(new Set((data || []).map(b => b.manager_id).filter(Boolean)));
  let managerMap: Record<string, unknown> = {};

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from('users')
      .select('id, name, email, photo')
      .in('id', managerIds as string[]);
    if (managers) {
      managers.forEach(m => { managerMap[m.id] = m; });
    }
  }

  return (data || []).map(b => ({
    ...b,
    manager: b.manager_id ? managerMap[b.manager_id] || null : null,
  })) as unknown as Branch[];
}

/**
 * GET /api/branches/:id → direct Supabase
 */
export async function getBranch(id: string): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, code, address, latitude, longitude, radius, status, manager_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) throw new Error('Branch not found');

  let manager = null;
  if (data.manager_id) {
    const { data: m } = await supabase.from('users').select('id, name, email, photo, phone').eq('id', data.manager_id).single();
    manager = m || null;
  }

  const { count: employeeCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', id)
    .eq('status', 'active');

  return { ...data, manager, employee_count: employeeCount || 0 } as unknown as Branch;
}

export interface CreateBranchData {
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  radius: number;
  manager_id?: string;
}

/**
 * POST /api/branches → direct Supabase
 */
export async function createBranch(branchData: CreateBranchData): Promise<Branch> {
  const { name, code, address, latitude, longitude, radius, manager_id } = branchData;

  if (!name || !code || latitude === undefined || longitude === undefined || !radius) {
    throw new Error('Name, code, location address, and radius are required');
  }

  const { data: existing } = await supabase
    .from('branches')
    .select('id')
    .eq('code', code.toUpperCase().trim())
    .maybeSingle();
  if (existing) throw new Error('Branch code already exists');

  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      address: address?.trim() || '',
      latitude,
      longitude,
      radius,
      manager_id: manager_id || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create branch: ' + error.message);
  return data as unknown as Branch;
}

export interface UpdateBranchData {
  name?: string;
  code?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  manager_id?: string | null;
}

/**
 * PUT /api/branches/:id → direct Supabase
 */
export async function updateBranch(id: string, updates: UpdateBranchData): Promise<Branch> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name) dbUpdates.name = updates.name.trim();
  if (updates.code) dbUpdates.code = updates.code.toUpperCase().trim();
  if (updates.address !== undefined) dbUpdates.address = updates.address?.trim();
  if (updates.latitude !== undefined) dbUpdates.latitude = updates.latitude;
  if (updates.longitude !== undefined) dbUpdates.longitude = updates.longitude;
  if (updates.radius !== undefined) dbUpdates.radius = updates.radius;
  if (updates.manager_id !== undefined) dbUpdates.manager_id = updates.manager_id || null;

  const { data, error } = await supabase
    .from('branches')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw new Error('Failed to update branch');
  return data as unknown as Branch;
}

/**
 * PATCH /api/branches/:id/status → direct Supabase
 */
export async function updateBranchStatus(id: string, status: 'active' | 'inactive'): Promise<Branch> {
  const { data, error } = await supabase
    .from('branches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, status')
    .single();

  if (error || !data) throw new Error('Failed to update branch status');
  return data as unknown as Branch;
}

/**
 * DELETE /api/branches/:id → direct Supabase
 */
export async function deleteBranch(id: string): Promise<void> {
  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', id)
    .eq('status', 'active');

  if (count && count > 0) {
    throw new Error('Cannot delete branch with active employees. Reassign employees first.');
  }

  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw new Error('Failed to delete branch');
}
