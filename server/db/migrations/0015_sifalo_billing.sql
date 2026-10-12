CREATE TABLE IF NOT EXISTS "payment_orders" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL REFERENCES "users"("id"),
  "plan_code" text NOT NULL,
  "amount" numeric(12,2) NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_order_id" text,
  "provider_sid" text,
  "provider_code" integer,
  "provider_status" text,
  "payment_type" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "paid_at" timestamp with time zone,
  CONSTRAINT "payment_orders_plan_check" CHECK ("plan_code" IN ('standard', 'enterprise')),
  CONSTRAINT "payment_orders_currency_check" CHECK ("currency" = 'USD'),
  CONSTRAINT "payment_orders_status_check" CHECK ("status" IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  CONSTRAINT "payment_orders_amount_positive" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_orders_provider_sid_unique" ON "payment_orders" ("provider_sid");
CREATE INDEX IF NOT EXISTS "payment_orders_owner_created_idx" ON "payment_orders" ("owner_user_id", "created_at");

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "owner_user_id" text NOT NULL REFERENCES "users"("id"),
  "school_id" text REFERENCES "schools"("id") ON DELETE SET NULL,
  "plan_code" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "current_period_start" timestamp with time zone NOT NULL,
  "current_period_end" timestamp with time zone NOT NULL,
  "payment_order_id" text NOT NULL REFERENCES "payment_orders"("id"),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "subscriptions_plan_check" CHECK ("plan_code" IN ('standard', 'enterprise')),
  CONSTRAINT "subscriptions_status_check" CHECK ("status" IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  CONSTRAINT "subscriptions_period_check" CHECK ("current_period_end" > "current_period_start")
);

CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_owner_user_unique" ON "subscriptions" ("owner_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_payment_order_unique" ON "subscriptions" ("payment_order_id");
CREATE INDEX IF NOT EXISTS "subscriptions_school_idx" ON "subscriptions" ("school_id");
