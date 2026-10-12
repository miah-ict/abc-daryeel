-- Keep the database role constraint aligned with the roles accepted by the API.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
--> statement-breakpoint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('superadmin', 'admin', 'manager', 'teacher', 'student', 'accountant', 'guard', 'cleaner', 'cooking', 'driver', 'ict')
);
