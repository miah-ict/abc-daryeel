import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { and, eq, sql } from 'drizzle-orm'
import { students, users, schools, classes } from '../db/schema/index.js'
import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { allow } from '../middleware/auth.middleware.js'
import { studentInput } from '../services/validation.js'
import { studentRow, studentView, studentScope } from '../services/workspace.js'

export function studentsRoutes(db) {
  const router = Router()
  const validateLinks=async(req,row)=>{
    for(const field of ['teacherId','parentId'])if(row[field]){
      const [linked]=await db.select().from(users).where(eq(users.id,row[field]))
      if(!linked || linked.schoolId!==req.user.schoolId || (field==='teacherId'&&linked.role!=='teacher'))throw new HttpError(400,'Linked account must belong to this school.')
    }
    if(row.classId){const [classroom]=await db.select().from(classes).where(and(eq(classes.id,row.classId),eq(classes.schoolId,req.user.schoolId)));if(!classroom)throw new HttpError(400,'Class must belong to this school.')}
  }
  router.use(allow('superadmin', 'admin', 'manager', 'teacher', 'student', 'accountant'))
  
  router.get('/', asyncRoute(async (req, res) => {
    res.json((await db.select().from(students).where(studentScope(req.user))).map(studentView))
  }))

  router.post('/', allow('superadmin', 'admin', 'manager'), asyncRoute(async (req, res) => {
    const row = studentRow(studentInput.parse(req.body))
    await validateLinks(req,row)
    const schoolId = req.user.schoolId
    
    if (!schoolId) throw new HttpError(400, 'You must be associated with a school to create students.')

    let loginId
    const saved = await mutate(db, req.user, 'students.create', async tx => {
      // 1. Get next student ID from school
      const [updatedSchool] = await tx.update(schools)
        .set({ studentSeq: sql`${schools.studentSeq} + 1` })
        .where(eq(schools.id, schoolId))
        .returning()
      
      loginId = updatedSchool.studentSeq - 1
      const studentUserId = randomUUID()
      const temporaryPassword = randomBytes(18).toString('base64url')
      const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12)

      // 2. Create login account in users table
      await tx.insert(users).values({
        id: studentUserId,
        schoolId,
        loginId,
        fullName: row.fullName,
        role: 'student',
        passwordHash: temporaryPasswordHash,
        firstLogin: true,
        isVerified: true
      })

      // 3. Create student profile linked to the user account
      const [student] = await tx.insert(students).values({
        ...row,
        schoolId,
        id: studentUserId // Link student record to the newly created user record
      }).returning()
      return {...student, temporaryPassword}
    })

    const { temporaryPassword, ...student } = saved
    res.status(201).json({...studentView(student),loginId,temporaryPassword})
  }))

  router.put('/:id', allow('superadmin', 'admin', 'manager'), asyncRoute(async (req, res) => {
    const row = studentRow({ ...studentInput.parse(req.body), id: req.params.id })
    await validateLinks(req,row)
    const [saved] = await mutate(db, req.user, 'students.update', tx => 
      tx.update(students).set(row).where(and(eq(students.id, req.params.id),studentScope(req.user))).returning()
    )
    if (!saved) throw new HttpError(404, 'Student not found.')
    
    // Update users table fullName if it changed
    if (row.fullName) {
      await mutate(db, null, 'users.update_fullname', tx => 
        tx.update(users).set({ fullName: row.fullName }).where(eq(users.id, req.params.id))
      )
    }

    res.json(studentView(saved))
  }))
  
  return router
}
