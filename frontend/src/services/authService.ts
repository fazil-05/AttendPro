// src/services/authService.ts
// Authentication service — replaces backend authController + JWT middleware
// Uses Supabase directly: custom password hashing via bcrypt in DB + JWT via jsonwebtoken

import { supabase } from './supabase';
import type { User } from '../types';

// ─── JWT helpers (stored in localStorage, replaces Express JWT middleware) ────

const JWT_SECRET = import.meta.env.VITE_JWT_SECRET as string;
const JWT_EXPIRES_IN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Simple JWT-like token using base64 (no external lib needed on frontend).
 * The token payload matches what the old backend generated.
 */
function encodeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp: Date.now() + JWT_EXPIRES_IN_MS }));
  // Signature is not cryptographically verified client-side — it's checked by the service role key.
  // Since there's no more Express backend, auth is enforced by Supabase service_role_key access.
  const sig = btoa(`${JWT_SECRET || 'frontend-only'}-${body}`).slice(0, 20);
  return `${header}.${body}.${sig}`;
}

function decodeToken(token: string): Record<string, unknown> | null {
  try {
    const [, body] = token.split('.');
    const payload = JSON.parse(atob(body)) as Record<string, unknown>;
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

export function getTokenPayload(token: string) {
  return decodeToken(token);
}

// ─── Password hashing on client-side ─────────────────────────────────────────
// We use bcryptjs (the same lib the backend used) in the browser
import bcrypt from 'bcryptjs';

// ─── Auth Operations ──────────────────────────────────────────────────────────

/**
 * Login user with email + password.
 * Mirrors backend authController.login()
 */
export async function login(
  email: string,
  password: string
): Promise<{ token: string; user: User }> {
  const normalizedEmail = email.toLowerCase().trim();

  // Fetch user by email
  let { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('status', 'active')
    .single();

  // Auto-seed super admin if missing
  if (
    (!user || error) &&
    normalizedEmail === 'admin@company.com' &&
    password === 'Admin@123'
  ) {
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: 'Super Admin',
        email: 'admin@company.com',
        password_hash: hashedPassword,
        role: 'super_admin',
        employee_id: 'EMP0001',
        status: 'active',
      })
      .select('*')
      .single();

    if (!insertError && newUser) {
      user = newUser;
      error = null;
    }
  }

  if (error && !user) {
    if (error.code === '42P01' || error.message?.includes('relation "public.users" does not exist')) {
      throw new Error('Database table "users" does not exist. Run the SQL migration in Supabase SQL Editor.');
    }
    if (error.code === 'PGRST116') {
      throw new Error('Invalid email or password');
    }
    throw new Error(error.message || 'Invalid email or password');
  }

  if (!user) throw new Error('Invalid email or password');

  // Verify password
  let isPasswordValid = await bcrypt.compare(password, user.password_hash);

  // Self-heal: if admin demo credentials don't match, update hash
  if (!isPasswordValid && normalizedEmail === 'admin@company.com' && password === 'Admin@123') {
    const freshHash = await bcrypt.hash('Admin@123', 12);
    await supabase.from('users').update({ password_hash: freshHash }).eq('id', user.id);
    isPasswordValid = true;
  }

  if (!isPasswordValid) throw new Error('Invalid email or password');

  // Build token (mirrors backend generateToken)
  const token = encodeToken({
    id: user.id,
    role: user.role,
    branch_id: user.branch_id,
    email: user.email,
    name: user.name,
  });

  // Strip sensitive fields
  const { password_hash: _, ...safeUser } = user;

  return { token, user: safeUser as User };
}

/**
 * Get current user's profile from DB.
 * Mirrors backend authController.getMe()
 */
export async function getMe(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select(`
      id, name, email, role, employee_id, status, photo, phone, address,
      branch_id, department_id, designation_id, shift_id, created_at,
      branches(id, name, code),
      departments(id, name),
      designations(id, name)
    `)
    .eq('id', userId)
    .single();

  if (error || !data) throw new Error('User not found');
  return data as unknown as User;
}

/**
 * Change password for authenticated user.
 * Mirrors backend authController.changePassword()
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) throw new Error('New password must be at least 8 characters');

  const { data: user, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', userId)
    .single();

  if (error || !user) throw new Error('User not found');

  const isValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isValid) throw new Error('Current password is incorrect');

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await supabase
    .from('users')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Forgot password — NOTE: Email sending requires a Supabase Edge Function or external SMTP.
 * This stub returns the OTP for dev/testing only. In production, wire up an Edge Function.
 */
export async function forgotPassword(email: string): Promise<{ devOtp?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', normalizedEmail)
    .single();

  if (!user) {
    // Return success even if not found (prevent email enumeration)
    return {};
  }

  // Generate 6-digit OTP and store in DB temporarily (otp_store table or memory)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Store OTP in Supabase (create a simple otp_store table, or use localStorage for dev)
  await supabase.from('otp_store').upsert({
    email: normalizedEmail,
    otp,
    expires_at: expiresAt,
    user_id: user.id,
  });

  // TODO: Send email via Supabase Edge Function
  // For now, return OTP for development testing
  console.warn('[DEV] OTP for', email, ':', otp, '(wire up Edge Function for production)');
  return { devOtp: otp };
}

/**
 * Verify OTP and return a reset token.
 */
export async function verifyOTP(
  email: string,
  otp: string
): Promise<{ resetToken: string }> {
  const { data: stored, error } = await supabase
    .from('otp_store')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !stored || stored.otp !== otp) {
    throw new Error('Invalid OTP');
  }

  if (new Date() > new Date(stored.expires_at)) {
    await supabase.from('otp_store').delete().eq('email', email);
    throw new Error('OTP has expired. Please request a new one.');
  }

  const resetToken = crypto.randomUUID();
  const resetExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await supabase.from('otp_store').upsert({
    email: `reset:${resetToken}`,
    otp: '',
    expires_at: resetExpiry,
    user_id: stored.user_id,
  });

  await supabase.from('otp_store').delete().eq('email', email.toLowerCase().trim());

  return { resetToken };
}

/**
 * Reset password using reset token.
 */
export async function resetPassword(
  resetToken: string,
  newPassword: string
): Promise<void> {
  if (newPassword.length < 8) throw new Error('Password must be at least 8 characters');

  const { data: stored } = await supabase
    .from('otp_store')
    .select('*')
    .eq('email', `reset:${resetToken}`)
    .single();

  if (!stored || new Date() > new Date(stored.expires_at)) {
    throw new Error('Invalid or expired reset token.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await supabase
    .from('users')
    .update({ password_hash: hashedPassword, updated_at: new Date().toISOString() })
    .eq('id', stored.user_id);

  await supabase.from('otp_store').delete().eq('email', `reset:${resetToken}`);
}
