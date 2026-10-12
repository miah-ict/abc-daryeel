ALTER TABLE "finance_settings" ADD COLUMN IF NOT EXISTS "onboarding_complete" boolean NOT NULL DEFAULT false;
ALTER TABLE "finance_settings" ADD COLUMN IF NOT EXISTS "onboarding_completed_at" timestamp with time zone;
ALTER TABLE "finance_settings" ADD COLUMN IF NOT EXISTS "onboarding_completed_by" text REFERENCES "users"("id");

ALTER TABLE "finance_fee_plans" ADD COLUMN IF NOT EXISTS "class_id" text REFERENCES "classes"("id");
ALTER TABLE "finance_fee_plans" ADD COLUMN IF NOT EXISTS "start_month" text;
ALTER TABLE "finance_fee_plans" ADD COLUMN IF NOT EXISTS "billing_months" integer NOT NULL DEFAULT 12;
ALTER TABLE "finance_fee_plans" ADD COLUMN IF NOT EXISTS "due_day" integer NOT NULL DEFAULT 10;
ALTER TABLE "finance_fee_plans" ADD COLUMN IF NOT EXISTS "one_time_fees" jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE "finance_fee_plans" ADD CONSTRAINT "finance_fee_plans_billing_months_check" CHECK ("billing_months" BETWEEN 1 AND 12);
ALTER TABLE "finance_fee_plans" ADD CONSTRAINT "finance_fee_plans_due_day_check" CHECK ("due_day" BETWEEN 1 AND 28);

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "fee_plan_id" text REFERENCES "finance_fee_plans"("id");
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "billing_period" text;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "schedule_key" text;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_school_schedule_key_unique" ON "invoices" ("school_id", "schedule_key");
CREATE INDEX IF NOT EXISTS "finance_fee_plans_school_class_id_idx" ON "finance_fee_plans" ("school_id", "class_id");
