ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "arrival_time" time;
CREATE INDEX IF NOT EXISTS "attendance_student_date_idx" ON "attendance" ("student_id", "date");

CREATE TABLE IF NOT EXISTS "portal_subjects" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "name" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "icon" text NOT NULL DEFAULT 'BookOpen',
  "tone" text NOT NULL DEFAULT 'blue',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'Active',
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "portal_subject_school_name_unique" ON "portal_subjects" ("school_id", "name");

CREATE TABLE IF NOT EXISTS "class_subjects" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "class_id" text NOT NULL REFERENCES "classes"("id"),
  "subject_id" text NOT NULL REFERENCES "portal_subjects"("id"),
  "teacher_id" text REFERENCES "users"("id"),
  "weekday" integer NOT NULL CHECK ("weekday" BETWEEN 0 AND 6),
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "room" text NOT NULL DEFAULT '',
  "status" text NOT NULL DEFAULT 'Active',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS "class_subject_schedule_unique" ON "class_subjects" ("class_id", "subject_id", "weekday", "start_time");
CREATE INDEX IF NOT EXISTS "class_subject_school_class_idx" ON "class_subjects" ("school_id", "class_id");

CREATE TABLE IF NOT EXISTS "learning_assignments" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "class_id" text NOT NULL REFERENCES "classes"("id"),
  "subject_id" text REFERENCES "portal_subjects"("id"),
  "teacher_id" text NOT NULL REFERENCES "users"("id"),
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "due_at" timestamptz NOT NULL,
  "status" text NOT NULL DEFAULT 'Draft',
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "learning_assignment_class_due_idx" ON "learning_assignments" ("class_id", "due_at");

CREATE TABLE IF NOT EXISTS "assignment_submissions" (
  "id" text PRIMARY KEY,
  "assignment_id" text NOT NULL REFERENCES "learning_assignments"("id"),
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "response" text NOT NULL,
  "status" text NOT NULL DEFAULT 'Submitted',
  "submitted_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "assignment_submission_student_unique" ON "assignment_submissions" ("assignment_id", "student_id");

CREATE TABLE IF NOT EXISTS "portal_announcements" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "class_id" text REFERENCES "classes"("id"),
  "author_id" text REFERENCES "users"("id"),
  "title" text NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "body" text NOT NULL DEFAULT '',
  "tag" text NOT NULL DEFAULT 'School News',
  "image_url" text,
  "status" text NOT NULL DEFAULT 'Draft',
  "published_at" timestamptz,
  "expires_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "portal_announcement_school_published_idx" ON "portal_announcements" ("school_id", "published_at");

CREATE TABLE IF NOT EXISTS "gallery_items" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "class_id" text REFERENCES "classes"("id"),
  "title" text NOT NULL,
  "category" text NOT NULL DEFAULT 'Classroom',
  "asset_url" text NOT NULL,
  "published_by" text REFERENCES "users"("id"),
  "captured_at" timestamptz NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'Published'
);
CREATE INDEX IF NOT EXISTS "gallery_school_captured_idx" ON "gallery_items" ("school_id", "captured_at");

CREATE TABLE IF NOT EXISTS "gallery_favorites" (
  "id" text PRIMARY KEY,
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "gallery_item_id" text NOT NULL REFERENCES "gallery_items"("id"),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "gallery_favorite_student_item_unique" ON "gallery_favorites" ("student_id", "gallery_item_id");

CREATE TABLE IF NOT EXISTS "portal_conversations" (
  "id" text PRIMARY KEY,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "subject" text NOT NULL DEFAULT 'School conversation',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "portal_conversation_school_updated_idx" ON "portal_conversations" ("school_id", "updated_at");

CREATE TABLE IF NOT EXISTS "conversation_participants" (
  "id" text PRIMARY KEY,
  "conversation_id" text NOT NULL REFERENCES "portal_conversations"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "last_read_at" timestamptz,
  "joined_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participant_unique" ON "conversation_participants" ("conversation_id", "user_id");

CREATE TABLE IF NOT EXISTS "portal_messages" (
  "id" text PRIMARY KEY,
  "conversation_id" text NOT NULL REFERENCES "portal_conversations"("id"),
  "sender_id" text NOT NULL REFERENCES "users"("id"),
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "portal_message_conversation_created_idx" ON "portal_messages" ("conversation_id", "created_at");

CREATE TABLE IF NOT EXISTS "student_preferences" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id"),
  "dark" boolean NOT NULL DEFAULT false,
  "large_text" boolean NOT NULL DEFAULT false,
  "assignment_reminders" boolean NOT NULL DEFAULT true,
  "announcement_notifications" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
