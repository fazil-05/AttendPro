# 🏢 AttendPro — Enterprise Attendance Management System

> A production-ready, full-stack HRMS Attendance Management System with GPS geofencing, live camera capture, multi-branch support, field visit tracking, and real-time analytics.

![Tech Stack](https://img.shields.io/badge/React-TypeScript-blue) ![Backend](https://img.shields.io/badge/Node.js-Express-green) ![Database](https://img.shields.io/badge/Supabase-PostgreSQL-orange) ![License](https://img.shields.io/badge/License-MIT-purple)

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 👤 **4 User Roles** | Super Admin, Branch Manager, Office Employee, Field Employee |
| 🏢 **Multi-Branch** | Unlimited branches with geo-coordinates and radius |
| 📍 **GPS Geofencing** | Haversine formula — checks if employee is within office radius |
| 📸 **Live Camera Only** | Front camera/webcam capture — no gallery upload allowed |
| 🌍 **Reverse Geocoding** | Nominatim (OpenStreetMap) — converts coordinates to addresses |
| 🔐 **JWT Auth** | Secure login with role-based route protection |
| 📧 **Email OTP** | Password reset via email OTP |
| 📆 **Leave Management** | Apply, approve, reject with email notifications |
| 🎄 **Holiday Calendar** | National, regional, festival, optional holidays |
| ⏱️ **Auto-Absent Cron** | Marks absent automatically at 6:00 PM daily |
| 📊 **Analytics Charts** | Recharts — bar, line, pie charts for attendance trends |
| 🗺️ **Live Tracking** | OpenStreetMap + Leaflet for field employee locations |
| 📁 **Reports** | Daily/monthly/late/absent reports with CSV export |
| 🌙 **Dark/Light Mode** | Toggle with localStorage persistence |
| 📱 **PWA Ready** | Responsive, mobile-first design |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS v4** — utility-first styling
- **React Router v6** — client-side routing
- **TanStack Query** — server state management
- **Framer Motion** — animations
- **Recharts** — analytics charts
- **React Leaflet** — maps
- **React Hook Form** + **Zod** — form validation
- **Lucide React** — icons
- **Axios** — HTTP client

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **Supabase** (PostgreSQL + Auth + Storage)
- **JWT** — authentication
- **Bcryptjs** — password hashing
- **Nodemailer** — email notifications
- **Node-Cron** — scheduled jobs
- **Helmet** + **Express Rate Limit** — security

### Database
- **Supabase PostgreSQL** (hosted)
- Full schema with 13 tables, indexes, RLS policies

---

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ and npm
- A free Supabase account (supabase.com)

---

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a name, password, and region (recommend: Southeast Asia for India)
3. Once created, go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public key** → `SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ Keep secret!

---

### 2. Run Database Migration

1. In Supabase → **SQL Editor** → click **New Query**
2. Paste the contents of `backend/supabase/migrations/001_initial_schema.sql`
3. Click **Run** — this creates all tables, indexes, seed data, and a Super Admin account

> **Default Super Admin:** `admin@company.com` / `Admin@123`

---

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env
# Fill in your SUPABASE_URL, keys, JWT_SECRET, and email config

# Start development server
npm run dev
```

Backend will start at **http://localhost:5000**

---

### 4. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env.local
# Set VITE_API_BASE_URL=http://localhost:5000/api

# Start development server
npm run dev
```

Frontend will start at **http://localhost:5173**

---

## 📁 Project Structure

```
attendance-system/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Business logic
│   │   │   ├── authController.ts
│   │   │   ├── employeeController.ts
│   │   │   ├── branchController.ts
│   │   │   ├── attendanceController.ts
│   │   │   ├── leaveController.ts
│   │   │   ├── fieldAssignmentController.ts
│   │   │   ├── reportController.ts
│   │   │   └── settingsController.ts
│   │   ├── routes/            # Express routes
│   │   ├── middleware/        # Auth, error handler
│   │   ├── services/          # Supabase, email, cron
│   │   ├── utils/             # Haversine, attendance status
│   │   └── types/             # TypeScript interfaces
│   ├── supabase/
│   │   └── migrations/
│   │       └── 001_initial_schema.sql  ← Run this first!
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/        # Sidebar, TopBar, AppLayout
│   │   │   └── ui/            # Badges, Skeletons, Dialogs
│   │   ├── contexts/          # AuthContext, ThemeContext
│   │   ├── hooks/             # useCamera, useGeolocation
│   │   ├── pages/
│   │   │   ├── auth/          # Login, ForgotPassword
│   │   │   ├── admin/         # Dashboard, Employees, Branches, etc.
│   │   │   └── attendance/    # MarkAttendance
│   │   ├── services/          # Axios API client
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Haversine, helpers
│   ├── .env.example
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/login` | Login with email/password | Public |
| GET | `/api/auth/me` | Get current user | JWT |
| POST | `/api/auth/forgot-password` | Send OTP email | Public |
| POST | `/api/auth/verify-otp` | Verify OTP | Public |
| POST | `/api/auth/reset-password` | Reset password | Public |
| GET | `/api/employees` | List employees | JWT |
| POST | `/api/employees` | Create employee | Admin |
| PUT | `/api/employees/:id` | Update employee | Admin/Manager |
| DELETE | `/api/employees/:id` | Delete employee | Admin |
| GET | `/api/branches` | List branches | JWT |
| POST | `/api/branches` | Create branch | Admin |
| POST | `/api/attendance/checkin` | Mark check-in | JWT |
| POST | `/api/attendance/checkout` | Mark check-out | JWT |
| GET | `/api/attendance` | Get attendance | JWT |
| GET | `/api/attendance/stats` | Monthly stats | JWT |
| GET | `/api/leaves` | List leaves | JWT |
| POST | `/api/leaves` | Apply leave | JWT |
| PATCH | `/api/leaves/:id/status` | Approve/reject | Manager |
| GET | `/api/reports/daily` | Daily report | Manager+ |
| GET | `/api/reports/monthly` | Monthly report | Manager+ |
| GET | `/api/dashboard/stats` | Dashboard stats | JWT |

---

## 👤 Default User Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@company.com | Admin@123 |

> You can create Branch Managers and Employees from the Admin panel.

---

## 🏢 Sample Indian Branches (Pre-seeded)

| Branch | Code | Location |
|--------|------|----------|
| Hyderabad HQ | HYD01 | Hitech City |
| Chennai Branch | CHN01 | OMR |
| Bangalore Branch | BLR01 | Koramangala |
| Mumbai Branch | MUM01 | BKC |
| Delhi Branch | DEL01 | Connaught Place |
| Pune Branch | PUN01 | Hinjewadi |

---

## ⚡ Attendance Status Logic

| Check-In Time | Status |
|---------------|--------|
| Before 9:15 AM | ✅ Present |
| 9:16 – 10:00 AM | ⏰ Late |
| After 10:00 AM | 🕐 Half Day |
| No check-in (6 PM cron) | ❌ Absent |
| Holiday | 🎄 Holiday |
| Approved Leave | 📅 Leave |
| Weekend | 📵 Weekend |

---

## 🌐 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
# Set VITE_API_BASE_URL to your backend URL
```

### Backend → Render / Railway

```bash
cd backend
# Set all .env variables in your hosting platform's dashboard
# Start command: npm start
# Build command: npm run build
```

### Environment Variables (Backend)

```env
PORT=5000
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-32-char-minimum-secret-key
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourcompany.com
FRONTEND_URL=https://your-app.vercel.app
TIMEZONE=Asia/Kolkata
```

---

## 🔒 Security Features

- ✅ JWT token authentication
- ✅ Role-based access control (RBAC)
- ✅ Password hashing with bcrypt (salt rounds: 12)
- ✅ Rate limiting (100 req/15min globally, 10 req/15min for auth)
- ✅ HTTP security headers with Helmet
- ✅ CORS protection
- ✅ Input validation with Zod + express-validator
- ✅ Supabase RLS policies
- ✅ SQL injection protection (parameterized queries via Supabase SDK)
- ✅ XSS protection via Content-Security-Policy headers

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Gmail account
2. Go to **Google Account → Security → App Passwords**
3. Generate an app password for "Mail"
4. Use this as `EMAIL_PASS` in your `.env`

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## 📄 License

MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ for enterprises managing distributed teams across India and beyond.*
