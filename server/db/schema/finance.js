import { pgTable, text, date, numeric, timestamp, jsonb, uniqueIndex, index, foreignKey, integer, boolean } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { students } from './students.js'
import { schools } from './schools.js'
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(), schoolId: text('school_id').references(() => schools.id),
  studentId: text('student_id').notNull().references(() => students.id),
  description: text('description').notNull(), amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paid: numeric('paid', { precision: 12, scale: 2 }).notNull().default('0'),
  issued: date('issued').notNull(), due: date('due').notNull(),
  feePlanId: text('fee_plan_id'), billingPeriod: text('billing_period'), scheduleKey: text('schedule_key'),
}, table => [index('invoices_school_due_idx').on(table.schoolId, table.due), index('invoices_school_student_idx').on(table.schoolId, table.studentId),
  uniqueIndex('invoices_school_schedule_key_unique').on(table.schoolId,table.scheduleKey),
  uniqueIndex('invoices_id_school_unique').on(table.id,table.schoolId),
  foreignKey({name:'invoices_student_school_fk',columns:[table.studentId,table.schoolId],foreignColumns:[students.id,students.schoolId]})])
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(), schoolId: text('school_id').references(() => schools.id),
  createdBy: text('created_by').references(() => users.id),
  invoiceId: text('invoice_id').references(() => invoices.id), description: text('description').notNull(),
  billId: text('bill_id').references(() => bills.id), sourceTransactionId: text('source_transaction_id'),
  idempotencyKey: text('idempotency_key'), reference: text('reference'), payee: text('payee'),
  staffId: text('staff_id').references(() => users.id), payPeriod: text('pay_period'),
  metadata: jsonb('metadata').notNull().default({}),
  category: text('category').notNull(), amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(), status: text('status').notNull().default('Paid'),
  date: date('transaction_date').notNull(), method: text('method').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  index('transactions_school_date_idx').on(table.schoolId, table.date),
  index('transactions_school_invoice_idx').on(table.schoolId, table.invoiceId),
  uniqueIndex('transactions_school_idempotency_unique').on(table.schoolId, table.idempotencyKey),
  uniqueIndex('transactions_id_school_unique').on(table.id,table.schoolId),
  foreignKey({name:'transactions_invoice_school_fk',columns:[table.invoiceId,table.schoolId],foreignColumns:[invoices.id,invoices.schoolId]}),
  foreignKey({name:'transactions_bill_school_fk',columns:[table.billId,table.schoolId],foreignColumns:[bills.id,bills.schoolId]}),
])

export const feePlans = pgTable('finance_fee_plans', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  classId: text('class_id'), className: text('class_name').notNull(), name: text('name').notNull(),
  tuition: numeric('tuition', { precision: 12, scale: 2 }).notNull().default('0'),
  materials: numeric('materials', { precision: 12, scale: 2 }).notNull().default('0'),
  transport: numeric('transport', { precision: 12, scale: 2 }).notNull().default('0'),
  effectiveFrom: date('effective_from').notNull(), active: text('active').notNull().default('Active'),
  startMonth: text('start_month'), billingMonths: integer('billing_months').notNull().default(12),
  dueDay: integer('due_day').notNull().default(10), oneTimeFees: jsonb('one_time_fees').notNull().default([]),
}, table => [index('fee_plans_school_class_idx').on(table.schoolId, table.className)])

export const bills = pgTable('finance_bills', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  vendor: text('vendor').notNull(), description: text('description').notNull(),
  category: text('category').notNull(), amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  paid: numeric('paid', { precision: 12, scale: 2 }).notNull().default('0'),
  issued: date('issued').notNull(), due: date('due').notNull(),
  status: text('status').notNull().default('Open'),
}, table => [index('bills_school_due_idx').on(table.schoolId, table.due),uniqueIndex('bills_id_school_unique').on(table.id,table.schoolId)])

export const receipts = pgTable('finance_receipts', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  number: text('number').notNull(), transactionId: text('transaction_id').notNull().references(() => transactions.id),
  payer: text('payer').notNull(), issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex('receipts_school_number_unique').on(table.schoolId, table.number), uniqueIndex('receipts_transaction_unique').on(table.transactionId),
  foreignKey({name:'receipts_transaction_school_fk',columns:[table.transactionId,table.schoolId],foreignColumns:[transactions.id,transactions.schoolId]})])

export const refunds = pgTable('finance_refunds', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  originalTransactionId: text('original_transaction_id').notNull().references(() => transactions.id),
  reversalTransactionId: text('reversal_transaction_id').notNull().references(() => transactions.id),
  reason: text('reason').notNull(), approvedBy: text('approved_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [
  foreignKey({name:'refunds_original_school_fk',columns:[table.originalTransactionId,table.schoolId],foreignColumns:[transactions.id,transactions.schoolId]}),
  foreignKey({name:'refunds_reversal_school_fk',columns:[table.reversalTransactionId,table.schoolId],foreignColumns:[transactions.id,transactions.schoolId]}),
])

export const budgets = pgTable('finance_budgets', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  month: text('month').notNull(), category: text('category').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex('budgets_school_month_category_unique').on(table.schoolId, table.month, table.category)])

export const closings = pgTable('finance_closings', {
  id: text('id').primaryKey(), schoolId: text('school_id').notNull().references(() => schools.id),
  kind: text('kind').notNull(), period: text('period').notNull(),
  income: numeric('income', { precision: 12, scale: 2 }).notNull(),
  expenses: numeric('expenses', { precision: 12, scale: 2 }).notNull(),
  countedCash: numeric('counted_cash', { precision: 12, scale: 2 }),
  expectedCash: numeric('expected_cash', { precision: 12, scale: 2 }),
  snapshot: jsonb('snapshot').notNull().default({}),
  closedBy: text('closed_by').notNull().references(() => users.id),
  closedAt: timestamp('closed_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [uniqueIndex('closings_school_kind_period_unique').on(table.schoolId, table.kind, table.period)])

export const financeSettings = pgTable('finance_settings', {
  schoolId: text('school_id').primaryKey().references(() => schools.id),
  receiptName: text('receipt_name').notNull().default(''),
  receiptAddress: text('receipt_address').notNull().default(''),
  receiptPhone: text('receipt_phone').notNull().default(''),
  currency: text('currency').notNull().default('USD'),
  paymentMethods: jsonb('payment_methods').notNull().default(['Cash', 'Bank Transfer', 'Mobile Money', 'Card']),
  expenseCategories: jsonb('expense_categories').notNull().default(['Rent', 'Electricity', 'Water', 'Internet', 'Supplies', 'Salaries', 'Other']),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  onboardingCompletedBy: text('onboarding_completed_by').references(() => users.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
