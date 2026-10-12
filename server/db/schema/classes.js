import { pgTable, text, timestamp, jsonb, integer, boolean } from 'drizzle-orm/pg-core'
import { schools } from './schools.js'

export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  loginId: text('login_id').notNull(),
  name: text('name').notNull(),
  progressionOrder: integer('progression_order'),
  nextClassId: text('next_class_id'),
  courseEnabled: boolean('course_enabled').notNull().default(false),
  courseRankLimit: integer('course_rank_limit').notNull().default(25),
  coursePassMark: integer('course_pass_mark').notNull().default(50),
  details: jsonb('details').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
