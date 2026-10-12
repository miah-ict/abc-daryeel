import { pgTable, text, date, timestamp, integer, numeric, uniqueIndex } from 'drizzle-orm/pg-core'
import { schools } from './schools.js'
import { classes } from './classes.js'
import { students } from './students.js'
import { users } from './users.js'
import { sql } from 'drizzle-orm'

export const academicYears = pgTable('academic_years', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  name: text('name').notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: text('status').notNull().default('Draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('academic_year_school_name_unique').on(table.schoolId, table.name),uniqueIndex('academic_year_one_active').on(table.schoolId).where(sql`${table.status} = 'Active'`)])

export const studentEnrollments = pgTable('student_enrollments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  studentId: text('student_id').notNull().references(() => students.id),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id),
  classId: text('class_id').notNull().references(() => classes.id),
  status: text('status').notNull().default('Active'),
  source: text('source').notNull().default('Manual'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('student_enrollment_year_class_unique').on(table.studentId, table.academicYearId, table.classId)])

export const exams = pgTable('exams', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  academicYearId: text('academic_year_id').notNull().references(() => academicYears.id),
  title: text('title').notNull(),
  type: text('type').notNull().default('Main'),
  parentExamId: text('parent_exam_id'),
  passMark: integer('pass_mark').notNull().default(50),
  status: text('status').notNull().default('Collecting'),
  createdBy: text('created_by').notNull().references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const examAssignments = pgTable('exam_assignments', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id),
  classId: text('class_id').notNull().references(() => classes.id),
  subjectName: text('subject_name').notNull(),
  teacherId: text('teacher_id').notNull().references(() => users.id),
  status: text('status').notNull().default('Draft'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  reopenedAt: timestamp('reopened_at', { withTimezone: true }),
}, table => [uniqueIndex('exam_assignment_unique').on(table.examId, table.classId, table.subjectName)])

export const examScores = pgTable('exam_scores', {
  id: text('id').primaryKey(),
  assignmentId: text('assignment_id').notNull().references(() => examAssignments.id),
  studentId: text('student_id').notNull().references(() => students.id),
  score: integer('score').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('exam_score_student_unique').on(table.assignmentId, table.studentId)])

export const examResults = pgTable('exam_results', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id),
  studentId: text('student_id').notNull().references(() => students.id),
  classId: text('class_id').notNull().references(() => classes.id),
  average: numeric('average', { precision: 5, scale: 2 }).notNull(),
  rank: integer('rank').notNull(),
  outcome: text('outcome').notNull(),
  promotionClassId: text('promotion_class_id').references(() => classes.id),
  failedDecision: text('failed_decision'),
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('exam_result_student_unique').on(table.examId, table.studentId)])

export const courseEnrollments = pgTable('course_enrollments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  examId: text('exam_id').notNull().references(() => exams.id),
  studentId: text('student_id').notNull().references(() => students.id),
  sourceClassId: text('source_class_id').notNull().references(() => classes.id),
  courseClassId: text('course_class_id').notNull().references(() => classes.id),
  targetClassId: text('target_class_id').notNull().references(() => classes.id),
  source: text('source').notNull(),
  reason: text('reason'),
  status: text('status').notNull().default('Enrolled'),
  score: numeric('score', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('course_exam_student_unique').on(table.examId, table.studentId)])
