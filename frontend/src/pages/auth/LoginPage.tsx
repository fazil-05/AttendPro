// src/pages/auth/LoginPage.tsx
// Clean White & Royal Blue Login Page

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Clock, Eye, EyeOff, Mail, Lock, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('remembered_email') || '',
      rememberMe: !!localStorage.getItem('remembered_email'),
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      if (data.rememberMe) {
        localStorage.setItem('remembered_email', data.email);
      } else {
        localStorage.removeItem('remembered_email');
      }

      await login(data.email, data.password);
      toast.success('Welcome back! Login successful.');

      const userStr = localStorage.getItem('auth_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role === 'office_employee' || user?.role === 'field_employee') {
        navigate('/employee-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Invalid credentials. Please try again.';
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-900" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #2563eb 100%)' }}>
      {/* Ambient Blue Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 bg-blue-500 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-[450px] h-[450px] rounded-full opacity-20 bg-blue-400 blur-3xl" />
      </div>

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-lg shadow-black/10">
            <Clock size={22} className="text-blue-600 font-bold" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight">AttendPro</p>
            <p className="text-blue-200 text-xs">Enterprise HRMS</p>
          </div>
        </div>

        {/* Hero Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-6"
        >
          <h1 className="text-5xl font-extrabold text-white leading-tight">
            Smart Attendance<br />
            <span className="text-blue-200">
              For Enterprise Teams
            </span>
          </h1>
          <p className="text-blue-100 text-lg max-w-md leading-relaxed">
            Enterprise attendance tracking with real-time GPS geofencing, live camera selfies, and intelligent branch management.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2.5 pt-2">
            {['GPS Geofencing', 'Live Camera', 'Multi-Branch', 'Real-time Reports'].map(f => (
              <span key={f} className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-blue-300" /> {f}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="flex items-center gap-3 text-blue-200 text-xs font-medium">
          <Building2 size={16} />
          <span>Multi-Branch Supported Across All Regions</span>
        </div>
      </div>

      {/* Right Panel — Clean White Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-lg">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">AttendPro</p>
              <p className="text-blue-200 text-xs">Enterprise HRMS</p>
            </div>
          </div>

          {/* Clean White Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h2>
              <p className="text-slate-500 text-sm">Enter your corporate credentials to access portal</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="login-form">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('email')}
                    type="email"
                    id="login-email"
                    placeholder="admin@company.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm text-slate-900 placeholder-slate-400 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    id="toggle-password"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    {...register('rememberMe')}
                    type="checkbox"
                    id="remember-me"
                    className="w-4 h-4 rounded text-blue-600 accent-blue-600"
                  />
                  <span>Remember email</span>
                </label>
                <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline">
                  Forgot password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="login-submit"
                disabled={isSubmitting || isLoading}
                className="w-full btn btn-primary py-3 text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800">
              <p className="font-bold text-blue-900 mb-0.5">Demo Admin Credentials:</p>
              <p className="font-mono text-blue-700">Email: admin@company.com</p>
              <p className="font-mono text-blue-700">Password: Admin@123</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
