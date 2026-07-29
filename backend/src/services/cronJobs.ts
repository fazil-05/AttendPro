// src/services/cronJobs.ts
// Scheduled tasks: auto-absent marking, reminders

import cron from 'node-cron';
import { supabase } from './supabase';

/**
 * Run daily at 6:00 PM (18:00) IST.
 * Mark all employees without check-in as absent.
 */
export function startAutoAbsentCron(): void {
  // Cron: minute hour day month weekday
  // "0 18 * * *" = every day at 18:00
  cron.schedule('0 18 * * *', async () => {
    console.log('[CRON] Running auto-absent job at 6:00 PM...');
    const today = new Date().toISOString().split('T')[0];

    try {
      // Check if today is a weekend or holiday globally
      const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat

      // Get company settings for working days
      const { data: settings } = await supabase
        .from('company_settings')
        .select('working_days')
        .single();

      const workingDays = settings?.working_days || [1, 2, 3, 4, 5];
      if (!workingDays.includes(dayOfWeek)) {
        console.log('[CRON] Today is a non-working day. Skipping auto-absent.');
        return;
      }

      // Check for global holiday
      const { data: holiday } = await supabase
        .from('holidays')
        .select('id')
        .eq('date', today)
        .is('branch_id', null)
        .single();

      if (holiday) {
        console.log('[CRON] Today is a holiday. Skipping auto-absent.');
        return;
      }

      // Get all active employees
      const { data: employees, error: empError } = await supabase
        .from('users')
        .select('id, branch_id')
        .eq('status', 'active')
        .in('role', ['office_employee', 'field_employee']);

      if (empError || !employees) {
        console.error('[CRON] Failed to fetch employees:', empError);
        return;
      }

      // Get employees who already have attendance today
      const { data: presentToday } = await supabase
        .from('attendance')
        .select('employee_id')
        .eq('date', today);

      const presentIds = new Set(presentToday?.map(a => a.employee_id));

      // Get employees on approved leave today
      const { data: onLeave } = await supabase
        .from('leaves')
        .select('employee_id')
        .eq('status', 'approved')
        .lte('from_date', today)
        .gte('to_date', today);

      const onLeaveIds = new Set(onLeave?.map(l => l.employee_id));

      // Mark absent for employees without attendance and not on leave
      const absentEmployees = employees.filter(
        e => !presentIds.has(e.id) && !onLeaveIds.has(e.id)
      );

      if (absentEmployees.length > 0) {
        const absentRecords = absentEmployees.map(emp => ({
          employee_id: emp.id,
          branch_id: emp.branch_id,
          date: today,
          status: 'absent',
        }));

        const { error: insertError } = await supabase
          .from('attendance')
          .upsert(absentRecords, { onConflict: 'employee_id,date', ignoreDuplicates: true });

        if (insertError) {
          console.error('[CRON] Failed to insert absent records:', insertError);
        } else {
          console.log(`[CRON] Marked ${absentEmployees.length} employees as absent for ${today}`);
        }
      } else {
        console.log('[CRON] No absent employees to mark for today.');
      }
    } catch (error) {
      console.error('[CRON] Auto-absent job failed:', error);
    }
  }, {
    timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  });

  console.log('[CRON] Auto-absent cron job scheduled for 6:00 PM IST daily.');
}
