import test from 'node:test'
import assert from 'node:assert/strict'
import {buildClassPayload,classEditorFields} from '../../src/features/admin/components/adminClassForm.ts'
import {EXAM_V2_UNSUPPORTED,buildPolicyRules,loadAdminExamV2,requireExamV2Write} from '../../src/features/exams/v2/examV2Adapter.ts'

test('class create owns exactly the six approved fields',()=>{
 const payload=buildClassPayload({name:'Grade 7A',level:'Middle',section:'A',academicYear:'2026–2027',room:'201',capacity:'32'})
 assert.deepEqual(Object.keys(payload),classEditorFields())
 assert.deepEqual(payload,{name:'Grade 7A',level:'Middle',section:'A',academicYear:'2026–2027',room:'201',capacity:32})
})

test('class edit preserves hidden legacy progression and course fields',()=>{
 const existing={teacherId:'teacher-a',status:'Inactive',progressionOrder:4,nextClassId:'class-b',courseEnabled:true,courseRankLimit:12,coursePassMark:65}
 const payload=buildClassPayload({name:'Grade 7A',level:'Middle',section:'B',academicYear:'2026–2027',room:'202',capacity:'30'},existing)
 assert.deepEqual({...payload,name:undefined,level:undefined,section:undefined,academicYear:undefined,room:undefined,capacity:undefined},{name:undefined,level:undefined,section:undefined,academicYear:undefined,room:undefined,capacity:undefined,...existing})
})

test('exam setup policy persists average, subject minimum and decimal display rules',()=>{
 const rules=buildPolicyRules({passAverage:'55',failBelow:'55',subjectMinimum:'40',decimalPlaces:'1'})
 assert.equal(rules.passBasis,'AverageAndSubjectMinimum')
 assert.equal(rules.passAverage,55)
 assert.equal(rules.failBelow,55)
 assert.equal(rules.subjectMinimum,40)
 assert.equal(rules.displayDecimals,1)
})

test('exam v2 adapter never silently falls back to legacy writes',async()=>{
 const state=await loadAdminExamV2()
 assert.equal(state.code,EXAM_V2_UNSUPPORTED)
 assert.equal(state.writable,false)
 assert.throws(()=>requireExamV2Write(state),error=>error.code===EXAM_V2_UNSUPPORTED)
})

test('admin exam adapter keeps courses, settings, templates, years and subjects in their API lanes',async()=>{
 const originalFetch=globalThis.fetch
 const payloads={
  '/api/exams/v2/courses':[{id:'course-a',name:'Accelerated maths'}],
  '/api/exams/v2/settings':[{id:'settings-a',version:3,status:'Complete',currentStep:5,rules:{draft:{passAverage:55}}}],
  '/api/exams/v2/templates':[{id:'template-a',name:'Final Exam'}],
  '/api/exams/v2/sessions':[],
  '/api/academic-years':[{id:'year-a',name:'2026–2027'}],
  '/api/exams/v2/subjects':[{id:'subject-a',name:'Mathematics'}],
 }
 globalThis.fetch=async url=>({ok:true,status:200,json:async()=>payloads[url]??[]})
 try{
  const state=await loadAdminExamV2()
  assert.equal(state.mode,'v2')
  assert.equal(state.data.setup.id,'settings-a')
  assert.equal(state.data.setup.status,'Complete')
  assert.equal(state.data.courses[0].id,'course-a')
  assert.equal(state.data.templates[0].id,'template-a')
  assert.equal(state.data.academicYears[0].id,'year-a')
  assert.equal(state.data.subjects[0].id,'subject-a')
 }finally{globalThis.fetch=originalFetch}
})

test('legacy migration backfills exams safely and idempotently without mutating legacy tables', async () => {
 const { PGlite } = await import('@electric-sql/pglite')
 const { drizzle } = await import('drizzle-orm/pglite')
 const { eq } = await import('drizzle-orm')
 const fs = await import('node:fs/promises')
 const client = new PGlite()
 const db = drizzle(client)
 const files = (await fs.readdir(new URL('../db/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()
 for (const file of files) await client.exec(await fs.readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'))

 const { schools, academicYears, classes, students, users, exams, examAssignments, examScores, examResults, examSessionsV2 } = await import('../db/schema/index.js')
 const { migrateLegacyExams } = await import('../../scripts/migrate-legacy-exams.mjs')

 await db.insert(schools).values([{ id: 'mig-sch', name: 'Legacy High', staffSeq: 1, classSeq: 1, studentSeq: 1 }])
 await db.insert(users).values([{ id: 'mig-admin', email: 'admin@mig.edu', fullName: 'Mig Admin', role: 'admin', schoolId: 'mig-sch', passwordHash: 'hash', isVerified: true, firstLogin: false }])
 await db.insert(academicYears).values([{ id: 'mig-year', schoolId: 'mig-sch', name: '2025–2026', startDate: '2025-09-01', endDate: '2026-06-30', status: 'Active' }])
 const [cls] = await db.insert(classes).values([{ id: 'mig-class', schoolId: 'mig-sch', name: 'Class 5', loginId: 'CLS-5', level: 'Lower' }]).returning()
 await db.insert(students).values([{ id: 'mig-stud', schoolId: 'mig-sch', fullName: 'Student Legacy', gradeLevel: 'Class 5' }])

 // Legacy Exam
 await db.insert(exams).values([{ id: 'leg-exam-1', schoolId: 'mig-sch', academicYearId: 'mig-year', title: 'Legacy Final 2026', type: 'Final', passMark: 50, status: 'Published', createdBy: 'mig-admin', publishedAt: new Date() }])
 await db.insert(examAssignments).values([{ id: 'leg-asgn-1', examId: 'leg-exam-1', classId: cls.id, subjectName: 'History', teacherId: 'mig-admin', status: 'Submitted', submittedAt: new Date() }])
 await db.insert(examScores).values([{ id: 'leg-score-1', assignmentId: 'leg-asgn-1', studentId: 'mig-stud', score: 78 }])
 await db.insert(examResults).values([{ id: 'leg-res-1', examId: 'leg-exam-1', studentId: 'mig-stud', classId: cls.id, average: '78.00', rank: 1, outcome: 'Passed', publishedAt: new Date() }])

 // 1. Dry run
 const dryReport = await migrateLegacyExams(db, { commit: false })
 assert.equal(dryReport.mode, 'DRY_RUN')
 assert.equal(dryReport.sessionsMigrated, 1)
 const v2Before = await db.select().from(examSessionsV2).where(eq(examSessionsV2.schoolId, 'mig-sch'))
 assert.equal(v2Before.length, 0)

 // 2. Commit
 const commitReport = await migrateLegacyExams(db, { commit: true })
 assert.equal(commitReport.mode, 'COMMIT')
 assert.equal(commitReport.sessionsMigrated, 1)
 const v2After = await db.select().from(examSessionsV2).where(eq(examSessionsV2.schoolId, 'mig-sch'))
 assert.equal(v2After.length, 1)
 assert.equal(v2After[0].title, 'Legacy Final 2026')

 // 3. Idempotent re-run
 const replayReport = await migrateLegacyExams(db, { commit: true })
 assert.equal(replayReport.sessionsMigrated, 0)
 assert.equal(replayReport.sessionsSkipped, 1)
 const v2Replay = await db.select().from(examSessionsV2).where(eq(examSessionsV2.schoolId, 'mig-sch'))
 assert.equal(v2Replay.length, 1)

 // 4. Legacy tables untouched
 const legCount = await db.select().from(exams).where(eq(exams.id, 'leg-exam-1'))
 assert.equal(legCount.length, 1)
})
