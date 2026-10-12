import { check, integer, numeric, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'
import { schools } from './schools.js'

export const paymentOrders = pgTable('payment_orders', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  planCode: text('plan_code').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('pending'),
  providerOrderId: text('provider_order_id'),
  providerSid: text('provider_sid'),
  providerCode: integer('provider_code'),
  providerStatus: text('provider_status'),
  paymentType: text('payment_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }),
}, table => [
  uniqueIndex('payment_orders_provider_sid_unique').on(table.providerSid),
  check('payment_orders_plan_check', sql`${table.planCode} IN ('standard', 'enterprise')`),
  check('payment_orders_currency_check', sql`${table.currency} = 'USD'`),
  check('payment_orders_status_check', sql`${table.status} IN ('pending', 'paid', 'failed', 'cancelled', 'expired')`),
  check('payment_orders_amount_positive', sql`${table.amount} > 0`),
])

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  ownerUserId: text('owner_user_id').notNull().references(() => users.id),
  schoolId: text('school_id').references(() => schools.id, { onDelete: 'set null' }),
  planCode: text('plan_code').notNull(),
  status: text('status').notNull().default('active'),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  paymentOrderId: text('payment_order_id').notNull().references(() => paymentOrders.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('subscriptions_owner_user_unique').on(table.ownerUserId),
  uniqueIndex('subscriptions_payment_order_unique').on(table.paymentOrderId),
  check('subscriptions_plan_check', sql`${table.planCode} IN ('standard', 'enterprise')`),
  check('subscriptions_status_check', sql`${table.status} IN ('pending', 'active', 'past_due', 'cancelled', 'expired')`),
  check('subscriptions_period_check', sql`${table.currentPeriodEnd} > ${table.currentPeriodStart}`),
])
