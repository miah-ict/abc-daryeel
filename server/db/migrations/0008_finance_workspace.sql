ALTER TABLE "invoices" ADD COLUMN "school_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "school_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "bill_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "source_transaction_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "idempotency_key" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reference" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "payee" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "staff_id" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "pay_period" text;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "system_logs" ADD COLUMN "school_id" text;
--> statement-breakpoint
UPDATE "system_logs" AS l SET "school_id" = u."school_id" FROM "users" AS u WHERE l."actor_id" = u."id" AND u."school_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id");
--> statement-breakpoint
CREATE INDEX "system_logs_school_action_idx" ON "system_logs" ("school_id", "action");
--> statement-breakpoint
UPDATE "invoices" AS i SET "school_id" = s."school_id" FROM "students" AS s WHERE i."student_id" = s."id" AND s."school_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "transactions" AS t SET "school_id" = i."school_id" FROM "invoices" AS i WHERE t."invoice_id" = i."id" AND i."school_id" IS NOT NULL;
--> statement-breakpoint
UPDATE "transactions" AS t SET "school_id" = u."school_id" FROM "users" AS u WHERE t."created_by" = u."id" AND t."school_id" IS NULL AND u."school_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "schools"("id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_staff_id_users_id_fk" FOREIGN KEY ("staff_id") REFERENCES "users"("id");
--> statement-breakpoint
CREATE INDEX "invoices_school_due_idx" ON "invoices" ("school_id", "due");
--> statement-breakpoint
CREATE INDEX "invoices_school_student_idx" ON "invoices" ("school_id", "student_id");
--> statement-breakpoint
CREATE INDEX "transactions_school_date_idx" ON "transactions" ("school_id", "transaction_date");
--> statement-breakpoint
CREATE INDEX "transactions_school_invoice_idx" ON "transactions" ("school_id", "invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_school_idempotency_unique" ON "transactions" ("school_id", "idempotency_key");
--> statement-breakpoint
CREATE TABLE "finance_fee_plans" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "class_name" text NOT NULL, "name" text NOT NULL,
 "tuition" numeric(12,2) DEFAULT '0' NOT NULL,
 "materials" numeric(12,2) DEFAULT '0' NOT NULL,
 "transport" numeric(12,2) DEFAULT '0' NOT NULL,
 "effective_from" date NOT NULL, "active" text DEFAULT 'Active' NOT NULL,
 CONSTRAINT "fee_plans_amounts_nonnegative" CHECK ("tuition" >= 0 AND "materials" >= 0 AND "transport" >= 0)
);
--> statement-breakpoint
CREATE INDEX "fee_plans_school_class_idx" ON "finance_fee_plans" ("school_id", "class_name");
--> statement-breakpoint
CREATE TABLE "finance_bills" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "vendor" text NOT NULL, "description" text NOT NULL, "category" text NOT NULL,
 "amount" numeric(12,2) NOT NULL, "paid" numeric(12,2) DEFAULT '0' NOT NULL,
 "issued" date NOT NULL, "due" date NOT NULL, "status" text DEFAULT 'Open' NOT NULL,
 CONSTRAINT "bills_balance_valid" CHECK ("amount" > 0 AND "paid" >= 0 AND "paid" <= "amount")
);
--> statement-breakpoint
CREATE INDEX "bills_school_due_idx" ON "finance_bills" ("school_id", "due");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_id_finance_bills_id_fk" FOREIGN KEY ("bill_id") REFERENCES "finance_bills"("id");
--> statement-breakpoint
CREATE TABLE "finance_receipts" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "number" text NOT NULL, "transaction_id" text NOT NULL REFERENCES "transactions"("id"),
 "payer" text NOT NULL, "issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_school_number_unique" ON "finance_receipts" ("school_id", "number");
--> statement-breakpoint
CREATE UNIQUE INDEX "receipts_transaction_unique" ON "finance_receipts" ("transaction_id");
--> statement-breakpoint
CREATE TABLE "finance_refunds" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "original_transaction_id" text NOT NULL REFERENCES "transactions"("id"),
 "reversal_transaction_id" text NOT NULL REFERENCES "transactions"("id"),
 "reason" text NOT NULL, "approved_by" text NOT NULL REFERENCES "users"("id"),
 "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finance_budgets" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "month" text NOT NULL, "category" text NOT NULL, "amount" numeric(12,2) NOT NULL,
 "updated_by" text REFERENCES "users"("id"), "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "budget_amount_nonnegative" CHECK ("amount" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_school_month_category_unique" ON "finance_budgets" ("school_id", "month", "category");
--> statement-breakpoint
CREATE TABLE "finance_closings" (
 "id" text PRIMARY KEY NOT NULL, "school_id" text NOT NULL REFERENCES "schools"("id"),
 "kind" text NOT NULL, "period" text NOT NULL,
 "income" numeric(12,2) NOT NULL, "expenses" numeric(12,2) NOT NULL,
 "counted_cash" numeric(12,2), "expected_cash" numeric(12,2),
 "snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
 "closed_by" text NOT NULL REFERENCES "users"("id"),
 "closed_at" timestamp with time zone DEFAULT now() NOT NULL,
 CONSTRAINT "closing_kind_valid" CHECK ("kind" IN ('day', 'month'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "closings_school_kind_period_unique" ON "finance_closings" ("school_id", "kind", "period");
--> statement-breakpoint
CREATE TABLE "finance_settings" (
 "school_id" text PRIMARY KEY NOT NULL REFERENCES "schools"("id"),
 "receipt_name" text DEFAULT '' NOT NULL, "receipt_address" text DEFAULT '' NOT NULL,
 "receipt_phone" text DEFAULT '' NOT NULL, "currency" text DEFAULT 'USD' NOT NULL,
 "payment_methods" jsonb DEFAULT '["Cash","Bank Transfer","Mobile Money","Card"]'::jsonb NOT NULL,
 "expense_categories" jsonb DEFAULT '["Rent","Electricity","Water","Internet","Supplies","Salaries","Other"]'::jsonb NOT NULL,
 "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
