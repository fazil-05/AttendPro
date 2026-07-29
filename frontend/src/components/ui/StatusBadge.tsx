// src/components/ui/StatusBadge.tsx
// Reusable status badge component for attendance, leaves, etc.

import React from 'react';
import type { AttendanceStatus, LeaveStatus, FieldAssignmentStatus } from '../../types';

type BadgeStatus = AttendanceStatus | LeaveStatus | FieldAssignmentStatus | 'active' | 'inactive' | 'high' | 'medium' | 'low';

const labelMap: Record<string, string> = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  absent: 'Absent',
  holiday: 'Holiday',
  leave: 'On Leave',
  weekend: 'Weekend',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  active: 'Active',
  inactive: 'Inactive',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const baseClass = `badge badge-${status} ${size === 'sm' ? 'text-xs py-0.5 px-2' : ''}`;
  return (
    <span className={baseClass}>
      {labelMap[status] || status}
    </span>
  );
};
