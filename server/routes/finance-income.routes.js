import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { classes, feePlans, financeSettings, invoices, receipts, schools, students, transactions } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { mutate } from '../services/mutate.js'
import { date } from '../services/validation.js'
import { assertOpenFinancePeriod, financeSchoolId, moneyCents, moneyString } from './finance-core.js'

const amount = z.union([z.string(), z.number()])
const oneTimeFee = z.object({name:z.string().trim().min(1).max(100),amount,month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)}).strict()
const planInput = z.object({
  className: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(120),
  tuition: amount, materials: amount, transport: amount, effectiveFrom: date,
  active: z.enum(['Active', 'Inactive']).default('Active'),
  classId: z.string().trim().min(1).max(200).nullable().optional(),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  billingMonths: z.coerce.number().int().min(1).max(12).default(12),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  oneTimeFees: z.array(oneTimeFee).max(12).default([]),
}).strict()
const incomeInput = z.object({
  source: z.string().trim().min(1).max(120), category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(250), amount, date,
  method: z.string().trim().min(1).max(80), reference: z.string().trim().max(120).optional(),
  idempotencyKey: z.string().trim().min(1).max(200).optional(),
}).strict()
const viewPlan = p => ({...p, tuition:Number(p.tuition), materials:Number(p.materials), transport:Number(p.transport),oneTimeFees:p.oneTimeFees||[]})
const viewTransaction = t => ({...t, amount:Number(t.amount)})
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const monthAt=(start,offset)=>{const [year,month]=start.split('-').map(Number),value=new Date(Date.UTC(year,month-1+offset,1));return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}`}
const monthDate=(month,day)=>{const [year,value]=month.split('-').map(Number),last=new Date(Date.UTC(year,value,0)).getUTCDate();return `${month}-${String(Math.min(day,last)).padStart(2,'0')}`}

async function assertClass(tx,schoolId,classId,className){
  if(!classId)return null
  const [row]=await tx.select().from(classes).where(and(eq(classes.id,classId),eq(classes.schoolId,schoolId)))
  if(!row||row.name!==className)throw new HttpError(400,'Selected class does not belong to this school.')
  return row
}
async function generatePlanInvoices(tx,schoolId,plan){
  const roster=await tx.select().from(students).where(eq(students.schoolId,schoolId))
  const enrolled=roster.filter(student=>student.status!=='Inactive'&&student.gradeLevel===plan.className)
  const monthly=moneyCents(plan.tuition,{allowZero:true})+moneyCents(plan.materials,{allowZero:true})+moneyCents(plan.transport,{allowZero:true})
  let created=0
  for(const student of enrolled){
    if(monthly>0)for(let offset=0;offset<plan.billingMonths;offset+=1){
      const period=monthAt(plan.startMonth||plan.effectiveFrom.slice(0,7),offset),issued=`${period}-01`,due=monthDate(period,plan.dueDay)
      const rows=await tx.insert(invoices).values({id:randomUUID(),schoolId,studentId:student.id,feePlanId:plan.id,billingPeriod:period,
        scheduleKey:`${plan.id}:${student.id}:monthly:${period}`,description:`${plan.name} · ${period}`,amount:moneyString(monthly),paid:'0.00',issued,due})
        .onConflictDoNothing().returning({id:invoices.id});created+=rows.length
    }
    for(const fee of plan.oneTimeFees||[]){
      const cents=moneyCents(fee.amount),issued=`${fee.month}-01`,due=monthDate(fee.month,plan.dueDay)
      const slug=fee.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'fee'
      const rows=await tx.insert(invoices).values({id:randomUUID(),schoolId,studentId:student.id,feePlanId:plan.id,billingPeriod:fee.month,
        scheduleKey:`${plan.id}:${student.id}:once:${fee.month}:${slug}`,description:fee.name,amount:moneyString(cents),paid:'0.00',issued,due})
        .onConflictDoNothing().returning({id:invoices.id});created+=rows.length
    }
  }
  return {created,students:enrolled.length}
}

export function financeIncomeRoutes(db) {
  const router = Router()
  router.use(allow('superadmin', 'accountant'))
  router.use((req, _res, next) => { try { req.financeSchoolId = financeSchoolId(req.user); next() } catch (error) { next(error) } })

  router.get('/fee-plans', asyncRoute(async (req, res) => {
    const rows = await db.select().from(feePlans).where(eq(feePlans.schoolId, req.financeSchoolId))
    res.json(rows.map(viewPlan))
  }))
  router.post('/fee-plans', asyncRoute(async (req, res) => {
    const data = planInput.parse(req.body)
    const values = Object.fromEntries(['tuition','materials','transport'].map(key => [key, moneyString(moneyCents(data[key], {allowZero:true}))]))
    const [row] = await mutate(db, req.user, 'finance.fee-plan', async tx => {await assertClass(tx,req.financeSchoolId,data.classId,data.className);return tx.insert(feePlans).values({...data,startMonth:data.startMonth||data.effectiveFrom.slice(0,7),...values,id:randomUUID(),schoolId:req.financeSchoolId}).returning()})
    res.status(201).json(viewPlan(row))
  }))
  router.put('/fee-plans/:id', asyncRoute(async (req, res) => {
    const data = planInput.parse(req.body)
    const values = Object.fromEntries(['tuition','materials','transport'].map(key => [key, moneyString(moneyCents(data[key], {allowZero:true}))]))
    const row = await mutate(db, req.user, 'finance.fee-plan.update', async tx => {
      const [existing] = await tx.select().from(feePlans).where(and(eq(feePlans.id,req.params.id),eq(feePlans.schoolId,req.financeSchoolId)))
      if (!existing) throw new HttpError(404,'Fee plan not found.')
      await assertClass(tx,req.financeSchoolId,data.classId,data.className)
      const [saved] = await tx.update(feePlans).set({...data,startMonth:data.startMonth||data.effectiveFrom.slice(0,7),...values}).where(and(eq(feePlans.id,req.params.id),eq(feePlans.schoolId,req.financeSchoolId))).returning()
      return saved
    })
    res.json(viewPlan(row))
  }))
  router.post('/fee-plans/:id/generate', asyncRoute(async(req,res)=>{
    const result=await mutate(db,req.user,'finance.fee-plan.generate',async tx=>{
      const [plan]=await tx.select().from(feePlans).where(and(eq(feePlans.id,req.params.id),eq(feePlans.schoolId,req.financeSchoolId))).for('update')
      if(!plan)throw new HttpError(404,'Fee plan not found.')
      return generatePlanInvoices(tx,req.financeSchoolId,plan)
    })
    res.json(result)
  }))
  router.put('/onboarding',asyncRoute(async(req,res)=>{
    const input=z.object({receiptAddress:z.string().trim().max(250).default(''),
      receiptPhone:z.string().trim().max(80).default(''),plans:z.array(planInput).min(1).max(100)}).strict().parse(req.body)
    const result=await mutate(db,req.user,'finance.onboarding.complete',async tx=>{
      const [school]=await tx.select().from(schools).where(eq(schools.id,req.financeSchoolId))
      if(!school)throw new HttpError(404,'School not found.')
      const generated=[]
      for(const data of input.plans){
        await assertClass(tx,req.financeSchoolId,data.classId,data.className)
        const values=Object.fromEntries(['tuition','materials','transport'].map(key=>[key,moneyString(moneyCents(data[key],{allowZero:true}))]))
        const [existing]=data.classId?await tx.select().from(feePlans).where(and(eq(feePlans.schoolId,req.financeSchoolId),eq(feePlans.classId,data.classId),eq(feePlans.active,'Active'))):[]
        let plan
        if(existing){[plan]=await tx.update(feePlans).set({...data,startMonth:data.startMonth||data.effectiveFrom.slice(0,7),...values}).where(eq(feePlans.id,existing.id)).returning()}
        else [plan]=await tx.insert(feePlans).values({...data,startMonth:data.startMonth||data.effectiveFrom.slice(0,7),...values,id:randomUUID(),schoolId:req.financeSchoolId}).returning()
        generated.push({plan:viewPlan(plan),...await generatePlanInvoices(tx,req.financeSchoolId,plan)})
      }
      const settings={receiptName:school.name,receiptAddress:input.receiptAddress,receiptPhone:input.receiptPhone,currency:'USD',
        onboardingComplete:true,onboardingCompletedAt:new Date(),onboardingCompletedBy:req.user.id,updatedAt:new Date()}
      const [existingSettings]=await tx.select().from(financeSettings).where(eq(financeSettings.schoolId,req.financeSchoolId))
      if(existingSettings)await tx.update(financeSettings).set(settings).where(eq(financeSettings.schoolId,req.financeSchoolId))
      else await tx.insert(financeSettings).values({...settings,schoolId:req.financeSchoolId})
      return {onboardingComplete:true,schoolName:school.name,generated}
    })
    res.json(result)
  }))
  router.get('/outstanding', asyncRoute(async (req, res) => {
    const [bills, roster] = await Promise.all([
      db.select().from(invoices).where(eq(invoices.schoolId,req.financeSchoolId)),
      db.select({id:students.id,name:students.fullName,className:students.gradeLevel,guardian:students.guardian}).from(students).where(eq(students.schoolId,req.financeSchoolId)),
    ])
    const byId = new Map(roster.map(s => [s.id,s]))
    const now = today()
    const rows = bills.map(i => {
      const balance = moneyCents(i.amount)-moneyCents(i.paid,{allowZero:true})
      const age = i.due < now ? Math.floor((Date.parse(`${now}T00:00:00Z`)-Date.parse(`${i.due}T00:00:00Z`))/86400000) : 0
      return {...i,amount:Number(i.amount),paid:Number(i.paid),balance:balance/100,ageDays:age,
        status:balance===0?'Paid':i.due<now?'Overdue':Number(i.paid)>0?'Partial':'Pending',student:byId.get(i.studentId)||null}
    })
    res.json(rows.filter(i => (!req.query.studentId||i.studentId===req.query.studentId)
      && (!req.query.className||i.student?.className===req.query.className)
      && (!req.query.status||i.status===req.query.status)
      && (req.query.includePaid==='true'||i.balance>0)))
  }))
  router.post('/other-income', asyncRoute(async (req, res) => {
    const data = incomeInput.parse(req.body), cents = moneyCents(data.amount)
    if (/^(school fees|student fees)$/i.test(data.category)) throw new HttpError(400,'Collect student fees against an invoice.')
    const result = await mutate(db,req.user,'finance.other-income',async tx => {
      if (data.idempotencyKey) {
        const [existing] = await tx.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.idempotencyKey,data.idempotencyKey)))
        if (existing) {
          if (existing.type!=='Income'||existing.invoiceId||moneyCents(existing.amount)!==cents||existing.date!==data.date||existing.payee!==data.source) throw new HttpError(409,'Idempotency key was already used.')
          const [receipt] = await tx.select().from(receipts).where(eq(receipts.transactionId,existing.id))
          if (!receipt) throw new HttpError(409,'Existing income has no receipt.')
          return {transaction:existing,receipt,duplicate:true}
        }
      }
      await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
      const [entry] = await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,createdBy:req.user.id,
        date:data.date,type:'Income',category:data.category,description:data.description,amount:moneyString(cents),
        method:data.method,reference:data.reference||null,payee:data.source,idempotencyKey:data.idempotencyKey||null}).returning()
      const receiptId = randomUUID()
      const [receipt] = await tx.insert(receipts).values({id:receiptId,schoolId:req.financeSchoolId,
        number:`R-${data.date.replaceAll('-','')}-${receiptId.slice(0,13).replace('-','').toUpperCase()}`,
        transactionId:entry.id,payer:data.source}).returning()
      return {transaction:entry,receipt,duplicate:false}
    })
    res.status(result.duplicate?200:201).json({transaction:viewTransaction(result.transaction),receipt:result.receipt})
  }))
  return router
}
