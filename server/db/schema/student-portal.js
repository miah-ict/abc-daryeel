import { pgTable, text, integer, boolean, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { schools } from './schools.js'
import { classes } from './classes.js'
import { students } from './students.js'
import { users } from './users.js'

export const portalSubjects = pgTable('portal_subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  icon: text('icon').notNull().default('BookOpen'),
  tone: text('tone').notNull().default('blue'),
  metadata: jsonb('metadata').notNull().default({}),
  status: text('status').notNull().default('Active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('portal_subject_school_name_unique').on(table.schoolId, table.name)])

export const classSubjects = pgTable('class_subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  classId: text('class_id').notNull().references(() => classes.id),
  subjectId: text('subject_id').notNull().references(() => portalSubjects.id),
  teacherId: text('teacher_id').references(() => users.id),
  weekday: integer('weekday').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  room: text('room').notNull().default(''),
  status: text('status').notNull().default('Active'),
  metadata: jsonb('metadata').notNull().default({}),
}, table => [
  uniqueIndex('class_subject_schedule_unique').on(table.classId, table.subjectId, table.weekday, table.startTime),
  index('class_subject_school_class_idx').on(table.schoolId, table.classId),
])

export const learningAssignments = pgTable('learning_assignments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  classId: text('class_id').notNull().references(() => classes.id),
  subjectId: text('subject_id').references(() => portalSubjects.id),
  teacherId: text('teacher_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('Draft'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('learning_assignment_class_due_idx').on(table.classId, table.dueAt)])

export const assignmentSubmissions = pgTable('assignment_submissions', {
  id: text('id').primaryKey(),
  assignmentId: text('assignment_id').notNull().references(() => learningAssignments.id),
  studentId: text('student_id').notNull().references(() => students.id),
  response: text('response').notNull(),
  status: text('status').notNull().default('Submitted'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('assignment_submission_student_unique').on(table.assignmentId, table.studentId)])

export const portalAnnouncements = pgTable('portal_announcements', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  classId: text('class_id').references(() => classes.id),
  authorId: text('author_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  body: text('body').notNull().default(''),
  tag: text('tag').notNull().default('School News'),
  imageUrl: text('image_url'),
  status: text('status').notNull().default('Draft'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, table => [index('portal_announcement_school_published_idx').on(table.schoolId, table.publishedAt)])

export const galleryItems = pgTable('gallery_items', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  classId: text('class_id').references(() => classes.id),
  title: text('title').notNull(),
  category: text('category').notNull().default('Classroom'),
  assetUrl: text('asset_url').notNull(),
  publishedBy: text('published_by').references(() => users.id),
  capturedAt: timestamp('captured_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').notNull().default('Published'),
}, table => [index('gallery_school_captured_idx').on(table.schoolId, table.capturedAt)])

export const galleryFavorites = pgTable('gallery_favorites', {
  id: text('id').primaryKey(),
  studentId: text('student_id').notNull().references(() => students.id),
  galleryItemId: text('gallery_item_id').notNull().references(() => galleryItems.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('gallery_favorite_student_item_unique').on(table.studentId, table.galleryItemId)])

export const portalConversations = pgTable('portal_conversations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id').notNull().references(() => schools.id),
  subject: text('subject').notNull().default('School conversation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('portal_conversation_school_updated_idx').on(table.schoolId, table.updatedAt)])

export const conversationParticipants = pgTable('conversation_participants', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => portalConversations.id),
  userId: text('user_id').notNull().references(() => users.id),
  lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [uniqueIndex('conversation_participant_unique').on(table.conversationId, table.userId)])

export const portalMessages = pgTable('portal_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => portalConversations.id),
  senderId: text('sender_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('portal_message_conversation_created_idx').on(table.conversationId, table.createdAt)])

export const studentPreferences = pgTable('student_preferences', {
  userId: text('user_id').primaryKey().references(() => users.id),
  dark: boolean('dark').notNull().default(false),
  largeText: boolean('large_text').notNull().default(false),
  assignmentReminders: boolean('assignment_reminders').notNull().default(true),
  announcementNotifications: boolean('announcement_notifications').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
