// src/routes/settings.ts
import { Router } from 'express';
import {
  getSettings, updateSettings,
  getHolidays, createHoliday, deleteHoliday,
  getDepartments, createDepartment, deleteDepartment,
  getDesignations, createDesignation,
  getShifts, getNotifications, markAllNotificationsRead,
  getDashboardStats,
} from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Settings (super admin only)
router.get('/settings', getSettings);
router.put('/settings', authorize('super_admin'), updateSettings);

// Holidays
router.get('/holidays', getHolidays);
router.post('/holidays', authorize('super_admin'), createHoliday);
router.delete('/holidays/:id', authorize('super_admin'), deleteHoliday);

// Departments
router.get('/departments', getDepartments);
router.post('/departments', authorize('super_admin'), createDepartment);
router.delete('/departments/:id', authorize('super_admin'), deleteDepartment);

// Designations
router.get('/designations', getDesignations);
router.post('/designations', authorize('super_admin'), createDesignation);

// Shifts
router.get('/shifts', getShifts);

// Notifications
router.get('/notifications', getNotifications);
router.patch('/notifications/read-all', markAllNotificationsRead);

export default router;
