#!/usr/bin/env node
import { randomUUID } from 'node:crypto'
import { eq, and, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import {
  schools, academicYears, classes, students, users,
  exams, examAssignments, examScores, examResults,
  academicSubjectsV2, classSubjectOfferingsV2, offeringTeachersV2,
  examTemplatesV2, examTemplateSubjectsV2,
  examSessionsV2, examSessionClassesV2, examAssignmentsV2, examAssignmentStudentsV2,
  examScoresV2, examResultsV2, examResultSubjectsV2,
  systemLogs
} from '../server/db/schema/index.js'
import { readEnv } from '../server/config/env.js'

export async function migrateLegacyExams(db, options = { commit: false }) {
  const isCommit = Boolean(options.commit)
  const report = {
    mode: isCommit ? 'COMMIT' : 'DRY_RUN',
    schoolsProcessed: 0,
    subjectsCreated: 0,
    templatesCreated: 0,
    sessionsMigrated: 0,
    sessionsSkipped: 0,
    assignmentsMigrated: 0,
    scoresMigrated: 0,
    resultsMigrated: 0
  }

  const allSchools = await db.select().from(schools)
  report.schoolsProcessed = allSchools.length

  for (const school of allSchools) {
    // 1. Get legacy exams for this school
    const legacyExams = await db.select().from(exams).where(eq(exams.schoolId, school.id))
    if (!legacyExams.length) continue

    // 2. Collect all legacy subject names used by this school
    const legacyExamIds = legacyExams.map(e => e.id)
    const legacyAsgns = await db.select().from(examAssignments).where(inArray(examAssignments.examId, legacyExamIds))
    const subjectNames = [...new Set(legacyAsgns.map(a => a.subjectName.trim()))]

    // 3. Ensure academicSubjectsV2 exist
    const existingSubjects = await db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId, school.id))
    const subjectMap = new Map(existingSubjects.map(s => [s.normalizedName, s]))

    for (const rawName of subjectNames) {
      const norm = rawName.toLowerCase().replace(/\s+/g, ' ')
      if (!subjectMap.has(norm)) {
        report.subjectsCreated++
        if (isCommit) {
          const [created] = await db.insert(academicSubjectsV2).values({
            id: randomUUID(),
            schoolId: school.id,
            name: rawName,
            normalizedName: norm,
            status: 'Active'
          }).returning()
          subjectMap.set(norm, created)
        } else {
          subjectMap.set(norm, { id: `mock-${norm}`, name: rawName, normalizedName: norm })
        }
      }
    }

    // 4. Process each legacy exam
    for (const exam of legacyExams) {
      const idempotencyKey = `legacy:exam:${exam.id}`
      const existingV2 = await db.select().from(examSessionsV2).where(
        and(eq(examSessionsV2.schoolId, school.id), eq(examSessionsV2.idempotencyKey, idempotencyKey))
      )
      if (existingV2.length) {
        report.sessionsSkipped++
        continue
      }

      const examAsgns = legacyAsgns.filter(a => a.examId === exam.id)
      const examSubjectIds = [...new Set(examAsgns.map(a => {
        const norm = a.subjectName.trim().toLowerCase().replace(/\s+/g, ' ')
        return subjectMap.get(norm)?.id
      }))].filter(Boolean)

      // Find or create template
      const templateId = randomUUID()
      const templateSubjectMap = new Map()
      report.templatesCreated++

      if (isCommit) {
        const [template] = await db.insert(examTemplatesV2).values({
          id: templateId,
          schoolId: school.id,
          familyId: `legacy-family-${exam.id}`,
          version: 1,
          name: `${exam.title} Template`,
          category: exam.type === 'Final' ? 'Final' : 'Monthly',
          status: 'Active',
          promotionExam: exam.type === 'Final',
          reExamAllowed: true,
          visibility: 'PublishedOnly',
          rules: { passBasis: 'AverageOnly', passAverage: exam.passMark || 50, reExamAllowed: true },
          createdBy: exam.createdBy
        }).returning()

        let orderIdx = 1
        for (const subId of examSubjectIds) {
          const [ts] = await db.insert(examTemplateSubjectsV2).values({
            id: randomUUID(),
            schoolId: school.id,
            templateId: template.id,
            subjectId: subId,
            order: orderIdx++,
            maxMark: '100',
            minimumMark: String(exam.passMark || 50)
          }).returning()
          templateSubjectMap.set(subId, ts.id)
        }
      }

      // Create Session
      const sessionId = randomUUID()
      report.sessionsMigrated++

      if (isCommit) {
        const distinctClassIds = [...new Set(examAsgns.map(a => a.classId))]
        const [session] = await db.insert(examSessionsV2).values({
          id: sessionId,
          schoolId: school.id,
          academicYearId: exam.academicYearId,
          templateId,
          idempotencyKey,
          requestHash: randomUUID(),
          title: exam.title,
          term: 'Legacy Term',
          startDate: exam.createdAt.toISOString().slice(0, 10),
          endDate: exam.createdAt.toISOString().slice(0, 10),
          teacherDeadline: exam.createdAt,
          status: exam.status === 'Published' ? 'Published' : 'Draft',
          publishMode: 'Manual',
          rulesSnapshot: { passBasis: 'AverageOnly', passAverage: exam.passMark || 50, reExamAllowed: true },
          createdBy: exam.createdBy,
          publishedAt: exam.publishedAt
        }).returning()

        // Create examSessionClassesV2
        const sessionClassMap = new Map()
        let classOrder = 1
        for (const cId of distinctClassIds) {
          const [sc] = await db.insert(examSessionClassesV2).values({
            id: randomUUID(),
            schoolId: school.id,
            sessionId: session.id,
            classId: cId,
            order: classOrder++
          }).returning()
          sessionClassMap.set(cId, sc.id)
        }

        // Migrate assignments, offerings, student scores, and results
        for (const asgn of examAsgns) {
          const norm = asgn.subjectName.trim().toLowerCase().replace(/\s+/g, ' ')
          const sub = subjectMap.get(norm)
          if (!sub) continue

          // Ensure offering exists
          let [offering] = await db.select().from(classSubjectOfferingsV2).where(and(
            eq(classSubjectOfferingsV2.schoolId, school.id),
            eq(classSubjectOfferingsV2.academicYearId, exam.academicYearId),
            eq(classSubjectOfferingsV2.classId, asgn.classId),
            eq(classSubjectOfferingsV2.subjectId, sub.id)
          ))

          if (!offering) {
            const offId = randomUUID();
            [offering] = await db.insert(classSubjectOfferingsV2).values({
              id: offId,
              schoolId: school.id,
              academicYearId: exam.academicYearId,
              classId: asgn.classId,
              subjectId: sub.id,
              effectiveFrom: exam.createdAt,
              status: 'Active'
            }).returning()

            await db.insert(offeringTeachersV2).values({
              id: randomUUID(),
              schoolId: school.id,
              offeringId: offId,
              teacherId: asgn.teacherId,
              role: 'Lead',
              effectiveFrom: exam.createdAt,
              status: 'Active'
            })
          }

          const newAsgnId = randomUUID()
          report.assignmentsMigrated++

          await db.insert(examAssignmentsV2).values({
            id: newAsgnId,
            schoolId: school.id,
            sessionId: session.id,
            sessionClassId: sessionClassMap.get(asgn.classId) || sessionClassMap.values().next().value,
            templateSubjectId: templateSubjectMap.get(sub.id) || randomUUID(),
            offeringId: offering.id,
            classId: asgn.classId,
            subjectId: sub.id,
            leadTeacherId: asgn.teacherId,
            subjectNameSnapshot: asgn.subjectName,
            status: asgn.status === 'Submitted' ? 'Submitted' : 'Draft',
            deadline: exam.createdAt,
            maxMark: '100',
            minimumMark: String(exam.passMark || 50),
            submittedAt: asgn.submittedAt
          })

          const legacyScores = await db.select().from(examScores).where(eq(examScores.assignmentId, asgn.id))
          for (const sc of legacyScores) {
            const rosterId = randomUUID()
            report.scoresMigrated++

            await db.insert(examAssignmentStudentsV2).values({
              id: rosterId,
              schoolId: school.id,
              assignmentId: newAsgnId,
              studentId: sc.studentId
            })

            await db.insert(examScoresV2).values({
              id: randomUUID(),
              schoolId: school.id,
              assignmentStudentId: rosterId,
              studentId: sc.studentId,
              score: String(sc.score),
              markStatus: 'Scored',
              updatedBy: asgn.teacherId,
              updatedAt: sc.updatedAt
            })
          }
        }

        // Migrate results
        const legacyRes = await db.select().from(examResults).where(eq(examResults.examId, exam.id))
        for (const res of legacyRes) {
          report.resultsMigrated++
          await db.insert(examResultsV2).values({
            id: randomUUID(),
            schoolId: school.id,
            sessionId: session.id,
            studentId: res.studentId,
            classId: res.classId,
            earned: String(res.average),
            possible: '100',
            average: String(res.average),
            displayAverage: String(res.average),
            rank: res.rank,
            outcome: res.outcome,
            passedSubjects: 1,
            failedSubjects: 0,
            eligibility: { promotion: Boolean(res.promotionClassId), targetClassId: res.promotionClassId || null },
            calculationVersion: 'v1.migrated'
          })
        }

        await db.insert(systemLogs).values({
          id: randomUUID(),
          actorId: exam.createdBy,
          schoolId: school.id,
          action: 'exams.v2.legacy-migration',
          detail: JSON.stringify({ legacyExamId: exam.id, sessionId: session.id })
        })
      }
    }
  }

  return report
}

// CLI runner
if (process.argv[1]?.endsWith('migrate-legacy-exams.mjs')) {
  const commit = process.argv.includes('--commit')
  const env = readEnv()
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL })
  const db = drizzle(pool)

  console.log(`Starting Legacy Exams Migration [${commit ? 'COMMIT MODE' : 'DRY RUN MODE'}]...`)
  migrateLegacyExams(db, { commit })
    .then(summary => {
      console.log('Migration Completed Successfully:')
      console.table(summary)
      process.exit(0)
    })
    .catch(err => {
      console.error('Migration Failed:', err)
      process.exit(1)
    })
    .finally(() => pool.end())
}
