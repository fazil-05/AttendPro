// src/controllers/branchController.ts
// Branch CRUD controller with resilient queries

import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';

/**
 * GET /api/branches
 * Get all branches.
 */
export const getBranches = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query as Record<string, string>;

  let query = supabase
    .from('branches')
    .select('id, name, code, address, latitude, longitude, radius, status, manager_id, created_at')
    .order('name', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) {
    console.error('getBranches error:', error);
    throw createError(`Failed to fetch branches: ${error.message}`, 500);
  }

  // Fetch managers for branches if manager_id exists
  const managerIds = Array.from(new Set((data || []).map(b => b.manager_id).filter(Boolean)));
  let managerMap: Record<string, any> = {};

  if (managerIds.length > 0) {
    const { data: managers } = await supabase.from('users').select('id, name, email, photo').in('id', managerIds);
    if (managers) {
      managers.forEach(m => { managerMap[m.id] = m; });
    }
  }

  const enrichedData = (data || []).map(b => ({
    ...b,
    manager: b.manager_id ? managerMap[b.manager_id] || null : null,
  }));

  res.json({ success: true, data: enrichedData });
});

/**
 * GET /api/branches/:id
 * Get a single branch with employees and stats.
 */
export const getBranch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('branches')
    .select('id, name, code, address, latitude, longitude, radius, status, manager_id, created_at, updated_at')
    .eq('id', id)
    .single();

  if (error || !data) throw createError('Branch not found', 404);

  let manager = null;
  if (data.manager_id) {
    const { data: m } = await supabase.from('users').select('id, name, email, photo, phone').eq('id', data.manager_id).single();
    manager = m || null;
  }

  // Get employee count
  const { count: employeeCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', id)
    .eq('status', 'active');

  res.json({ success: true, data: { ...data, manager, employee_count: employeeCount || 0 } });
});

/**
 * POST /api/branches
 * Create a new branch.
 */
export const createBranch = asyncHandler(async (req: Request, res: Response) => {
  const { name, code, address, latitude, longitude, radius, manager_id } = req.body;

  if (!name || !code || latitude === undefined || longitude === undefined || !radius) {
    throw createError('Name, code, location address, and radius are required', 400);
  }

  // Check unique code
  const { data: existing } = await supabase.from('branches').select('id').eq('code', code.toUpperCase().trim()).maybeSingle();
  if (existing) throw createError('Branch code already exists', 409);

  const { data, error } = await supabase
    .from('branches')
    .insert({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      address: address?.trim() || '',
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      manager_id: manager_id || null,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    console.error('createBranch insert error:', error);
    throw createError('Failed to create branch: ' + error.message, 500);
  }

  res.status(201).json({ success: true, message: 'Branch created successfully', data });
});

/**
 * PUT /api/branches/:id
 * Update branch details.
 */
export const updateBranch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, code, address, latitude, longitude, radius, manager_id } = req.body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name) updates.name = name.trim();
  if (code) updates.code = code.toUpperCase().trim();
  if (address !== undefined) updates.address = address?.trim();
  if (latitude !== undefined) updates.latitude = parseFloat(latitude);
  if (longitude !== undefined) updates.longitude = parseFloat(longitude);
  if (radius !== undefined) updates.radius = parseInt(radius);
  if (manager_id !== undefined) updates.manager_id = manager_id || null;

  const { data, error } = await supabase
    .from('branches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) throw createError('Failed to update branch', 500);

  res.json({ success: true, message: 'Branch updated successfully', data });
});

/**
 * PATCH /api/branches/:id/status
 * Enable or disable a branch.
 */
export const updateBranchStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'inactive'].includes(status)) {
    throw createError("Status must be 'active' or 'inactive'", 400);
  }

  const { data, error } = await supabase
    .from('branches')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, name, status')
    .single();

  if (error || !data) throw createError('Failed to update branch status', 500);

  res.json({ success: true, message: `Branch ${status === 'active' ? 'enabled' : 'disabled'}`, data });
});

/**
 * DELETE /api/branches/:id
 * Delete a branch (only if no employees assigned).
 */
export const deleteBranch = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('branch_id', id)
    .eq('status', 'active');

  if (count && count > 0) {
    throw createError('Cannot delete branch with active employees. Reassign employees first.', 400);
  }

  const { error } = await supabase.from('branches').delete().eq('id', id);
  if (error) throw createError('Failed to delete branch', 500);

  res.json({ success: true, message: 'Branch deleted successfully' });
});
