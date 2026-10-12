ALTER TABLE schools ADD COLUMN IF NOT EXISTS manager_seq integer NOT NULL DEFAULT 10;
--> statement-breakpoint
UPDATE schools s SET manager_seq = GREATEST(s.manager_seq, 10, COALESCE((SELECT MAX(u.login_id) + 1 FROM users u WHERE u.school_id=s.id AND u.role='manager'),10));
--> statement-breakpoint
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id text REFERENCES schools(id);
--> statement-breakpoint
UPDATE students s SET school_id = u.school_id FROM users u WHERE s.id = u.id AND s.school_id IS NULL;
--> statement-breakpoint
UPDATE students s SET school_id = u.school_id FROM users u WHERE s.teacher_id = u.id AND s.school_id IS NULL;
--> statement-breakpoint
UPDATE students s SET school_id = u.school_id FROM users u WHERE s.parent_id = u.id AND s.school_id IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS students_school_id_idx ON students(school_id);
--> statement-breakpoint
ALTER TABLE classes ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_id_range;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_login_id_range CHECK (
 login_id IS NULL OR (role = 'manager' AND login_id BETWEEN 10 AND 49)
 OR (role = 'student' AND login_id >= 1000)
 OR (role NOT IN ('student','manager') AND login_id BETWEEN 100 AND 999)
);
