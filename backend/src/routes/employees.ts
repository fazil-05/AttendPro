// src/routes/employees.ts
import { Router } from 'express';
import {
  getEmployees, getEmployee, createEmployee, updateEmployee,
  updateEmployeeStatus, deleteEmployee, getEmployeeStats
} from '../controllers/employeeController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', authorize('super_admin', 'branch_manager'), getEmployeeStats);
router.get('/', authorize('super_admin', 'branch_manager'), getEmployees);
router.post('/', authorize('super_admin'), createEmployee);
router.get('/:id', authorize('super_admin', 'branch_manager'), getEmployee);
router.put('/:id', authorize('super_admin', 'branch_manager'), updateEmployee);
router.patch('/:id/status', authorize('super_admin'), updateEmployeeStatus);
router.delete('/:id', authorize('super_admin'), deleteEmployee);

export default router;
