ALTER TABLE "classes" ADD COLUMN "progression_order" integer;
ALTER TABLE "classes" ADD COLUMN "next_class_id" text;
ALTER TABLE "classes" ADD COLUMN "course_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "classes" ADD COLUMN "course_rank_limit" integer DEFAULT 25 NOT NULL;
ALTER TABLE "classes" ADD COLUMN "course_pass_mark" integer DEFAULT 50 NOT NULL;
ALTER TABLE "students" ADD COLUMN "class_id" text REFERENCES "classes"("id");

CREATE TABLE "academic_years" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "name" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" text DEFAULT 'Draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "academic_year_school_name_unique" ON "academic_years" ("school_id", "name");
CREATE UNIQUE INDEX "academic_year_one_active" ON "academic_years" ("school_id") WHERE "status" = 'Active';

CREATE TABLE "student_enrollments" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "academic_year_id" text NOT NULL REFERENCES "academic_years"("id"),
  "class_id" text NOT NULL REFERENCES "classes"("id"),
  "status" text DEFAULT 'Active' NOT NULL,
  "source" text DEFAULT 'Manual' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "student_enrollment_year_class_unique" ON "student_enrollments" ("student_id", "academic_year_id", "class_id");

CREATE TABLE "exams" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "academic_year_id" text NOT NULL REFERENCES "academic_years"("id"),
  "title" text NOT NULL,
  "type" text DEFAULT 'Main' NOT NULL,
  "parent_exam_id" text,
  "pass_mark" integer DEFAULT 50 NOT NULL,
  "status" text DEFAULT 'Collecting' NOT NULL,
  "created_by" text NOT NULL REFERENCES "users"("id"),
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "exam_assignments" (
  "id" text PRIMARY KEY NOT NULL,
  "exam_id" text NOT NULL REFERENCES "exams"("id"),
  "class_id" text NOT NULL REFERENCES "classes"("id"),
  "subject_name" text NOT NULL,
  "teacher_id" text NOT NULL REFERENCES "users"("id"),
  "status" text DEFAULT 'Draft' NOT NULL,
  "submitted_at" timestamp with time zone,
  "reopened_at" timestamp with time zone
);
CREATE UNIQUE INDEX "exam_assignment_unique" ON "exam_assignments" ("exam_id", "class_id", "subject_name");

CREATE TABLE "exam_scores" (
  "id" text PRIMARY KEY NOT NULL,
  "assignment_id" text NOT NULL REFERENCES "exam_assignments"("id"),
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "score" integer NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "exam_score_student_unique" ON "exam_scores" ("assignment_id", "student_id");

CREATE TABLE "exam_results" (
  "id" text PRIMARY KEY NOT NULL,
  "exam_id" text NOT NULL REFERENCES "exams"("id"),
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "class_id" text NOT NULL REFERENCES "classes"("id"),
  "average" numeric(5,2) NOT NULL,
  "rank" integer NOT NULL,
  "outcome" text NOT NULL,
  "promotion_class_id" text REFERENCES "classes"("id"),
  "failed_decision" text,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "exam_result_student_unique" ON "exam_results" ("exam_id", "student_id");

CREATE TABLE "course_enrollments" (
  "id" text PRIMARY KEY NOT NULL,
  "school_id" text NOT NULL REFERENCES "schools"("id"),
  "exam_id" text NOT NULL REFERENCES "exams"("id"),
  "student_id" text NOT NULL REFERENCES "students"("id"),
  "source_class_id" text NOT NULL REFERENCES "classes"("id"),
  "course_class_id" text NOT NULL REFERENCES "classes"("id"),
  "target_class_id" text NOT NULL REFERENCES "classes"("id"),
  "source" text NOT NULL,
  "reason" text,
  "status" text DEFAULT 'Enrolled' NOT NULL,
  "score" numeric(5,2),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX "course_exam_student_unique" ON "course_enrollments" ("exam_id", "student_id");

UPDATE "students" AS s SET "class_id" = c."id"
FROM "classes" AS c
WHERE s."school_id" = c."school_id" AND lower(trim(s."grade_level")) = lower(trim(c."name"));
