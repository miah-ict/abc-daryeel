import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { and,eq,inArray } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { attendance,students } from '../db/schema/index.js'
import { attendanceInput,date } from '../services/validation.js'
import { studentScope } from '../services/workspace.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute,HttpError } from '../middleware/error.middleware.js'
export function attendanceRoutes(db) {
 const router=Router()
 router.use(allow('superadmin','admin','manager','teacher','student'))
 router.get('/',asyncRoute(async(req,res)=>{
  const roster=await db.select({id:students.id}).from(students).where(studentScope(req.user))
  if(!roster.length)return res.json([])
  res.json(await db.select().from(attendance).where(and(inArray(attendance.studentId,roster.map(s=>s.id)),req.query.date?eq(attendance.date,date.parse(req.query.date)):undefined)))
 }))
 router.post('/',allow('superadmin','admin','manager','teacher'),asyncRoute(async(req,res)=>{
  const data=attendanceInput.parse(req.body)
  const [student]=await db.select().from(students).where(and(eq(students.id,data.studentId),studentScope(req.user)))
  if(!student)throw new HttpError(403,'Student is outside your roster.')
  const updates={status:data.status,notes:data.notes||'',recordedBy:req.user.id,...(data.arrivalTime!==undefined?{arrivalTime:data.arrivalTime}: {})}
  const [saved]=await mutate(db,req.user,'attendance.record',tx=>tx.insert(attendance).values({...data,id:randomUUID(),recordedBy:req.user.id}).onConflictDoUpdate({target:[attendance.studentId,attendance.date],set:updates}).returning())
  res.json(saved)
 }))
 return router
}
