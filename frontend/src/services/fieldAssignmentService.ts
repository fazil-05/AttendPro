// src/services/fieldAssignmentService.ts
// Field visit assignment service — replaces backend fieldAssignmentController

import { supabase } from './supabase';
import type { FieldAssignment } from '../types';
import { isWithinGeofence } from '../utils/haversine';

export interface FieldAssignmentFilters {
  status?: string;
  employee_id?: string;
  date?: string;
  page?: number;
  limit?: number;
}

/**
 * GET /api/field-assignments → direct Supabase
 */
export async function getFieldAssignments(
  filters: FieldAssignmentFilters = {},
  currentUser?: { role: string; id: string }
) {
  const { status, employee_id, date, page = 1, limit = 20 } = filters;

  let query = supabase
    .from('field_assignments')
    .select(`
      *,
      employee:users!field_assignments_employee_id_fkey(id, name, employee_id, photo),
      assigner:users!field_assignments_assigned_by_fkey(id, name)
    `, { count: 'exact' });

  if (currentUser?.role === 'field_employee') {
    query = query.eq('employee_id', currentUser.id);
  } else if (employee_id) {
    query = query.eq('employee_id', employee_id);
  }

  if (status) query = query.eq('status', status);
  if (date) query = query.eq('visit_date', date);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) throw new Error('Failed to fetch field assignments');

  return {
    data: (data || []) as unknown as FieldAssignment[],
    meta: { total: count || 0 },
  };
}

export interface CreateFieldAssignmentData {
  employee_id: string;
  customer_name: string;
  customer_address?: string;
  latitude: number;
  longitude: number;
  radius?: number;
  visit_date: string;
  priority?: 'low' | 'medium' | 'high';
  notes?: string;
}

/**
 * POST /api/field-assignments → direct Supabase
 */
export async function createFieldAssignment(
  assignedById: string,
  assignmentData: CreateFieldAssignmentData
): Promise<FieldAssignment> {
  const {
    employee_id, customer_name, customer_address,
    latitude, longitude, radius = 100,
    visit_date, priority = 'medium', notes,
  } = assignmentData;

  if (!employee_id || !customer_name || !latitude || !longitude || !visit_date) {
    throw new Error('Employee, customer name, location, and visit date are required');
  }

  const { data, error } = await supabase
    .from('field_assignments')
    .insert({
      employee_id,
      assigned_by: assignedById,
      customer_name,
      customer_address: customer_address || null,
      latitude,
      longitude,
      radius,
      visit_date,
      priority,
      notes: notes || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error('Failed to create assignment');
  return data as unknown as FieldAssignment;
}

export interface UpdateFieldAssignmentStatusData {
  status: 'accepted' | 'rejected' | 'in_progress' | 'completed';
  remarks?: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
}

/**
 * PATCH /api/field-assignments/:id/status → direct Supabase + client-side geofence
 */
export async function updateFieldAssignmentStatus(
  id: string,
  payload: UpdateFieldAssignmentStatusData
): Promise<FieldAssignment> {
  const { status, remarks, latitude, longitude, photo_url } = payload;

  const { data: assignment } = await supabase
    .from('field_assignments')
    .select('*')
    .eq('id', id)
    .single();

  if (!assignment) throw new Error('Assignment not found');

  // Geofence check when starting a visit
  if (status === 'in_progress' && latitude && longitude) {
    const geofence = isWithinGeofence(
      assignment.latitude as number,
      assignment.longitude as number,
      latitude,
      longitude,
      assignment.radius as number
    );

    if (!geofence.inside) {
      throw new Error(
        `You are not at the assigned customer location. Distance: ${geofence.distance}m, required: ${assignment.radius}m`
      );
    }
  }

  const updates: Record<string, unknown> = {
    status,
    remarks: remarks || null,
    updated_at: new Date().toISOString(),
  };

  if (status === 'in_progress') {
    updates.check_in_time = new Date().toISOString();
    updates.check_in_latitude = latitude || null;
    updates.check_in_longitude = longitude || null;
    updates.check_in_photo = photo_url || null;
  }

  if (status === 'completed') {
    updates.check_out_time = new Date().toISOString();
    updates.check_out_latitude = latitude || null;
    updates.check_out_longitude = longitude || null;
    updates.check_out_photo = photo_url || null;
  }

  const { data, error } = await supabase
    .from('field_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error('Failed to update assignment');
  return data as unknown as FieldAssignment;
}

/**
 * GET /api/field-assignments/live → direct Supabase
 */
export async function getLiveFieldEmployees() {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('field_assignments')
    .select(`
      id, customer_name, check_in_latitude, check_in_longitude, check_in_time, status,
      employee:users!field_assignments_employee_id_fkey(id, name, employee_id, photo, phone)
    `)
    .eq('visit_date', today)
    .eq('status', 'in_progress');

  if (error) throw new Error('Failed to fetch live employees');
  return data || [];
}
