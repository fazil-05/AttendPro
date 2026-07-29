// src/controllers/reportController.ts
// Reports controller: daily, monthly, branch, department reports

import { Request, Response } from 'express';
import { supabase } from '../services/supabase';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * GET /api/reports/daily
 * Daily attendance report.
 */
export const getDailyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { date, branch_id } = req.query as Record<string, string>;
  const reportDate = date || new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(
        id, name, employee_id, photo, role, phone,
        branches(id, name), departments(id, name), designations(id, name)
      )
    `)
    .eq('date', reportDate);

  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  const { data, error } = await query.order('check_in', { ascending: true });
  if (error) throw createError('Failed to generate daily report', 500);

  res.json({ success: true, data, report_date: reportDate });
});

/**
 * GET /api/reports/monthly
 * Monthly attendance report for all employees.
 */
export const getMonthlyReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { month, year, branch_id, employee_id } = req.query as Record<string, string>;
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const y = year || String(new Date().getFullYear());
  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const toDate = new Date(parseInt(y), parseInt(m), 0).toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(id, name, employee_id, photo)
    `)
    .gte('date', fromDate)
    .lte('date', toDate);

  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (employee_id) query = query.eq('employee_id', employee_id);

  const { data, error } = await query.order('date', { ascending: true });
  if (error) throw createError('Failed to generate monthly report', 500);

  // Group by employee
  const employeeMap: Record<string, {
    employee: unknown;
    present: number; late: number; absent: number;
    half_day: number; leave: number; total_working_hours: number;
    records: unknown[];
  }> = {};

  data?.forEach(record => {
    const emp = record.employee as { id: string; name: string; employee_id: string };
    if (!employeeMap[emp.id]) {
      employeeMap[emp.id] = {
        employee: emp,
        present: 0, late: 0, absent: 0,
        half_day: 0, leave: 0, total_working_hours: 0,
        records: [],
      };
    }
    employeeMap[emp.id][record.status as keyof typeof employeeMap[string]]++;
    employeeMap[emp.id].total_working_hours += record.working_hours || 0;
    employeeMap[emp.id].records.push(record);
  });

  res.json({
    success: true,
    data: Object.values(employeeMap),
    period: { month: m, year: y, from_date: fromDate, to_date: toDate },
  });
});

/**
 * GET /api/reports/branch
 * Branch-wise attendance statistics.
 */
export const getBranchReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from_date, to_date } = req.query as Record<string, string>;
  const today = new Date().toISOString().split('T')[0];
  const from = from_date || today;
  const to = to_date || today;

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('id, name, code')
    .eq('status', 'active');

  if (branchError) throw createError('Failed to fetch branches', 500);

  const branchStats = await Promise.all(
    (branches || []).map(async branch => {
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status')
        .eq('branch_id', branch.id)
        .gte('date', from)
        .lte('date', to);

      return {
        branch,
        present: attendance?.filter(a => a.status === 'present').length || 0,
        late: attendance?.filter(a => a.status === 'late').length || 0,
        absent: attendance?.filter(a => a.status === 'absent').length || 0,
        total: attendance?.length || 0,
      };
    })
  );

  res.json({ success: true, data: branchStats });
});

/**
 * GET /api/reports/late
 * Late arrivals report.
 */
export const getLateReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from_date, to_date, branch_id } = req.query as Record<string, string>;
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(id, name, employee_id, photo, branches(name))
    `)
    .in('status', ['late', 'half_day'])
    .gte('date', from_date || today)
    .lte('date', to_date || today);

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw createError('Failed to fetch late report', 500);

  res.json({ success: true, data });
});

/**
 * GET /api/reports/absent
 * Absent employees report.
 */
export const getAbsentReport = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { from_date, to_date, branch_id } = req.query as Record<string, string>;
  const today = new Date().toISOString().split('T')[0];

  let query = supabase
    .from('attendance')
    .select(`
      *,
      employee:users!attendance_employee_id_fkey(id, name, employee_id, photo, phone, branches(name))
    `)
    .eq('status', 'absent')
    .gte('date', from_date || today)
    .lte('date', to_date || today);

  if (branch_id) query = query.eq('branch_id', branch_id);
  if (req.user?.role === 'branch_manager' && req.user.branch_id) {
    query = query.eq('branch_id', req.user.branch_id);
  }

  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw createError('Failed to fetch absent report', 500);

  res.json({ success: true, data });
});
