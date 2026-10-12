import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { and, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { classes, schools, users } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'

export function classesRoutes(db) {
  const input=z.object({name:z.string().trim().min(1).max(120),level:z.enum(['Lower','Middle','Upper']).optional(),section:z.string().max(30).optional(),academicYear:z.string().max(30).optional(),room:z.string().max(80).optional(),teacherId:z.string().nullable().optional(),capacity:z.coerce.number().int().min(1).max(1000).optional(),status:z.enum(['Active','Inactive']).optional(),progressionOrder:z.coerce.number().int().min(1).nullable().optional(),nextClassId:z.string().nullable().optional(),courseEnabled:z.coerce.boolean().optional(),courseRankLimit:z.coerce.number().int().min(1).max(1000).optional(),coursePassMark:z.coerce.number().int().min(0).max(100).optional()}).strict()
  const router = Router()
  const validateTeacher=async(req,details)=>{
    if(!details.teacherId)return
    const [teacher]=await db.select().from(users).where(and(eq(users.id,details.teacherId),eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher')))
    if(!teacher)throw new HttpError(400,'Teacher must belong to this school.')
  }
  const validateNextClass=async(req,nextClassId,currentId)=>{
    if(!nextClassId)return
    if(nextClassId===currentId)throw new HttpError(400,'A class cannot progress to itself.')
    const [next]=await db.select().from(classes).where(and(eq(classes.id,nextClassId),eq(classes.schoolId,req.user.schoolId)))
    if(!next)throw new HttpError(400,'Next class must belong to this school.')
    if(currentId){const rows=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),byId=new Map(rows.map(row=>[row.id,row]));let cursor=next;for(let count=0;cursor&&count<=rows.length;count++){if(cursor.id===currentId)throw new HttpError(400,'Class progression cannot contain a cycle.');cursor=byId.get(cursor.nextClassId)}}
  }
  router.use(allow('superadmin', 'admin', 'manager', 'accountant'))

  router.get('/', asyncRoute(async (req, res) => {
    const schoolId = req.user.schoolId
    if (!schoolId) return res.json([])
    const data = await db.select().from(classes).where(eq(classes.schoolId, schoolId))
    res.json(data)
  }))

  router.post('/', allow('superadmin','admin','manager'), asyncRoute(async (req, res) => {
    const { name,progressionOrder=null,nextClassId=null,courseEnabled=false,courseRankLimit=25,coursePassMark=50,...details } = input.parse(req.body)
    await validateTeacher(req,details)
    await validateNextClass(req,nextClassId)
    const schoolId = req.user.schoolId
    if (!schoolId) throw new HttpError(400, 'Admin must be associated with a school.')
    if (!name) throw new HttpError(400, 'Class name is required.')

    const [created] = await mutate(db, req.user, 'classes.create', async tx => {
      const [updatedSchool] = await tx.update(schools)
        .set({ classSeq: sql`${schools.classSeq} + 1` })
        .where(eq(schools.id, schoolId))
        .returning()
      
      const loginId = `CLS-${updatedSchool.classSeq - 1}`

      return tx.insert(classes).values({
        id: randomUUID(),
        schoolId,
        loginId,
        name,details,progressionOrder,nextClassId,courseEnabled,courseRankLimit,coursePassMark
      }).returning()
    })
    
    res.status(201).json(created)
  }))

  router.put('/:id', allow('superadmin','admin','manager'), asyncRoute(async (req, res) => {
    const { name,progressionOrder=null,nextClassId=null,courseEnabled=false,courseRankLimit=25,coursePassMark=50,...details } = input.parse(req.body)
    await validateTeacher(req,details)
    await validateNextClass(req,nextClassId,req.params.id)
    const [updated] = await mutate(db, req.user, 'classes.update', tx => 
      tx.update(classes).set({ name,details,progressionOrder,nextClassId,courseEnabled,courseRankLimit,coursePassMark }).where(and(eq(classes.id, req.params.id),eq(classes.schoolId,req.user.schoolId))).returning()
    )
    if (!updated) throw new HttpError(404, 'Class not found.')
    res.json(updated)
  }))

  return router
}
