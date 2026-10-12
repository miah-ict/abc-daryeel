import { pgTable, text, date, timestamp, integer, numeric, boolean, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { schools } from './schools.js'
import { users } from './users.js'
import { classes } from './classes.js'
import { students } from './students.js'
import { academicYears } from './exams.js'

const createdAt=timestamp('created_at',{withTimezone:true}).defaultNow().notNull()

export const examSettingsV2=pgTable('exam_settings_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),version:integer('version').notNull().default(1),
 status:text('status').notNull().default('Draft'),currentStep:integer('current_step').notNull().default(1),featureEnabled:boolean('feature_enabled').notNull().default(false),
 policyStatus:text('policy_status').notNull().default('Pending'),rules:jsonb('rules').notNull().default({}),completedAt:timestamp('completed_at',{withTimezone:true}),completedBy:text('completed_by').references(()=>users.id),createdAt,
},t=>[uniqueIndex('exam_settings_v2_school_version_uq').on(t.schoolId,t.version),index('exam_settings_v2_school_status_idx').on(t.schoolId,t.status)])

export const classProgressionsV2=pgTable('class_progressions_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),academicYearId:text('academic_year_id').notNull().references(()=>academicYears.id),
 classId:text('class_id').notNull().references(()=>classes.id),order:integer('progression_order').notNull(),nextClassId:text('next_class_id').references(()=>classes.id),isFinal:boolean('is_final').notNull().default(false),status:text('status').notNull().default('Active'),createdAt,
},t=>[uniqueIndex('class_progressions_v2_year_class_uq').on(t.academicYearId,t.classId),uniqueIndex('class_progressions_v2_year_order_uq').on(t.academicYearId,t.order),index('class_progressions_v2_school_year_idx').on(t.schoolId,t.academicYearId)])

export const academicSubjectsV2=pgTable('academic_subjects_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),name:text('name').notNull(),normalizedName:text('normalized_name').notNull(),status:text('status').notNull().default('Active'),legacySource:jsonb('legacy_source').notNull().default({}),createdAt,
},t=>[uniqueIndex('academic_subjects_v2_school_name_uq').on(t.schoolId,t.normalizedName)])

export const classSubjectOfferingsV2=pgTable('class_subject_offerings_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),academicYearId:text('academic_year_id').notNull().references(()=>academicYears.id),classId:text('class_id').notNull().references(()=>classes.id),subjectId:text('subject_id').notNull().references(()=>academicSubjectsV2.id),status:text('status').notNull().default('Active'),effectiveFrom:timestamp('effective_from',{withTimezone:true}).notNull(),effectiveTo:timestamp('effective_to',{withTimezone:true}),sourceVersion:integer('source_version').notNull().default(1),createdAt,
},t=>[uniqueIndex('class_subject_offerings_v2_key_uq').on(t.academicYearId,t.classId,t.subjectId,t.sourceVersion),index('class_subject_offerings_v2_lookup_idx').on(t.schoolId,t.academicYearId,t.classId,t.subjectId)])

export const offeringTeachersV2=pgTable('offering_teachers_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),offeringId:text('offering_id').references(()=>classSubjectOfferingsV2.id),teacherId:text('teacher_id').notNull().references(()=>users.id),role:text('role').notNull().default('Lead'),status:text('status').notNull().default('Active'),effectiveFrom:timestamp('effective_from',{withTimezone:true}).notNull(),effectiveTo:timestamp('effective_to',{withTimezone:true}),createdAt,
},t=>[uniqueIndex('offering_teachers_v2_key_uq').on(t.offeringId,t.teacherId,t.effectiveFrom),index('offering_teachers_v2_offering_idx').on(t.offeringId,t.status)])

export const examTemplatesV2=pgTable('exam_templates_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),familyId:text('family_id').notNull(),version:integer('version').notNull(),name:text('name').notNull(),category:text('category').notNull(),status:text('status').notNull().default('Draft'),promotionExam:boolean('promotion_exam').notNull().default(false),reExamAllowed:boolean('re_exam_allowed').notNull().default(false),visibility:text('visibility').notNull().default('PublishedOnly'),rules:jsonb('rules').notNull().default({}),createdBy:text('created_by').notNull().references(()=>users.id),createdAt,
},t=>[uniqueIndex('exam_templates_v2_family_version_uq').on(t.familyId,t.version),index('exam_templates_v2_school_status_idx').on(t.schoolId,t.status)])

export const examTemplateSubjectsV2=pgTable('exam_template_subjects_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),templateId:text('template_id').notNull().references(()=>examTemplatesV2.id),subjectId:text('subject_id').notNull().references(()=>academicSubjectsV2.id),order:integer('subject_order').notNull(),maxMark:numeric('max_mark',{precision:8,scale:2}).notNull(),minimumMark:numeric('minimum_mark',{precision:8,scale:2}).notNull(),required:boolean('required').notNull().default(true),createdAt,
},t=>[uniqueIndex('exam_template_subjects_v2_template_subject_uq').on(t.templateId,t.subjectId),uniqueIndex('exam_template_subjects_v2_template_order_uq').on(t.templateId,t.order)])

export const examSessionsV2=pgTable('exam_sessions_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),academicYearId:text('academic_year_id').notNull().references(()=>academicYears.id),templateId:text('template_id').notNull().references(()=>examTemplatesV2.id),title:text('title').notNull(),term:text('term').notNull(),startDate:date('start_date').notNull(),endDate:date('end_date').notNull(),teacherDeadline:timestamp('teacher_deadline',{withTimezone:true}).notNull(),publishMode:text('publish_mode').notNull().default('Manual'),status:text('status').notNull().default('Draft'),rulesSnapshot:jsonb('rules_snapshot').notNull(),sourceSnapshot:jsonb('source_snapshot').notNull().default({}),parentSessionId:text('parent_session_id'),courseId:text('course_id'),idempotencyKey:text('idempotency_key').notNull(),requestHash:text('request_hash').notNull(),createdBy:text('created_by').notNull().references(()=>users.id),publishedAt:timestamp('published_at',{withTimezone:true}),createdAt,
},t=>[uniqueIndex('exam_sessions_v2_school_idempotency_uq').on(t.schoolId,t.idempotencyKey),index('exam_sessions_v2_school_year_status_idx').on(t.schoolId,t.academicYearId,t.status)])

export const examSessionClassesV2=pgTable('exam_session_classes_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),sessionId:text('session_id').notNull().references(()=>examSessionsV2.id),classId:text('class_id').notNull().references(()=>classes.id),order:integer('class_order').notNull(),createdAt,
},t=>[uniqueIndex('exam_session_classes_v2_session_class_uq').on(t.sessionId,t.classId)])

export const examAssignmentsV2=pgTable('exam_assignments_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),sessionId:text('session_id').notNull().references(()=>examSessionsV2.id),sessionClassId:text('session_class_id').notNull().references(()=>examSessionClassesV2.id),templateSubjectId:text('template_subject_id').notNull().references(()=>examTemplateSubjectsV2.id),offeringId:text('offering_id').notNull().references(()=>classSubjectOfferingsV2.id),classId:text('class_id').notNull().references(()=>classes.id),subjectId:text('subject_id').notNull().references(()=>academicSubjectsV2.id),leadTeacherId:text('lead_teacher_id').notNull().references(()=>users.id),subjectNameSnapshot:text('subject_name_snapshot').notNull(),maxMark:numeric('max_mark',{precision:8,scale:2}).notNull(),minimumMark:numeric('minimum_mark',{precision:8,scale:2}).notNull(),deadline:timestamp('deadline',{withTimezone:true}).notNull(),status:text('status').notNull().default('Draft'),hardLocked:boolean('hard_locked').notNull().default(false),submittedAt:timestamp('submitted_at',{withTimezone:true}),lateSeconds:integer('late_seconds'),reopenedAt:timestamp('reopened_at',{withTimezone:true}),reopenedBy:text('reopened_by').references(()=>users.id),reopenReason:text('reopen_reason'),createdAt,
},t=>[uniqueIndex('exam_assignments_v2_session_class_subject_uq').on(t.sessionId,t.classId,t.templateSubjectId),index('exam_assignments_v2_teacher_status_idx').on(t.leadTeacherId,t.status),index('exam_assignments_v2_session_idx').on(t.sessionId)])

export const examAssignmentTeachersV2=pgTable('exam_assignment_teachers_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),assignmentId:text('assignment_id').notNull().references(()=>examAssignmentsV2.id),teacherId:text('teacher_id').notNull().references(()=>users.id),role:text('role').notNull(),sourceTeacherLinkId:text('source_teacher_link_id').references(()=>offeringTeachersV2.id),createdAt,
},t=>[uniqueIndex('exam_assignment_teachers_v2_key_uq').on(t.assignmentId,t.teacherId)])

export const examAssignmentStudentsV2=pgTable('exam_assignment_students_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),assignmentId:text('assignment_id').notNull().references(()=>examAssignmentsV2.id),studentId:text('student_id').notNull().references(()=>students.id),enrollmentId:text('enrollment_id'),status:text('status').notNull().default('Expected'),reason:text('reason'),createdAt,
},t=>[uniqueIndex('exam_assignment_students_v2_key_uq').on(t.assignmentId,t.studentId),index('exam_assignment_students_v2_student_idx').on(t.studentId)])

export const examScoresV2=pgTable('exam_scores_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),assignmentStudentId:text('assignment_student_id').notNull().references(()=>examAssignmentStudentsV2.id),score:numeric('score',{precision:8,scale:2}),markStatus:text('mark_status').notNull().default('Missing'),reason:text('reason'),revision:integer('revision').notNull().default(1),updatedBy:text('updated_by').notNull().references(()=>users.id),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex('exam_scores_v2_roster_uq').on(t.assignmentStudentId)])

export const examResultsV2=pgTable('exam_results_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),sessionId:text('session_id').notNull().references(()=>examSessionsV2.id),studentId:text('student_id').notNull().references(()=>students.id),classId:text('class_id').notNull().references(()=>classes.id),earned:numeric('earned',{precision:12,scale:2}).notNull(),possible:numeric('possible',{precision:12,scale:2}).notNull(),average:numeric('average',{precision:8,scale:4}).notNull(),displayAverage:numeric('display_average',{precision:8,scale:2}).notNull(),rank:integer('rank').notNull(),outcome:text('outcome').notNull(),passedSubjects:integer('passed_subjects').notNull(),failedSubjects:integer('failed_subjects').notNull(),eligibility:jsonb('eligibility').notNull().default({}),calculationVersion:text('calculation_version').notNull(),createdAt,
},t=>[uniqueIndex('exam_results_v2_session_student_uq').on(t.sessionId,t.studentId),index('exam_results_v2_student_idx').on(t.studentId)])

export const examResultSubjectsV2=pgTable('exam_result_subjects_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),resultId:text('result_id').notNull().references(()=>examResultsV2.id),subjectId:text('subject_id').notNull().references(()=>academicSubjectsV2.id),assignmentId:text('assignment_id').notNull().references(()=>examAssignmentsV2.id),earned:numeric('earned',{precision:8,scale:2}).notNull(),possible:numeric('possible',{precision:8,scale:2}).notNull(),minimumMark:numeric('minimum_mark',{precision:8,scale:2}).notNull(),outcome:text('outcome').notNull(),createdAt,
},t=>[uniqueIndex('exam_result_subjects_v2_result_subject_uq').on(t.resultId,t.subjectId)])

export const examDecisionsV2=pgTable('exam_decisions_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),resultId:text('result_id').notNull().references(()=>examResultsV2.id),studentId:text('student_id').notNull().references(()=>students.id),subjectId:text('subject_id').references(()=>academicSubjectsV2.id),decision:text('decision').notNull(),status:text('status').notNull().default('Open'),reason:text('reason').notNull(),parentDecisionId:text('parent_decision_id'),decidedBy:text('decided_by').notNull().references(()=>users.id),createdAt,
},t=>[index('exam_decisions_v2_result_status_idx').on(t.resultId,t.status)])

export const studentPromotionsV2=pgTable('student_promotions_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),studentId:text('student_id').notNull().references(()=>students.id),sourceResultId:text('source_result_id').references(()=>examResultsV2.id),fromAcademicYearId:text('from_academic_year_id').notNull().references(()=>academicYears.id),toAcademicYearId:text('to_academic_year_id').notNull().references(()=>academicYears.id),fromClassId:text('from_class_id').notNull().references(()=>classes.id),toClassId:text('to_class_id').references(()=>classes.id),kind:text('kind').notNull().default('Promotion'),status:text('status').notNull().default('Pending'),idempotencyKey:text('idempotency_key').notNull(),appliedAt:timestamp('applied_at',{withTimezone:true}),appliedBy:text('applied_by').references(()=>users.id),createdAt,
},t=>[uniqueIndex('student_promotions_v2_source_uq').on(t.sourceResultId),uniqueIndex('student_promotions_v2_school_idempotency_uq').on(t.schoolId,t.idempotencyKey),index('student_promotions_v2_transition_idx').on(t.toAcademicYearId,t.status)])

export const coursesV2=pgTable('courses_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),academicYearId:text('academic_year_id').notNull().references(()=>academicYears.id),name:text('name').notNull(),description:text('description').notNull().default(''),startDate:date('start_date').notNull(),endDate:date('end_date').notNull(),capacity:integer('capacity').notNull(),fee:numeric('fee',{precision:12,scale:2}).notNull().default('0'),paymentType:text('payment_type').notNull().default('None'),targetClassId:text('target_class_id').notNull().references(()=>classes.id),status:text('status').notNull().default('Draft'),rules:jsonb('rules').notNull().default({}),createdBy:text('created_by').notNull().references(()=>users.id),createdAt,
},t=>[index('courses_v2_school_year_status_idx').on(t.schoolId,t.academicYearId,t.status)])

export const courseClassesV2=pgTable('course_classes_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),courseId:text('course_id').notNull().references(()=>coursesV2.id),classId:text('class_id').notNull().references(()=>classes.id),createdAt,
},t=>[uniqueIndex('course_classes_v2_key_uq').on(t.courseId,t.classId)])

export const courseSubjectsV2=pgTable('course_subjects_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),courseId:text('course_id').notNull().references(()=>coursesV2.id),subjectId:text('subject_id').notNull().references(()=>academicSubjectsV2.id),teacherId:text('teacher_id').references(()=>users.id),order:integer('subject_order').notNull(),rules:jsonb('rules').notNull().default({}),createdAt,
},t=>[uniqueIndex('course_subjects_v2_key_uq').on(t.courseId,t.subjectId)])

export const courseOffersV2=pgTable('course_offers_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),courseId:text('course_id').notNull().references(()=>coursesV2.id),studentId:text('student_id').notNull().references(()=>students.id),sourceResultId:text('source_result_id').references(()=>examResultsV2.id),status:text('status').notNull().default('Offered'),source:text('source').notNull(),reason:text('reason'),expiresAt:timestamp('expires_at',{withTimezone:true}),respondedAt:timestamp('responded_at',{withTimezone:true}),respondedBy:text('responded_by').references(()=>users.id),createdAt,
},t=>[uniqueIndex('course_offers_v2_course_student_uq').on(t.courseId,t.studentId)])

export const courseEnrollmentsV2=pgTable('course_enrollments_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),courseId:text('course_id').notNull().references(()=>coursesV2.id),offerId:text('offer_id').references(()=>courseOffersV2.id),studentId:text('student_id').notNull().references(()=>students.id),sourceClassId:text('source_class_id').notNull().references(()=>classes.id),normalPromotionClassId:text('normal_promotion_class_id').references(()=>classes.id),targetClassId:text('target_class_id').notNull().references(()=>classes.id),status:text('status').notNull().default('Reserved'),seatNumber:integer('seat_number').notNull(),createdAt,
},t=>[uniqueIndex('course_enrollments_v2_course_student_uq').on(t.courseId,t.studentId),uniqueIndex('course_enrollments_v2_course_seat_uq').on(t.courseId,t.seatNumber)])

export const coursePaymentsV2=pgTable('course_payments_v2',{
 id:text('id').primaryKey(),schoolId:text('school_id').notNull().references(()=>schools.id),enrollmentId:text('enrollment_id').notNull().references(()=>courseEnrollmentsV2.id),invoiceId:text('invoice_id'),status:text('status').notNull().default('Pending'),requiredAmount:numeric('required_amount',{precision:12,scale:2}).notNull(),postedAmount:numeric('posted_amount',{precision:12,scale:2}).notNull().default('0'),source:text('source').notNull().default('Finance'),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
},t=>[uniqueIndex('course_payments_v2_enrollment_uq').on(t.enrollmentId)])
