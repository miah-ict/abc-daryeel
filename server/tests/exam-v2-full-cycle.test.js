import { IncomingMessage, ServerResponse } from 'node:http'
import { Duplex } from 'node:stream'
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { createApp } from '../app.js'
import {
  users, students, classes, academicYears, studentEnrollments,
  coursesV2, courseEnrollmentsV2, coursePaymentsV2,
  examSessionsV2, examAssignmentsV2, examScoresV2, examResultsV2,
  examDecisionsV2, studentPromotionsV2, systemLogs, schools, invoices, workspaces
} from '../db/schema/index.js'

let client, db, app, schoolAdminToken, teacherToken, studentToken

const env = {
  JWT_SECRET: 'test-secret-with-at-least-32-characters',
  CLIENT_ORIGIN: 'http://localhost:5173',
  NODE_ENV: 'test'
}

const request = (path, { token, body, method = 'GET' } = {}) => new Promise((resolve, reject) => {
  const chunks = []
  const socket = new Duplex({ read() {}, write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done() } })
  Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' })
  const req = new IncomingMessage(socket)
  const res = new ServerResponse(req)
  req.complete = true
  req.method = method
  req.url = `/api${path}`
  req.headers = { host: 'localhost', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  const input = body ? Buffer.from(JSON.stringify(body)) : null
  if (input) {
    req.headers['content-type'] = 'application/json'
    req.headers['content-length'] = String(input.length)
  }
  res.assignSocket(socket)
  const timeout = setTimeout(() => reject(new Error('In-process HTTP request timed out')), 15000)
  res.on('finish', () => {
    clearTimeout(timeout)
    const raw = Buffer.concat(chunks).toString()
    try {
      resolve({ status: res.statusCode, body: JSON.parse(raw.slice(raw.indexOf('\r\n\r\n') + 4)) })
    } catch (err) {
      reject(err)
    }
  })
  res.on('error', reject)
  app(req, res)
  if (input) req.push(input)
  req.push(null)
})

before(async () => {
  client = new PGlite()
  db = drizzle(client)
  const files = (await fs.readdir(new URL('../db/migrations/', import.meta.url))).filter(f => f.endsWith('.sql')).sort()
  for (const file of files) {
    await client.exec(await fs.readFile(new URL(`../db/migrations/${file}`, import.meta.url), 'utf8'))
  }
  const passwordHash = await bcrypt.hash('secret-pass', 4)
  await db.insert(schools).values([{ id: 'sch-1', name: 'Apex Academy', staffSeq: 1, classSeq: 1, studentSeq: 1 }])
  await db.insert(workspaces).values({ id: 'school', revision: 1, data: {} })
  await db.insert(users).values([
    { id: 'admin-1', email: 'admin@apex.edu', fullName: 'Apex Admin', role: 'admin', schoolId: 'sch-1', passwordHash, isVerified: true, firstLogin: false },
    { id: 'teacher-1', email: 'teacher@apex.edu', fullName: 'Apex Teacher', role: 'teacher', schoolId: 'sch-1', loginId: 201, passwordHash, isVerified: true, firstLogin: false },
    { id: 'parent-1', email: 'student@apex.edu', fullName: 'Parent Apex', role: 'student', schoolId: 'sch-1', passwordHash, isVerified: true, firstLogin: false }
  ])
  await db.insert(students).values([
    { id: 'stud-1', schoolId: 'sch-1', fullName: 'Student Alpha', gradeLevel: 'Class 1', parentId: 'parent-1', teacherId: 'teacher-1' },
    { id: 'stud-2', schoolId: 'sch-1', fullName: 'Student Beta', gradeLevel: 'Class 1', parentId: 'parent-1', teacherId: 'teacher-1' }
  ])

  app = createApp(db, env)

  const adminAuth = await request('/auth/login', { method: 'POST', body: { email: 'admin@apex.edu', password: 'secret-pass' } })
  schoolAdminToken = adminAuth.body.token

  const teacherAuth = await request('/auth/login', { method: 'POST', body: { email: 'teacher@apex.edu', password: 'secret-pass' } })
  teacherToken = teacherAuth.body.token

  const studentAuth = await request('/auth/login', { method: 'POST', body: { email: 'student@apex.edu', password: 'secret-pass' } })
  studentToken = studentAuth.body.token
})

test('complete exam v2 setup, courses, re-exams, student hub, and auto-promotions', async () => {
  // 1. Create Academic Years (Current and Next)
  const yearCur = (await request('/academic-years', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: '2026–2027', startDate: '2026-09-01', endDate: '2027-06-30' }
  })).body

  const yearNext = (await request('/academic-years', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: '2027–2028', startDate: '2027-09-01', endDate: '2028-06-30' }
  })).body

  // 2. Create Classes
  const class1 = (await request('/classes', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: 'Class 1', level: 'Lower', section: 'A', academicYear: '2026–2027', room: '101', capacity: 35 }
  })).body

  const class2 = (await request('/classes', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: 'Class 2', level: 'Lower', section: 'A', academicYear: '2026–2027', room: '102', capacity: 35 }
  })).body

  const class3 = (await request('/classes', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: 'Class 3', level: 'Middle', section: 'A', academicYear: '2026–2027', room: '103', capacity: 35 }
  })).body

  // Assign students to Class 1
  await db.update(students).set({ classId: class1.id, gradeLevel: class1.name }).where(eq(students.id, 'stud-1'))
  await db.update(students).set({ classId: class1.id, gradeLevel: class1.name }).where(eq(students.id, 'stud-2'))
  await db.insert(studentEnrollments).values([
    { id: 'enr-stud-1', schoolId: 'sch-1', studentId: 'stud-1', academicYearId: yearCur.id, classId: class1.id, status: 'Active', source: 'Test' },
    { id: 'enr-stud-2', schoolId: 'sch-1', studentId: 'stud-2', academicYearId: yearCur.id, classId: class1.id, status: 'Active', source: 'Test' }
  ])

  // 3. Exam V2 Settings & Rules (Pass basis: AverageOnly, Re-exams allowed)
  const rules = {
    passBasis: 'AverageOnly',
    maxMarkModel: 'PerSubject',
    deadlinePolicy: 'BlockLate',
    reexamScope: 'FailedSubjects',
    reexamScorePolicy: 'SeparateResolution',
    promotionTiming: 'OnFinalPublish',
    rounding: 'HalfUp2',
    passAverage: 50,
    reExamAllowed: true
  }

  const settingsRes = await request('/exams/v2/settings', {
    token: schoolAdminToken,
    method: 'PUT',
    body: { version: 1, currentStep: 5, featureEnabled: false, policyStatus: 'Confirmed', rules }
  })
  assert.equal(settingsRes.status, 201)
  const completeRes = await request(`/exams/v2/settings/${settingsRes.body.id}/complete`, {
    token: schoolAdminToken,
    method: 'POST'
  })
  assert.equal(completeRes.status, 200)

  // 4. Class Progressions (Class 1 -> Class 2 -> Class 3 (Final))
  const progRes = await request(`/exams/v2/progressions/${yearCur.id}`, {
    token: schoolAdminToken,
    method: 'PUT',
    body: {
      rows: [
        { classId: class1.id, order: 1, nextClassId: class2.id, isFinal: false },
        { classId: class2.id, order: 2, nextClassId: class3.id, isFinal: false },
        { classId: class3.id, order: 3, nextClassId: null, isFinal: true }
      ]
    }
  })
  assert.equal(progRes.status, 200)

  // 5. Subject & Offering
  const mathSub = (await request('/exams/v2/subjects', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: 'Mathematics' }
  })).body

  const sciSub = (await request('/exams/v2/subjects', {
    token: schoolAdminToken,
    method: 'POST',
    body: { name: 'Science' }
  })).body

  await request('/exams/v2/offerings', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      academicYearId: yearCur.id,
      classId: class1.id,
      subjectId: mathSub.id,
      effectiveFrom: '2026-09-01T00:00:00.000Z',
      teachers: [{ teacherId: 'teacher-1', role: 'Lead' }]
    }
  })

  await request('/exams/v2/offerings', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      academicYearId: yearCur.id,
      classId: class1.id,
      subjectId: sciSub.id,
      effectiveFrom: '2026-09-01T00:00:00.000Z',
      teachers: [{ teacherId: 'teacher-1', role: 'Lead' }]
    }
  })

  // 6. Exam Template
  const template = (await request('/exams/v2/templates', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      familyId: 'tmpl-fam-1',
      version: 1,
      name: 'Midterm 2026',
      category: 'Midterm',
      promotionExam: false,
      reExamAllowed: true,
      rules: {},
      subjects: [
        { subjectId: mathSub.id, order: 1, maxMark: 100, minimumMark: 50, required: true },
        { subjectId: sciSub.id, order: 2, maxMark: 100, minimumMark: 50, required: true }
      ]
    }
  })).body

  // 7. Exam Session
  const session = (await request('/exams/v2/sessions', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      idempotencyKey: 'midterm-session-key',
      title: 'First Term Exams',
      academicYearId: yearCur.id,
      templateId: template.id,
      term: 'Term 1',
      startDate: '2026-10-10',
      endDate: '2026-10-15',
      teacherDeadline: '2026-10-20T12:00:00.000Z',
      publishMode: 'Manual',
      allClasses: false,
      classIds: [class1.id]
    }
  })).body

  const assignments = await db.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.sessionId, session.id))
  assert.equal(assignments.length, 2)

  // Teacher submits scores: stud-1 passes both (80, 75). stud-2 fails both (30, 40).
  for (const asgn of assignments) {
    const isMath = asgn.subjectId === mathSub.id
    await request(`/exams/v2/assignments/${asgn.id}/scores`, {
      token: teacherToken,
      method: 'PUT',
      body: {
        scores: [
          { studentId: 'stud-1', status: 'Scored', score: isMath ? 80 : 75 },
          { studentId: 'stud-2', status: 'Scored', score: isMath ? 30 : 40 }
        ]
      }
    })
    const subRes = await request(`/exams/v2/assignments/${asgn.id}/submit`, {
      token: teacherToken,
      method: 'POST'
    })
    assert.equal(subRes.status, 200)
  }

  // 8. Publish Session
  const published = await request(`/exams/v2/sessions/${session.id}/publish`, {
    token: schoolAdminToken,
    method: 'POST'
  })
  assert.equal(published.status, 200)
  assert.equal(published.body.results.length, 2)

  const res1 = published.body.results.find(r => r.studentId === 'stud-1')
  const res2 = published.body.results.find(r => r.studentId === 'stud-2')
  assert.equal(res1.outcome, 'Passed')
  assert.equal(res1.rank, 1)
  assert.equal(res2.outcome, 'Failed')
  assert.equal(res2.rank, 2)

  // 9. Re-Exam Workflow for stud-2
  const decisionRes = await request(`/exams/v2/results/${res2.id}/decisions`, {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      decision: 'Re-exam',
      reason: 'Failed Term 1 average threshold; granted re-test'
    }
  })
  assert.equal(decisionRes.status, 201)

  // Scope re-exam session
  const reExamSession = (await request('/exams/v2/sessions', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      idempotencyKey: 'reexam-session-key',
      title: 'Term 1 Re-Exam',
      academicYearId: yearCur.id,
      templateId: template.id,
      term: 'Term 1 Re-Exam',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      teacherDeadline: '2026-11-10T12:00:00.000Z',
      parentSessionId: session.id,
      publishMode: 'Manual',
      allClasses: false,
      classIds: [class1.id]
    }
  })).body
  assert.equal(reExamSession.parentSessionId, session.id)

  const reAssignments = await db.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.sessionId, reExamSession.id))
  // Re-exam covers only failed subjects for stud-2
  for (const asgn of reAssignments) {
    await request(`/exams/v2/assignments/${asgn.id}/scores`, {
      token: teacherToken,
      method: 'PUT',
      body: {
        scores: [{ studentId: 'stud-2', status: 'Scored', score: 65 }]
      }
    })
    await request(`/exams/v2/assignments/${asgn.id}/submit`, {
      token: teacherToken,
      method: 'POST'
    })
  }

  // Publish re-exam session
  const rePublished = await request(`/exams/v2/sessions/${reExamSession.id}/publish`, {
    token: schoolAdminToken,
    method: 'POST'
  })
  assert.equal(rePublished.status, 200)

  // Verify decisions resolved
  const openDecisions = await db.select().from(examDecisionsV2).where(and(eq(examDecisionsV2.studentId, 'stud-2'), eq(examDecisionsV2.status, 'Open')))
  assert.equal(openDecisions.length, 0)

  // 10. Accelerated Course Workflow
  // Create Course targeting Class 3 (skipping Class 2!)
  const courseRes = await request('/exams/v2/courses', {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      academicYearId: yearCur.id,
      name: 'Summer STEM Acceleration',
      description: 'Intensive math & science to accelerate to Class 3',
      startDate: '2027-07-01',
      endDate: '2027-08-15',
      capacity: 30,
      targetClassId: class3.id,
      fee: 250,
      paymentType: 'Full',
      classIds: [class1.id],
      subjects: [
        { subjectId: mathSub.id, teacherId: 'teacher-1', order: 1 },
        { subjectId: sciSub.id, teacherId: 'teacher-1', order: 2 }
      ]
    }
  })
  assert.equal(courseRes.status, 201, JSON.stringify(courseRes.body))
  const courseId = courseRes.body.id

  // Change course status to Open
  const statusRes = await request(`/exams/v2/courses/${courseId}/status`, {
    token: schoolAdminToken,
    method: 'PATCH',
    body: { status: 'Open' }
  })
  assert.equal(statusRes.status, 200)
  assert.equal(statusRes.body.status, 'Open')

  // Check Candidates
  const candRes = await request(`/exams/v2/courses/${courseId}/candidates`, {
    token: schoolAdminToken
  })
  assert.equal(candRes.status, 200)
  assert.ok(candRes.body.some(c => c.studentId === 'stud-1'))

  // Enroll Student 1 directly
  const enrollRes = await request(`/exams/v2/courses/${courseId}/enroll`, {
    token: schoolAdminToken,
    method: 'POST',
    body: {
      studentId: 'stud-1',
      reason: 'Top ranking academic excellence'
    }
  })
  assert.equal(enrollRes.status, 201)
  assert.equal(enrollRes.body.targetClassId, class3.id)

  const enrollmentId = enrollRes.body.id

  // Record Course Payment
  const payRes = await request(`/exams/v2/courses/${courseId}/payments/${enrollmentId}`, {
    token: schoolAdminToken,
    method: 'PUT',
    body: {
      status: 'Paid',
      postedAmount: 250
    }
  })
  assert.equal(payRes.status, 200)
  assert.equal(payRes.body.status, 'Paid')
  assert.equal(Number(payRes.body.postedAmount), 250)

  // 11. Student Hub API Verification
  const hubRes = await request('/exams/v2/student/hub?studentId=stud-1', {
    token: studentToken
  })
  assert.equal(hubRes.status, 200)
  assert.equal(hubRes.body.student.className, 'Class 1')
  assert.equal(hubRes.body.student.nextClassName, 'Class 2')
  assert.ok(hubRes.body.publishedResults.length >= 1)
  assert.equal(hubRes.body.courses.length, 1)
  assert.equal(hubRes.body.courses[0].courseName, 'Summer STEM Acceleration')
  assert.equal(hubRes.body.courses[0].payment.status, 'Paid')

  // 12. Audit Logs Verification
  const logs = await db.select().from(systemLogs)
  const actions = new Set(logs.map(l => l.action))
  assert.ok(actions.has('exams.v2.settings.draft'))
  assert.ok(actions.has('exams.v2.settings.complete'))
  assert.ok(actions.has('exams.v2.progression.replace'))
  assert.ok(actions.has('exams.v2.session.create'))
  assert.ok(actions.has('exams.v2.publish'))
  assert.ok(actions.has('exams.v2.decision'))
  assert.ok(actions.has('exams.v2.reexam.publish'))
  assert.ok(actions.has('courses.v2.create'))
  assert.ok(actions.has('courses.v2.status'))
  assert.ok(actions.has('courses.v2.enroll'))
  assert.ok(actions.has('courses.v2.payment.update'))
})
