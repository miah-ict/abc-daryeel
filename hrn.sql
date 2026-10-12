-- ABC Daycare local PostgreSQL bootstrap
-- Usage: psql -U postgres -d abc_daycare -f hrn.sql
-- This script is safe to run again and creates schema only. Create the first
-- administrator through `npm run db:seed` with credentials supplied in `.env`.

BEGIN;

CREATE TABLE IF NOT EXISTS schools (
  id text PRIMARY KEY,
  name text NOT NULL,
  logo text,
  info text,
  staff_seq integer NOT NULL DEFAULT 100,
  student_seq integer NOT NULL DEFAULT 1001,
  class_seq integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE,
  password_hash text,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('superadmin', 'admin', 'manager', 'teacher', 'student', 'accountant', 'guard', 'cleaner', 'cooking', 'driver', 'ict')),
  status text NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  school_id text REFERENCES schools(id),
  login_id integer,
  is_verified boolean NOT NULL DEFAULT false,
  verification_code text,
  verification_code_expires_at timestamptz,
  first_login boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id text PRIMARY KEY,
  school_id text NOT NULL REFERENCES schools(id),
  login_id text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id text PRIMARY KEY,
  parent_id text REFERENCES users(id),
  teacher_id text REFERENCES users(id),
  full_name text NOT NULL,
  grade_level text NOT NULL,
  guardian text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  emergency_contact text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'Active',
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS attendance (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES students(id),
  recorded_by text NOT NULL REFERENCES users(id),
  date date NOT NULL,
  status text NOT NULL,
  notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  student_id text NOT NULL REFERENCES students(id),
  description text NOT NULL,
  amount numeric(12,2) NOT NULL,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  issued date NOT NULL,
  due date NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  created_by text REFERENCES users(id),
  invoice_id text REFERENCES invoices(id),
  description text NOT NULL,
  category text NOT NULL,
  amount numeric(12,2) NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'Paid',
  transaction_date date NOT NULL,
  method text NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  revision integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_logs (
  id text PRIMARY KEY,
  actor_id text REFERENCES users(id),
  action text NOT NULL,
  detail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS users_school_id_idx ON users(school_id);
CREATE INDEX IF NOT EXISTS users_school_login_id_idx ON users(school_id, login_id);
CREATE INDEX IF NOT EXISTS students_parent_id_idx ON students(parent_id);
CREATE INDEX IF NOT EXISTS students_teacher_id_idx ON students(teacher_id);
CREATE INDEX IF NOT EXISTS invoices_student_id_idx ON invoices(student_id);
CREATE INDEX IF NOT EXISTS transactions_invoice_id_idx ON transactions(invoice_id);
CREATE INDEX IF NOT EXISTS system_logs_actor_id_idx ON system_logs(actor_id);
CREATE INDEX IF NOT EXISTS classes_school_id_idx ON classes(school_id);

INSERT INTO workspaces (id, data, revision)
VALUES ('school', '{}'::jsonb, 0)
ON CONFLICT (id) DO NOTHING;

COMMIT;
