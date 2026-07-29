// src/routes/fieldAssignments.ts
import { Router } from 'express';
import {
  getFieldAssignments, createFieldAssignment,
  updateFieldAssignmentStatus, getLiveFieldEmployees
} from '../controllers/fieldAssignmentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/live', authorize('super_admin', 'branch_manager'), getLiveFieldEmployees);
router.get('/', getFieldAssignments);
router.post('/', authorize('super_admin', 'branch_manager'), createFieldAssignment);
router.patch('/:id/status', updateFieldAssignmentStatus);

export default router;
