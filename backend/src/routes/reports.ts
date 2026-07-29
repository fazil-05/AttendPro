// src/routes/reports.ts
import { Router } from 'express';
import {
  getDailyReport, getMonthlyReport, getBranchReport, getLateReport, getAbsentReport
} from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate, authorize('super_admin', 'branch_manager'));

router.get('/daily', getDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/branch', authorize('super_admin'), getBranchReport);
router.get('/late', getLateReport);
router.get('/absent', getAbsentReport);

export default router;
