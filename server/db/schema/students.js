import { pgTable, text, date, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { schools } from './schools.js'
import { classes } from './classes.js'
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').references(() => schools.id),
  parentId: text('parent_id').references(() => users.id),
  teacherId: text('teacher_id').references(() => users.id),
  classId: text('class_id').references(() => classes.id),
  fullName: text('full_name').notNull(),
  gradeLevel: text('grade_level').notNull(),
  guardian: text('guardian').notNull().default(''),
  email: text('email').notNull().default(''),
  emergencyContact: text('emergency_contact'),
  dateOfBirth: date('date_of_birth'),
  status: text('status').notNull().default('Active'),
  details: jsonb('details').notNull().default({}),
}, table => [uniqueIndex('students_id_school_unique').on(table.id,table.schoolId)])
