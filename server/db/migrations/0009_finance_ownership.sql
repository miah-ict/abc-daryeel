-- Quarantine records whose school cannot be proven through their parent.
UPDATE "invoices" AS i SET "school_id" = NULL FROM "students" AS s
WHERE i."student_id" = s."id" AND i."school_id" IS DISTINCT FROM s."school_id";
--> statement-breakpoint
UPDATE "transactions" AS t SET "school_id" = NULL FROM "invoices" AS i
WHERE t."invoice_id" = i."id" AND t."school_id" IS DISTINCT FROM i."school_id";
--> statement-breakpoint
UPDATE "transactions" AS t SET "school_id" = NULL FROM "finance_bills" AS b
WHERE t."bill_id" = b."id" AND t."school_id" IS DISTINCT FROM b."school_id";
--> statement-breakpoint
CREATE UNIQUE INDEX "students_id_school_unique" ON "students" ("id", "school_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_id_school_unique" ON "invoices" ("id", "school_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_id_school_unique" ON "transactions" ("id", "school_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "bills_id_school_unique" ON "finance_bills" ("id", "school_id");
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_school_fk" FOREIGN KEY ("student_id", "school_id") REFERENCES "students"("id", "school_id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_school_fk" FOREIGN KEY ("invoice_id", "school_id") REFERENCES "invoices"("id", "school_id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_bill_school_fk" FOREIGN KEY ("bill_id", "school_id") REFERENCES "finance_bills"("id", "school_id");
--> statement-breakpoint
ALTER TABLE "finance_receipts" ADD CONSTRAINT "receipts_transaction_school_fk" FOREIGN KEY ("transaction_id", "school_id") REFERENCES "transactions"("id", "school_id");
--> statement-breakpoint
ALTER TABLE "finance_refunds" ADD CONSTRAINT "refunds_original_school_fk" FOREIGN KEY ("original_transaction_id", "school_id") REFERENCES "transactions"("id", "school_id");
--> statement-breakpoint
ALTER TABLE "finance_refunds" ADD CONSTRAINT "refunds_reversal_school_fk" FOREIGN KEY ("reversal_transaction_id", "school_id") REFERENCES "transactions"("id", "school_id");
