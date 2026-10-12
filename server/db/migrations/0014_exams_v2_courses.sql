-- Course exams reuse the exam v2 session pipeline. Course assignments have no
-- class-subject offering, so the offering link becomes optional and sessions
-- may point to the course they belong to. Purely additive/relaxing.
ALTER TABLE "exam_sessions_v2" ADD COLUMN IF NOT EXISTS "course_id" text REFERENCES "courses_v2"("id");
ALTER TABLE "exam_assignments_v2" ALTER COLUMN "offering_id" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "exam_sessions_v2_course_idx" ON "exam_sessions_v2"("course_id");
