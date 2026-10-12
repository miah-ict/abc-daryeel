import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { eq, sql } from 'drizzle-orm'
import { randomBytes, randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { users, schools } from '../db/schema/index.js'
import { userInput } from '../services/validation.js'
import { allow, publicUser } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { assertSubscriptionSeat } from '../services/subscriptionQuota.js'

export function usersRoutes(db) {
  const router = Router()
  router.use(allow('superadmin', 'admin', 'manager'))
  
  router.get('/', asyncRoute(async (req, res) => {
    const query = req.user.role === 'superadmin' 
      ? db.select().from(users) 
      : db.select().from(users).where(eq(users.schoolId, req.user.schoolId))
    res.json((await query).map(publicUser))
  }))

  const save = async (req, res) => {
    const parsed = req.params.id ? userInput.partial().parse(req.body) : userInput.parse(req.body)
    let { password, ...data } = parsed
    const managedRoles = ['teacher','accountant','guard','cleaner','cooking','driver','ict']
    if(req.user.role==='manager' && data.role && !managedRoles.includes(data.role))throw new HttpError(403,'Managers can create teachers and staff only.')
    if(req.user.role==='admin' && data.role && ['admin','superadmin'].includes(data.role))throw new HttpError(403,'This account role requires super administrator access.')
    
    // For update
    if (req.params.id) {
      const [current] = await db.select().from(users).where(eq(users.id, req.params.id))
      if (!current) throw new HttpError(404, 'User not found.')
      if(req.user.role!=='superadmin' && current.schoolId!==req.user.schoolId)throw new HttpError(404,'User not found.')
      if(req.user.role==='manager' && !managedRoles.includes(current.role))throw new HttpError(403,'Managers can edit teachers and staff only.')
      const nextRole = data.role || current.role
      const nextStatus = data.status || current.status
      if (req.params.id === req.user.id && (nextRole !== 'admin' && nextRole !== 'superadmin' || nextStatus !== 'Active')) {
        throw new HttpError(400, 'You cannot disable or demote your own account.')
      }
      if (data.role && data.role !== current.role) throw new HttpError(400, 'Account role cannot be changed after an ID is issued.')
      if (password) {
        if (password.length < 12) throw new HttpError(400, 'Password must contain at least 12 characters.')
        data.passwordHash = await bcrypt.hash(password, 12)
        data.sessionVersion = sql`${users.sessionVersion} + 1`
      }
      
      const [user] = await mutate(db, req.user, 'users.update', async tx => {
        const [latest] = await tx.select().from(users).where(eq(users.id, req.params.id))
        if (!latest) throw new HttpError(404, 'User not found.')
        const nextStatus = data.status || latest.status
        if (latest.status !== 'Active' && nextStatus === 'Active') {
          if (latest.schoolId) await tx.select({ id: schools.id }).from(schools).where(eq(schools.id, latest.schoolId)).for('update')
          await assertSubscriptionSeat(tx, { schoolId: latest.schoolId, role: latest.role, excludeUserId: latest.id })
        }
        return tx.update(users).set(data).where(eq(users.id, req.params.id)).returning()
      })
      return res.status(200).json(publicUser(user))
    }
    
    // For creation
    const schoolId = req.user.schoolId
    if (!schoolId) throw new HttpError(400, 'You must be associated with a school to create users.')

    const [school] = await db.select().from(schools).where(eq(schools.id, schoolId))
    if (!school) throw new HttpError(404, 'School not found.')

    const isStudent = data.role === 'student'
    
    const temporaryPassword = randomBytes(18).toString('base64url')
    const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12)
    
    const [user] = await mutate(db, req.user, 'users.create', async tx => {
      await tx.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).for('update')
      if (data.status === 'Active') await assertSubscriptionSeat(tx, { schoolId, role: data.role })
      let loginId;
      if(data.role==='manager') {
        const [updatedSchool] = await tx.update(schools).set({managerSeq:sql`${schools.managerSeq} + 1`}).where(eq(schools.id,schoolId)).returning()
        loginId=updatedSchool.managerSeq-1
        if(loginId>49)throw new HttpError(400,'Maximum manager capacity reached (010-049).')
      } else if(data.role==='accountant') {
        const [updatedSchool] = await tx.update(schools).set({accountantSeq:sql`${schools.accountantSeq} + 1`}).where(eq(schools.id,schoolId)).returning()
        loginId=updatedSchool.accountantSeq-1
        if(loginId>99)throw new HttpError(400,'Maximum accountant capacity reached (050-099).')
      } else if (isStudent) {
        const [updatedSchool] = await tx.update(schools)
          .set({ studentSeq: sql`${schools.studentSeq} + 1` })
          .where(eq(schools.id, schoolId))
          .returning()
        loginId = updatedSchool.studentSeq - 1
      } else {
        const [updatedSchool] = await tx.update(schools)
          .set({ staffSeq: sql`${schools.staffSeq} + 1` })
          .where(eq(schools.id, schoolId))
          .returning()
        loginId = updatedSchool.staffSeq - 1
        if (loginId > 999) throw new HttpError(400, 'Maximum staff capacity reached (0100-0999).')
      }

      return tx.insert(users).values({
        ...data,
        id: randomUUID(),
        schoolId,
        loginId,
        passwordHash: temporaryPasswordHash,
        firstLogin: true,
        isVerified: true, // Auto verified since admin created them
        email: data.email || null // Email is optional for generated accounts
      }).returning()
    })
    
    res.status(201).json({...publicUser(user),temporaryPassword})
  }
  
  router.post('/', asyncRoute(save))
  router.put('/:id', asyncRoute(save))
  
  return router
}
