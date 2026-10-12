ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code_expires_at" timestamp with time zone;
