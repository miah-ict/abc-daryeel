ALTER TABLE schools ADD COLUMN IF NOT EXISTS accountant_seq integer NOT NULL DEFAULT 50;
--> statement-breakpoint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_login_id_range;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, 49 + ROW_NUMBER() OVER (PARTITION BY school_id ORDER BY created_at, id) AS next_login_id
  FROM users
  WHERE role = 'accountant' AND school_id IS NOT NULL
)
UPDATE users u SET login_id = ranked.next_login_id
FROM ranked WHERE u.id = ranked.id;
--> statement-breakpoint
UPDATE schools s SET accountant_seq = GREATEST(
  s.accountant_seq,
  50,
  COALESCE((SELECT MAX(u.login_id) + 1 FROM users u WHERE u.school_id = s.id AND u.role = 'accountant'), 50)
);
--> statement-breakpoint
UPDATE schools s SET staff_seq = GREATEST(
  s.staff_seq,
  100,
  COALESCE((
    SELECT MAX(u.login_id) + 1
    FROM users u
    WHERE u.school_id = s.id
      AND u.role NOT IN ('manager', 'accountant', 'student')
      AND u.login_id BETWEEN 100 AND 999
  ), 100)
);
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_login_id_range CHECK (
  login_id IS NULL
  OR (role = 'manager' AND login_id BETWEEN 10 AND 49)
  OR (role = 'accountant' AND login_id BETWEEN 50 AND 99)
  OR (role = 'student' AND login_id >= 1000)
  OR (role NOT IN ('manager', 'accountant', 'student') AND login_id BETWEEN 100 AND 999)
);
