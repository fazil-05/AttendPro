// src/utils/attendanceStatus.ts
// Attendance status determination — migrated from backend, safe to run in browser

import type { AttendanceStatus } from '../types';

interface ShiftTiming {
  lateThreshold: string;    // HH:MM e.g. "09:15"
  halfDayThreshold: string; // HH:MM e.g. "10:00"
}

/**
 * Determine attendance status from check-in time.
 */
export function determineAttendanceStatus(
  checkInTime: Date | null,
  shift: ShiftTiming,
  isHoliday: boolean,
  isWeekend: boolean,
  isOnLeave: boolean
): AttendanceStatus {
  if (isHoliday) return 'holiday';
  if (isWeekend) return 'weekend';
  if (isOnLeave) return 'leave';
  if (!checkInTime) return 'absent';

  const [lateH, lateM] = shift.lateThreshold.split(':').map(Number);
  const [halfH, halfM] = shift.halfDayThreshold.split(':').map(Number);

  const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
  const lateMinutes = lateH * 60 + lateM;
  const halfDayMinutes = halfH * 60 + halfM;

  if (checkInMinutes <= lateMinutes) return 'present';
  if (checkInMinutes <= halfDayMinutes) return 'late';
  return 'half_day';
}

/**
 * Calculate working hours between check-in and check-out.
 */
export function calculateWorkingHours(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100;
}

/**
 * Check if a given date is a weekend based on working days config.
 * @param workingDays - Array of weekday numbers (0=Sun, 1=Mon, ..., 6=Sat)
 */
export function isWeekend(date: Date, workingDays: number[]): boolean {
  return !workingDays.includes(date.getDay());
}
