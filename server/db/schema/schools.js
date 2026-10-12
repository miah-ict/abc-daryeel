import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core'

export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
  info: text('info'),
  staffSeq: integer('staff_seq').notNull().default(100),
  studentSeq: integer('student_seq').notNull().default(1000),
  classSeq: integer('class_seq').notNull().default(1),
  managerSeq: integer('manager_seq').notNull().default(10),
  accountantSeq: integer('accountant_seq').notNull().default(50),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
