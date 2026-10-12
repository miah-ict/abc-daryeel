import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { academicYears, exams, examResults, studentEnrollments, students, systemLogs } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { date } from '../services/validation.js'

export function academicYearsRoutes(db) {
  const router=Router()
  const input=z.object({name:z.string().trim().min(3).max(40),startDate:date,endDate:date}).strict()
  router.use(allow('admin','manager','teacher','student','accountant'))

  router.get('/',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(academicYears).where(eq(academicYears.schoolId,req.user.schoolId||''))
    res.json(rows.sort((a,b)=>b.startDate.localeCompare(a.startDate)))
  }))

  router.post('/',allow('admin'),asyncRoute(async(req,res)=>{
    const row=input.parse(req.body)
    if(row.endDate<=row.startDate)throw new HttpError(400,'End date must be after start date.')
    const existing=await db.select().from(academicYears).where(eq(academicYears.schoolId,req.user.schoolId))
    if(existing.some(year=>row.startDate<=year.endDate&&row.endDate>=year.startDate))throw new HttpError(409,'Academic year dates overlap an existing year.')
    const created=await db.transaction(async tx=>{
      const [year]=await tx.insert(academicYears).values({...row,id:randomUUID(),schoolId:req.user.schoolId,status:existing.length?'Draft':'Active'}).returning()
      if(year.status==='Active'){const roster=await tx.select().from(students).where(eq(students.schoolId,req.user.schoolId));for(const student of roster.filter(item=>item.classId))await tx.insert(studentEnrollments).values({id:randomUUID(),schoolId:req.user.schoolId,studentId:student.id,academicYearId:year.id,classId:student.classId,source:'Initial Year'}).onConflictDoNothing()}
      await tx.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'academic-year.create',detail:year.name})
      return year
    })
    res.status(201).json(created)
  }))

  router.post('/:id/start',allow('admin'),asyncRoute(async(req,res)=>{
    const result=await db.transaction(async tx=>{
      const [target]=await tx.select().from(academicYears).where(and(eq(academicYears.id,req.params.id),eq(academicYears.schoolId,req.user.schoolId))).for('update')
      if(!target)throw new HttpError(404,'Academic year not found.')
      if(target.status==='Active')return target
      if(target.status==='Closed')throw new HttpError(400,'A closed academic year cannot be restarted.')
      const [active]=await tx.select().from(academicYears).where(and(eq(academicYears.schoolId,req.user.schoolId),eq(academicYears.status,'Active')))
      if(active) {
        const open=await tx.select().from(exams).where(and(eq(exams.academicYearId,active.id),eq(exams.status,'Collecting')))
        if(open.length)throw new HttpError(409,'Publish or cancel every open exam before closing the academic year.')
        const results=await tx.select().from(examResults).innerJoin(exams,eq(examResults.examId,exams.id)).where(and(eq(exams.academicYearId,active.id),eq(examResults.outcome,'Failed')))
        if(results.some(row=>row.exams.type!=='Course'&&!row.exam_results.failedDecision))throw new HttpError(409,'Resolve every failed student before closing the academic year.')
        await tx.update(academicYears).set({status:'Closed'}).where(eq(academicYears.id,active.id))
      }
      const [started]=await tx.update(academicYears).set({status:'Active'}).where(eq(academicYears.id,target.id)).returning()
      const roster=await tx.select().from(students).where(eq(students.schoolId,req.user.schoolId))
      for(const student of roster.filter(item=>item.classId))await tx.insert(studentEnrollments).values({id:randomUUID(),schoolId:req.user.schoolId,studentId:student.id,academicYearId:target.id,classId:student.classId,source:'Year Start'}).onConflictDoNothing()
      await tx.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'academic-year.start',detail:target.name})
      return started
    })
    res.json(result)
  }))
  return router
}
