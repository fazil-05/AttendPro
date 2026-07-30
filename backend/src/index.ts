// src/index.ts
// Enterprise Attendance Management System — Backend Server

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import path from 'path';

// Load environment variables from backend directory, root directory, or CWD
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import branchRoutes from './routes/branches';
import attendanceRoutes from './routes/attendance';
import leaveRoutes from './routes/leaves';
import fieldAssignmentRoutes from './routes/fieldAssignments';
import reportRoutes from './routes/reports';
import settingsRoutes from './routes/settings';
import { errorHandler } from './middleware/errorHandler';
import { startAutoAbsentCron } from './services/cronJobs';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────

// Helmet for HTTP security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limiter — 100 requests per 15 minutes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'development', // skip entirely in dev
});

// ─── Body Parsers ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' })); // 10MB for base64 photo uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Attendance System API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/field-assignments', fieldAssignmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api', settingsRoutes); // mounts: /api/settings, /api/holidays, etc.

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   Enterprise Attendance Management System     ║
║   Backend API Server                         ║
╠═══════════════════════════════════════════════╣
║  Port:     ${PORT}                              ║
║  Env:      ${(process.env.NODE_ENV || 'development').padEnd(34)}║
║  CORS:     ${(process.env.FRONTEND_URL || 'http://localhost:5173').padEnd(34)}║
╚═══════════════════════════════════════════════╝
  `);

  // Start scheduled jobs
  startAutoAbsentCron();
});

export default app;
