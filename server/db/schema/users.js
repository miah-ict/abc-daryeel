import { pgTable, text, timestamp, boolean, integer, jsonb, uniqueIndex, check } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(), // No longer notNull, since students/staff may not have email
  passwordHash: text('password_hash'),
  fullName: text('full_name').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('Active'),
  
  // New fields
  schoolId: text('school_id'), // optional for superadmins, required for school members
  loginId: integer('login_id'), // The system auto-incremented integer ID
  isVerified: boolean('is_verified').notNull().default(false), // For email verification
  verificationCode: text('verification_code'),
  verificationCodeExpiresAt: timestamp('verification_code_expires_at', { withTimezone: true }),
  firstLogin: boolean('first_login').notNull().default(true), // Forced password change
  sessionVersion: integer('session_version').notNull().default(0),
  details: jsonb('details').notNull().default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  uniqueIndex('users_school_login_id_unique').on(table.schoolId, table.loginId),
  check('users_login_id_range', sql`${table.loginId} IS NULL
    OR (${table.role} = 'manager' AND ${table.loginId} BETWEEN 10 AND 49)
    OR (${table.role} = 'accountant' AND ${table.loginId} BETWEEN 50 AND 99)
    OR (${table.role} = 'student' AND ${table.loginId} >= 1000)
    OR (${table.role} NOT IN ('manager', 'accountant', 'student') AND ${table.loginId} BETWEEN 100 AND 999)`),
  check('users_role_check', sql`${table.role} IN ('superadmin', 'admin', 'manager', 'teacher', 'student', 'accountant', 'guard', 'cleaner', 'cooking', 'driver', 'ict')`),
])
