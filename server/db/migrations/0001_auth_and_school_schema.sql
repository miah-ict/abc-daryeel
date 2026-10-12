ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "school_id" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" boolean NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "verification_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_login" boolean NOT NULL DEFAULT true;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schools" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "logo" text,
  "info" text,
  "staff_seq" integer NOT NULL DEFAULT 100,
  "student_seq" integer NOT NULL DEFAULT 1001,
  "class_seq" integer NOT NULL DEFAULT 1,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "classes" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "login_id" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_school_id_idx" ON "users" ("school_id");
CREATE INDEX IF NOT EXISTS "users_school_login_id_idx" ON "users" ("school_id", "login_id");
