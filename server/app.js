import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { and, desc, eq, like, or, sql } from 'drizzle-orm'
import { authenticate,allow } from './middleware/auth.middleware.js'
import { asyncRoute,errorMiddleware } from './middleware/error.middleware.js'
import { authRoutes } from './routes/auth.routes.js'
import { usersRoutes } from './routes/users.routes.js'
import { studentsRoutes } from './routes/students.routes.js'
import { attendanceRoutes } from './routes/attendance.routes.js'
import { financeRoutes } from './routes/finance.routes.js'
import { financeIncomeRoutes } from './routes/finance-income.routes.js'
import { financeExpensesRoutes } from './routes/finance-expenses.routes.js'
import { financeControlsRoutes } from './routes/finance-controls.routes.js'
import { dashboardRoutes } from './routes/dashboard.routes.js'
import { workspaceRoutes } from './routes/workspace.routes.js'
import { classesRoutes } from './routes/classes.routes.js'
import { examsRoutes } from './routes/exams.routes.js'
import { academicYearsRoutes } from './routes/academic-years.routes.js'
import { studentPortalRoutes } from './routes/student-portal.routes.js'
import { examsV2Routes } from './routes/exams-v2.routes.js'
import { billingPublicRoutes, billingRoutes } from './routes/billing.routes.js'
import { systemLogs,users } from './db/schema/index.js'
import { corsOptions, enforceCookieOrigin, rateLimit, securityHeaders, validateRequestShape } from './middleware/security.middleware.js'
import { createEmailService } from './services/email.js'
export function createApp(db,env) {
 const app=express(),auth=authenticate(db,env),emailService=createEmailService(env)
 app.disable('x-powered-by')
 if (env.TRUST_PROXY) app.set('trust proxy', 1)
 app.use(securityHeaders(env))
 app.use(cors(corsOptions(env)))
 app.use(express.json({limit:'2mb'}))
 app.use(validateRequestShape)
 app.use('/api', rateLimit({limit: env.NODE_ENV === 'test' ? 10_000 : 300}))
 app.get('/api/health',asyncRoute(async(req,res)=>{await db.execute(sql`select 1`);res.json({status:'ok',database:'connected',email:{configured:emailService.configured,provider:emailService.provider}})}))
 app.use('/api/auth',authRoutes(db,env,auth))
 app.use('/api/billing',billingPublicRoutes(db,env))
 app.use('/api',auth)
 app.use('/api',enforceCookieOrigin(env))
 app.use('/api/billing',billingRoutes(db,env))
 app.use('/api/users',usersRoutes(db));app.use('/api/superadmin/users',allow('superadmin'),usersRoutes(db))
 app.get('/api/superadmin/logs',allow('superadmin'),asyncRoute(async(req,res)=>{const limit=Math.min(100,Math.max(1,Number.parseInt(String(req.query.limit||'50'),10)||50));res.json(await db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(limit))}))
 app.get('/api/admin/notifications',allow('admin'),asyncRoute(async(req,res)=>{
  const rows=await db.select({id:systemLogs.id,action:systemLogs.action,detail:systemLogs.detail,createdAt:systemLogs.createdAt,
   actorName:users.fullName}).from(systemLogs).leftJoin(users,eq(systemLogs.actorId,users.id))
   .where(and(eq(systemLogs.schoolId,req.user.schoolId),or(like(systemLogs.action,'finance.onboarding%'),like(systemLogs.action,'finance.fee-plan%'),eq(systemLogs.action,'finance.settings'))))
   .orderBy(desc(systemLogs.createdAt)).limit(12)
  res.json(rows)
 }))
 app.use('/api/students',studentsRoutes(db));app.use('/api/attendance',attendanceRoutes(db))
 app.use('/api/finance',financeRoutes(db),financeIncomeRoutes(db),financeExpensesRoutes(db),financeControlsRoutes(db));app.use('/api/dashboard',dashboardRoutes(db));app.use('/api/workspace',workspaceRoutes(db))
 app.use('/api/classes',classesRoutes(db))
 app.use('/api/exams/v2',examsV2Routes(db,env))
 app.use('/api/exams',examsRoutes(db))
 app.use('/api/academic-years',academicYearsRoutes(db))
 app.use('/api/student',studentPortalRoutes(db))
 app.use('/api',(req,res)=>res.status(404).json({error:'Endpoint not found.'}))
 if(env.NODE_ENV==='production'){
  const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist')
  app.use(express.static(dist,{index:false,maxAge:'1h'}))
  app.use((req,res,next)=>{
   if(req.method!=='GET')return res.status(404).json({error:'Endpoint not found.'})
   res.sendFile(path.join(dist,'index.html'),error=>error?next(error):undefined)
  })
 }else app.use((req,res)=>res.status(404).json({error:'Endpoint not found.'}))
 app.use(errorMiddleware)
 return app
}
