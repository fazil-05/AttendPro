// src/services/reportService.ts
// Reports service — replaces backend reportController

import { supabase } from './supabase';

/**
 * GET /api/reports/daily → direct Supabase
 */
export async function getDailyReport(
  date?: string,
  branch_id?: string,
  currentUser?: { role: string; branch_id?: string }
) {
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

  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  const { data, error } = await query.order('check_in', { ascending: true });
  if (error) throw new Error('Failed to generate daily report');

  return { data: data || [], report_date: reportDate };
}

/**
 * GET /api/reports/monthly → direct Supabase
 */
export async function getMonthlyReport(
  month?: string,
  year?: string,
  branch_id?: string,
  employee_id?: string,
  currentUser?: { role: string; branch_id?: string }
) {
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

  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  } else if (branch_id) {
    query = query.eq('branch_id', branch_id);
  }

  if (employee_id) query = query.eq('employee_id', employee_id);

  const { data, error } = await query.order('date', { ascending: true });
  if (error) throw new Error('Failed to generate monthly report');

  // Group by employee
  const employeeMap: Record<string, {
    employee: unknown;
    present: number; late: number; absent: number;
    half_day: number; leave: number; total_working_hours: number;
    records: unknown[];
  }> = {};

  data?.forEach(record => {
    const emp = record.employee as { id: string; name: string; employee_id: string };
    if (!emp?.id) return;
    if (!employeeMap[emp.id]) {
      employeeMap[emp.id] = {
        employee: emp,
        present: 0, late: 0, absent: 0,
        half_day: 0, leave: 0, total_working_hours: 0,
        records: [],
      };
    }
    const statusKey = record.status as keyof typeof employeeMap[string];
    if (typeof employeeMap[emp.id][statusKey] === 'number') {
      (employeeMap[emp.id][statusKey] as number)++;
    }
    employeeMap[emp.id].total_working_hours += (record.working_hours as number) || 0;
    employeeMap[emp.id].records.push(record);
  });

  return {
    data: Object.values(employeeMap),
    period: { month: m, year: y, from_date: fromDate, to_date: toDate },
  };
}

/**
 * GET /api/reports/late → direct Supabase
 */
export async function getLateReport(
  from_date?: string,
  to_date?: string,
  branch_id?: string,
  currentUser?: { role: string; branch_id?: string }
) {
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
  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  }

  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new Error('Failed to fetch late report');
  return data || [];
}

/**
 * GET /api/reports/absent → direct Supabase
 */
export async function getAbsentReport(
  from_date?: string,
  to_date?: string,
  branch_id?: string,
  currentUser?: { role: string; branch_id?: string }
) {
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
  if (currentUser?.role === 'branch_manager' && currentUser.branch_id) {
    query = query.eq('branch_id', currentUser.branch_id);
  }

  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new Error('Failed to fetch absent report');
  return data || [];
}
