// src/routes/leaves.ts
import { Router } from 'express';
import { getLeaves, applyLeave, updateLeaveStatus, cancelLeave } from '../controllers/leaveController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getLeaves);
router.post('/', applyLeave);
router.patch('/:id/status', authorize('super_admin', 'branch_manager'), updateLeaveStatus);
router.delete('/:id', cancelLeave);

export default router;
