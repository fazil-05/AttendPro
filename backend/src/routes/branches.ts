// src/routes/branches.ts
import { Router } from 'express';
import {
  getBranches, getBranch, createBranch, updateBranch,
  updateBranchStatus, deleteBranch
} from '../controllers/branchController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getBranches);
router.get('/:id', getBranch);
router.post('/', authorize('super_admin'), createBranch);
router.put('/:id', authorize('super_admin'), updateBranch);
router.patch('/:id/status', authorize('super_admin'), updateBranchStatus);
router.delete('/:id', authorize('super_admin'), deleteBranch);

export default router;
