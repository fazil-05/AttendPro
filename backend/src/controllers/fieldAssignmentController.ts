// src/controllers/fieldAssignmentController.ts
// Field visit assignment controller

import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { isWithinGeofence } from '../utils/haversine';

/**
 * GET /api/field-assignments
 * Get field assignments.
 */
export const getFieldAssignments = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { status, employee_id, date, page = '1', limit = '20' } = req.query as Record<string, string>;

  let query = supabase
    .from('field_assignments')
    .select(`
      *,
      employee:users!field_assignments_employee_id_fkey(id, name, employee_id, photo),
      assigner:users!field_assignments_assigned_by_fkey(id, name)
    `, { count: 'exact' });

  // Field employees only see their own
  if (req.user?.role === 'field_employee') {
    query = query.eq('employee_id', req.user.id);
  } else if (employee_id) {
    query = query.eq('employee_id', employee_id);
  }

  if (status) query = query.eq('status', status);
  if (date) query = query.eq('visit_date', date);

  const offset = (parseInt(page) - 1) * parseInt(limit);
  query = query.range(offset, offset + parseInt(limit) - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw createError('Failed to fetch field assignments', 500);

  res.json({ success: true, data, meta: { total: count } });
});

/**
 * POST /api/field-assignments
 * Create a new field visit assignment.
 */
export const createFieldAssignment = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    employee_id, customer_name, customer_address,
    latitude, longitude, radius = 100,
    visit_date, priority = 'medium', notes,
  } = req.body;

  if (!employee_id || !customer_name || !latitude || !longitude || !visit_date) {
    throw createError('Employee, customer name, location, and visit date are required', 400);
  }

  const { data, error } = await supabase
    .from('field_assignments')
    .insert({
      employee_id,
      assigned_by: req.user!.id,
      customer_name,
      customer_address: customer_address || null,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radius: parseInt(radius),
      visit_date,
      priority,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw createError('Failed to create assignment', 500);

  res.status(201).json({ success: true, message: 'Field assignment created', data });
});

/**
 * PATCH /api/field-assignments/:id/status
 * Update field assignment status (accept, reject, start, complete).
 */
export const updateFieldAssignmentStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, remarks, latitude, longitude, photo_url } = req.body;

  const validStatuses = ['accepted', 'rejected', 'in_progress', 'completed'];
  if (!validStatuses.includes(status)) {
    throw createError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
  }

  const { data: assignment } = await supabase
    .from('field_assignments')
    .select('*')
    .eq('id', id)
    .single();

  if (!assignment) throw createError('Assignment not found', 404);

  // Geofence check when starting a visit
  if (status === 'in_progress' && latitude && longitude) {
    const geofence = isWithinGeofence(
      assignment.latitude, assignment.longitude,
      parseFloat(latitude), parseFloat(longitude),
      assignment.radius
    );

    if (!geofence.inside) {
      res.status(400).json({
        success: false,
        message: 'You are not at the assigned customer location.',
        data: { distance: geofence.distance, required_radius: assignment.radius },
      });
      return;
    }
  }

  const updates: Record<string, unknown> = {
    status,
    remarks: remarks || null,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_progress') {
    updates.check_in_time = new Date().toISOString();
    updates.check_in_latitude = latitude ? parseFloat(latitude) : null;
    updates.check_in_longitude = longitude ? parseFloat(longitude) : null;
    updates.check_in_photo = photo_url || null;
  }

  if (status === 'completed') {
    updates.check_out_time = new Date().toISOString();
    updates.check_out_latitude = latitude ? parseFloat(latitude) : null;
    updates.check_out_longitude = longitude ? parseFloat(longitude) : null;
    updates.check_out_photo = photo_url || null;
  }

  const { data, error } = await supabase
    .from('field_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw createError('Failed to update assignment', 500);

  res.json({ success: true, message: `Assignment ${status}`, data });
});

/**
 * GET /api/field-assignments/live
 * Get live locations of checked-in field employees for manager map.
 */
export const getLiveFieldEmployees = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('field_assignments')
    .select(`
      id, customer_name, check_in_latitude, check_in_longitude, check_in_time, status,
      employee:users!field_assignments_employee_id_fkey(id, name, employee_id, photo, phone)
    `)
    .eq('visit_date', today)
    .eq('status', 'in_progress');

  if (error) throw createError('Failed to fetch live employees', 500);

  res.json({ success: true, data });
});
