import { pgTable, text, date, time, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { students } from './students.js'
import { users } from './users.js'
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => students.id),
  recordedBy: text('recorded_by').notNull().references(() => users.id),
  date: date('date').notNull(),
  status: text('status').notNull(),
  arrivalTime: time('arrival_time'),
  notes: text('notes').default(''),
}, t => [uniqueIndex('attendance_student_date').on(t.studentId, t.date),index('attendance_student_date_idx').on(t.studentId,t.date)])
