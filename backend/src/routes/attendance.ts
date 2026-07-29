// src/routes/attendance.ts
import { Router } from 'express';
import {
  checkIn, checkOut, getAttendance, getTodayAttendance, getAttendanceStats
} from '../controllers/attendanceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/checkin', checkIn);
router.post('/checkout', checkOut);
router.get('/today', getTodayAttendance);
router.get('/stats', getAttendanceStats);
router.get('/', getAttendance);

export default router;
