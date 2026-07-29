-- ============================================================
-- Enterprise Attendance Management System
-- Supabase PostgreSQL Migration — 001_initial_schema.sql
-- ============================================================
-- Run this in Supabase SQL Editor or via Supabase CLI
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: departments
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  branch_id     UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: designations
-- ============================================================
CREATE TABLE IF NOT EXISTS designations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  department_id UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: shifts
-- ============================================================
CREATE TABLE IF NOT EXISTS shifts (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 VARCHAR(100) NOT NULL,
  type                 VARCHAR(20) NOT NULL CHECK (type IN ('morning', 'general', 'night', 'flexible')),
  start_time           TIME NOT NULL,
  end_time             TIME NOT NULL,
  late_threshold       TIME NOT NULL DEFAULT '09:15',
  half_day_threshold   TIME NOT NULL DEFAULT '10:00',
  branch_id            UUID,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: branches
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  code          VARCHAR(20) NOT NULL UNIQUE,
  address       TEXT,
  latitude      DECIMAL(10, 8) NOT NULL,
  longitude     DECIMAL(11, 8) NOT NULL,
  radius        INTEGER NOT NULL DEFAULT 150, -- meters
  manager_id    UUID,
  status        VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: users (employees)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(200) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,
  role            VARCHAR(30) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'office_employee', 'field_employee')),
  employee_id     VARCHAR(20) UNIQUE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  designation_id  UUID REFERENCES designations(id) ON DELETE SET NULL,
  shift_id        UUID REFERENCES shifts(id) ON DELETE SET NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  photo           TEXT,
  phone           VARCHAR(20),
  address         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign keys with IF NOT EXISTS check to allow safe re-running
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_branches_manager') THEN
    ALTER TABLE branches ADD CONSTRAINT fk_branches_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_departments_branch') THEN
    ALTER TABLE departments ADD CONSTRAINT fk_departments_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_shifts_branch') THEN
    ALTER TABLE shifts ADD CONSTRAINT fk_shifts_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- TABLE: attendance
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id             UUID REFERENCES branches(id) ON DELETE SET NULL,
  date                  DATE NOT NULL,
  check_in              TIMESTAMPTZ,
  check_out             TIMESTAMPTZ,
  working_hours         DECIMAL(5, 2),
  check_in_latitude     DECIMAL(10, 8),
  check_in_longitude    DECIMAL(11, 8),
  check_in_address      TEXT,
  check_out_latitude    DECIMAL(10, 8),
  check_out_longitude   DECIMAL(11, 8),
  check_out_address     TEXT,
  check_in_photo        TEXT,
  check_out_photo       TEXT,
  distance              INTEGER, -- meters from office
  status                VARCHAR(20) NOT NULL DEFAULT 'present'
                          CHECK (status IN ('present', 'late', 'half_day', 'absent', 'holiday', 'leave', 'weekend')),
  device                VARCHAR(100),
  browser               VARCHAR(100),
  ip_address            VARCHAR(50),
  network_type          VARCHAR(50),
  accuracy              DECIMAL(8, 2),
  altitude              DECIMAL(10, 2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

-- ============================================================
-- TABLE: field_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS field_assignments (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name         VARCHAR(200) NOT NULL,
  customer_address      TEXT,
  latitude              DECIMAL(10, 8) NOT NULL,
  longitude             DECIMAL(11, 8) NOT NULL,
  radius                INTEGER NOT NULL DEFAULT 100, -- meters
  visit_date            DATE NOT NULL,
  priority              VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes                 TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected', 'in_progress', 'completed')),
  check_in_time         TIMESTAMPTZ,
  check_out_time        TIMESTAMPTZ,
  check_in_photo        TEXT,
  check_out_photo       TEXT,
  check_in_latitude     DECIMAL(10, 8),
  check_in_longitude    DECIMAL(11, 8),
  check_out_latitude    DECIMAL(10, 8),
  check_out_longitude   DECIMAL(11, 8),
  remarks               TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: leaves
-- ============================================================
CREATE TABLE IF NOT EXISTS leaves (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type        VARCHAR(30) NOT NULL CHECK (leave_type IN ('casual', 'sick', 'earned', 'maternity', 'emergency')),
  from_date         DATE NOT NULL,
  to_date           DATE NOT NULL,
  total_days        INTEGER,
  reason            TEXT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: holidays
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(200) NOT NULL,
  date          DATE NOT NULL,
  type          VARCHAR(30) NOT NULL CHECK (type IN ('national', 'regional', 'festival', 'optional')),
  branch_id     UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = global holiday
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(200) NOT NULL,
  message       TEXT NOT NULL,
  type          VARCHAR(50) NOT NULL,
  read          BOOLEAN DEFAULT FALSE,
  data          JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(100) NOT NULL,
  resource      VARCHAR(100) NOT NULL,
  resource_id   UUID,
  old_data      JSONB,
  new_data      JSONB,
  ip_address    VARCHAR(50),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: company_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name          VARCHAR(200) NOT NULL DEFAULT 'Enterprise Company',
  company_logo          TEXT,
  check_in_start        TIME NOT NULL DEFAULT '08:00',
  check_in_end          TIME NOT NULL DEFAULT '10:00',
  late_threshold        TIME NOT NULL DEFAULT '09:15',
  half_day_threshold    TIME NOT NULL DEFAULT '10:00',
  default_radius        INTEGER NOT NULL DEFAULT 150,
  working_days          INTEGER[] NOT NULL DEFAULT '{1,2,3,4,5}', -- Mon-Fri
  timezone              VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
  email_notifications   BOOLEAN DEFAULT TRUE,
  auto_absent_time      TIME NOT NULL DEFAULT '18:00',
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_date ON attendance(branch_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves(status);
CREATE INDEX IF NOT EXISTS idx_field_assignments_employee ON field_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_field_assignments_date ON field_assignments(visit_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Default company settings
INSERT INTO company_settings (company_name, check_in_start, check_in_end, late_threshold, half_day_threshold, default_radius, working_days, timezone)
VALUES ('Enterprise Company', '09:00', '10:00', '09:15', '10:00', 150, '{1,2,3,4,5}', 'Asia/Kolkata')
ON CONFLICT DO NOTHING;

-- Default shifts
INSERT INTO shifts (name, type, start_time, end_time, late_threshold, half_day_threshold) VALUES
  ('Morning Shift', 'morning', '06:00', '14:00', '06:15', '07:00'),
  ('General Shift', 'general', '09:00', '18:00', '09:15', '10:00'),
  ('Night Shift', 'night', '22:00', '06:00', '22:15', '23:00'),
  ('Flexible Shift', 'flexible', '08:00', '20:00', '10:00', '12:00')
ON CONFLICT DO NOTHING;

-- Sample Indian branches
INSERT INTO branches (name, code, address, latitude, longitude, radius) VALUES
  ('Hyderabad HQ', 'HYD01', 'Hitech City, Hyderabad, Telangana 500081', 17.4474, 78.3762, 150),
  ('Chennai Branch', 'CHN01', 'OMR, Chennai, Tamil Nadu 600119', 12.9081, 80.2279, 150),
  ('Bangalore Branch', 'BLR01', 'Koramangala, Bangalore, Karnataka 560034', 12.9352, 77.6245, 200),
  ('Mumbai Branch', 'MUM01', 'BKC, Mumbai, Maharashtra 400051', 19.0645, 72.8681, 200),
  ('Delhi Branch', 'DEL01', 'Connaught Place, New Delhi 110001', 28.6315, 77.2167, 150),
  ('Pune Branch', 'PUN01', 'Hinjewadi, Pune, Maharashtra 411057', 18.5914, 73.7383, 150)
ON CONFLICT (code) DO NOTHING;

-- Default departments
INSERT INTO departments (name) VALUES
  ('Engineering'), ('Human Resources'), ('Finance'), ('Operations'),
  ('Sales'), ('Marketing'), ('IT Support'), ('Legal')
ON CONFLICT DO NOTHING;

-- Default designations
INSERT INTO designations (name) VALUES
  ('Software Engineer'), ('Senior Software Engineer'), ('Tech Lead'),
  ('Project Manager'), ('HR Executive'), ('HR Manager'),
  ('Finance Analyst'), ('Accountant'), ('Operations Manager'),
  ('Sales Executive'), ('Sales Manager'), ('Director'), ('CEO')
ON CONFLICT DO NOTHING;

-- National holidays 2025 (India)
INSERT INTO holidays (name, date, type, description) VALUES
  ('New Year', '2025-01-01', 'national', 'New Year''s Day'),
  ('Republic Day', '2025-01-26', 'national', 'Indian Republic Day'),
  ('Holi', '2025-03-14', 'festival', 'Festival of Colors'),
  ('Good Friday', '2025-04-18', 'national', 'Good Friday'),
  ('Labour Day', '2025-05-01', 'national', 'International Workers'' Day'),
  ('Independence Day', '2025-08-15', 'national', 'Indian Independence Day'),
  ('Gandhi Jayanti', '2025-10-02', 'national', 'Mahatma Gandhi''s Birthday'),
  ('Dussehra', '2025-10-02', 'festival', 'Vijayadashami'),
  ('Diwali', '2025-10-20', 'festival', 'Festival of Lights'),
  ('Christmas', '2025-12-25', 'national', 'Christmas Day')
ON CONFLICT DO NOTHING;

-- Super Admin account (password: Admin@123)
-- bcrypt hash of "Admin@123" with salt rounds 12
INSERT INTO users (name, email, password_hash, role, employee_id, status) VALUES
  ('Super Admin', 'admin@company.com', '$2a$12$d/6GkT0ze4/f8NZft053Jeqe5vGcWq9ttm63yzrl.5NkSDkCepiHi', 'super_admin', 'EMP0001', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — Enable for Supabase
-- ============================================================
-- Note: Since backend uses service_role key, RLS is bypassed.
-- Enable RLS for extra protection if using anon key directly.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_assignments ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy
DROP POLICY IF EXISTS "Service role can do everything on users" ON users;
CREATE POLICY "Service role can do everything on users" ON users
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do everything on attendance" ON attendance;
CREATE POLICY "Service role can do everything on attendance" ON attendance
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do everything on leaves" ON leaves;
CREATE POLICY "Service role can do everything on leaves" ON leaves
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can do everything on field_assignments" ON field_assignments;
CREATE POLICY "Service role can do everything on field_assignments" ON field_assignments
  FOR ALL USING (auth.role() = 'service_role');
