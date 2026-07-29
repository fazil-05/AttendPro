// src/routes/auth.ts
import { Router } from 'express';
import { login, getMe, forgotPassword, verifyOTP, resetPassword, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, getMe);
router.post('/change-password', authenticate, changePassword);

export default router;
