ALTER TABLE "schools" ALTER COLUMN "student_seq" SET DEFAULT 1000;
--> statement-breakpoint
UPDATE "schools" AS s
SET "student_seq" = 1000
WHERE s."student_seq" = 1001
  AND NOT EXISTS (
    SELECT 1 FROM "users" AS u
    WHERE u."school_id" = s."id" AND u."login_id" >= 1000
  );
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "details" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_school_login_id_unique" ON "users" ("school_id", "login_id");
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_login_id_range";
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_login_id_range" CHECK (
  "login_id" IS NULL
  OR ("role" = 'student' AND "login_id" >= 1000)
  OR ("role" <> 'student' AND "login_id" BETWEEN 100 AND 999)
);
