import { pgTable, text, jsonb, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { schools } from './schools.js'
// Supplemental modules (lessons, preferences, centers) retain their existing payloads.
export const workspaces = pgTable('workspaces', {
  id: text('id').primaryKey(), data: jsonb('data').notNull().default({}),
  revision: integer('revision').notNull().default(0),
})
export const systemLogs = pgTable('system_logs', {
  id: text('id').primaryKey(), actorId: text('actor_id').references(() => users.id),
  schoolId: text('school_id').references(() => schools.id),
  action: text('action').notNull(), detail: text('detail').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => [index('system_logs_school_action_idx').on(table.schoolId, table.action)])
