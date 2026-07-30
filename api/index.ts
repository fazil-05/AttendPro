// api/index.ts
// Vercel Serverless Function — wraps the full Express backend
// This file is the entry point for all /api/* requests on Vercel

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Import all route modules from backend/src
import authRoutes from '../backend/src/routes/auth';
import employeeRoutes from '../backend/src/routes/employees';
import branchRoutes from '../backend/src/routes/branches';
import attendanceRoutes from '../backend/src/routes/attendance';
import leaveRoutes from '../backend/src/routes/leaves';
import fieldAssignmentRoutes from '../backend/src/routes/fieldAssignments';
import reportRoutes from '../backend/src/routes/reports';
import settingsRoutes from '../backend/src/routes/settings';
import { errorHandler } from '../backend/src/middleware/errorHandler';

const app = express();

// ─── Security Middleware ─────────────────────────────────────────────────────

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS — allow Vercel frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL || '',
  'https://attend-pro-eight.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o) || o === '*')) {
      return callback(null, true);
    }
    // Also allow any vercel.app subdomain
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    return callback(null, true); // Permissive for now — restrict in production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiters
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────────────
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ success: true, message: 'AttendPro API is running', timestamp: new Date().toISOString() });
};
app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/auth', authLimiter, authRoutes);

app.use('/api/employees', employeeRoutes);
app.use('/employees', employeeRoutes);

app.use('/api/branches', branchRoutes);
app.use('/branches', branchRoutes);

app.use('/api/attendance', attendanceRoutes);
app.use('/attendance', attendanceRoutes);

app.use('/api/leaves', leaveRoutes);
app.use('/leaves', leaveRoutes);

app.use('/api/field-assignments', fieldAssignmentRoutes);
app.use('/field-assignments', fieldAssignmentRoutes);

app.use('/api/reports', reportRoutes);
app.use('/reports', reportRoutes);

app.use('/api', settingsRoutes);
app.use('/', settingsRoutes);

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
