import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { bills, transactions, users } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { mutate } from '../services/mutate.js'
import { date, id } from '../services/validation.js'
import { assertOpenFinancePeriod, financeSchoolId, moneyCents, moneyString } from './finance-core.js'

const amount = z.union([z.number(),z.string()])
const text = z.string().trim().min(1).max(250)
const expenseInput = z.object({payee:text,category:text,description:text,amount,date,method:text,
  reference:z.string().trim().max(120).optional(),notes:z.string().trim().max(1000).optional(),
  idempotencyKey:z.string().trim().min(1).max(200).optional()}).strict()
const payrollInput = z.object({staffId:id,period:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  gross:amount,deductions:amount,date,method:text,reference:z.string().trim().max(120).optional(),
  notes:z.string().trim().max(1000).optional()}).strict()
const billInput = z.object({vendor:text,description:text,category:text,amount,issued:date,due:date}).strict()
const billPaymentInput = z.object({amount,date,method:text,reference:z.string().trim().max(120).optional(),
  idempotencyKey:z.string().trim().min(1).max(200).optional()}).strict()
const viewTransaction = t => ({...t,amount:Number(t.amount)})
const viewBill = b => ({...b,amount:Number(b.amount),paid:Number(b.paid)})

export function financeExpensesRoutes(db) {
  const router=Router()
  router.use(allow('superadmin','accountant'))
  router.use((req,_res,next)=>{try{req.financeSchoolId=financeSchoolId(req.user);next()}catch(error){next(error)}})

  router.get('/staff',asyncRoute(async(req,res)=>{
    const rows=await db.select({id:users.id,fullName:users.fullName,role:users.role,status:users.status,
      loginId:users.loginId}).from(users).where(eq(users.schoolId,req.financeSchoolId))
    res.json(rows.filter(u=>!['student','superadmin'].includes(u.role)&&u.status==='Active'))
  }))
  router.get('/staff-payments',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.category,'Salaries')))
    res.json(rows.filter(t=>t.staffId).map(viewTransaction))
  }))
  router.post('/staff-payments',asyncRoute(async(req,res)=>{
    const data=payrollInput.parse(req.body)
    const gross=moneyCents(data.gross),deductions=moneyCents(data.deductions,{allowZero:true}),net=gross-deductions
    if(net<=0)throw new HttpError(400,'Net pay must be positive.')
    const saved=await mutate(db,req.user,'finance.staff-payment',async tx=>{
      const [person]=await tx.select({id:users.id,fullName:users.fullName,role:users.role,status:users.status}).from(users)
        .where(and(eq(users.id,data.staffId),eq(users.schoolId,req.financeSchoolId))).for('update')
      if(!person||person.status!=='Active'||['student','superadmin'].includes(person.role))throw new HttpError(404,'Active staff member not found.')
      const prior=await tx.select({id:transactions.id}).from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.staffId,data.staffId),eq(transactions.payPeriod,data.period)))
      if(prior.length)throw new HttpError(409,'This staff member already has a payment for this period.')
      await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
      const [entry]=await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,createdBy:req.user.id,
        type:'Expense',category:'Salaries',description:`Staff pay · ${person.fullName} · ${data.period}`,
        amount:moneyString(net),date:data.date,method:data.method,reference:data.reference||null,
        payee:person.fullName,staffId:person.id,payPeriod:data.period,
        metadata:{gross:moneyString(gross),deductions:moneyString(deductions),notes:data.notes||''}}).returning()
      return entry
    })
    res.status(201).json(viewTransaction(saved))
  }))
  router.get('/school-expenses',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.type,'Expense')))
    res.json(rows.filter(t=>!t.staffId).map(viewTransaction))
  }))
  router.post('/school-expenses',asyncRoute(async(req,res)=>{
    const data=expenseInput.parse(req.body),cents=moneyCents(data.amount)
    if(data.category==='Salaries')throw new HttpError(400,'Use Staff Payments for salaries.')
    const result=await mutate(db,req.user,'finance.school-expense',async tx=>{
      if(data.idempotencyKey){
        const [existing]=await tx.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.idempotencyKey,data.idempotencyKey)))
        if(existing){
          if(existing.type!=='Expense'||moneyCents(existing.amount)!==cents||existing.date!==data.date||existing.payee!==data.payee)throw new HttpError(409,'Idempotency key was already used.')
          return {entry:existing,duplicate:true}
        }
      }
      await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
      const [entry]=await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,createdBy:req.user.id,
        type:'Expense',category:data.category,description:data.description,amount:moneyString(cents),date:data.date,
        method:data.method,reference:data.reference||null,payee:data.payee,idempotencyKey:data.idempotencyKey||null,
        metadata:{notes:data.notes||''}}).returning()
      return {entry,duplicate:false}
    })
    res.status(result.duplicate?200:201).json(viewTransaction(result.entry))
  }))
  router.get('/bills',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(bills).where(eq(bills.schoolId,req.financeSchoolId))
    res.json(rows.map(viewBill))
  }))
  router.post('/bills',asyncRoute(async(req,res)=>{
    const data=billInput.parse(req.body),cents=moneyCents(data.amount)
    if(data.due<data.issued)throw new HttpError(400,'Due date must be on or after issue date.')
    const [saved]=await mutate(db,req.user,'finance.bill',tx=>tx.insert(bills).values({...data,id:randomUUID(),schoolId:req.financeSchoolId,amount:moneyString(cents)}).returning())
    res.status(201).json(viewBill(saved))
  }))
  router.post('/bills/:id/payments',asyncRoute(async(req,res)=>{
    const data=billPaymentInput.parse(req.body),cents=moneyCents(data.amount)
    const result=await mutate(db,req.user,'finance.bill-payment',async tx=>{
      if(data.idempotencyKey){
        const [existing]=await tx.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.idempotencyKey,data.idempotencyKey)))
        if(existing){
          if(existing.billId!==req.params.id||moneyCents(existing.amount)!==cents||existing.date!==data.date||existing.method!==data.method)throw new HttpError(409,'Idempotency key was already used.')
          return {entry:existing,duplicate:true}
        }
      }
      const [bill]=await tx.select().from(bills).where(and(eq(bills.id,req.params.id),eq(bills.schoolId,req.financeSchoolId))).for('update')
      if(!bill)throw new HttpError(404,'Bill not found.')
      await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
      const paid=moneyCents(bill.paid,{allowZero:true}),total=moneyCents(bill.amount)
      if(cents>total-paid)throw new HttpError(400,'Payment exceeds bill balance.')
      await tx.update(bills).set({paid:moneyString(paid+cents),status:paid+cents===total?'Paid':'Partial'})
        .where(and(eq(bills.id,bill.id),eq(bills.schoolId,req.financeSchoolId)))
      const [entry]=await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,createdBy:req.user.id,
        billId:bill.id,type:'Expense',category:bill.category,description:`Bill payment · ${bill.id} · ${bill.description}`,
        amount:moneyString(cents),date:data.date,method:data.method,reference:data.reference||null,
        payee:bill.vendor,idempotencyKey:data.idempotencyKey||null}).returning()
      return {entry,duplicate:false}
    })
    res.status(result.duplicate?200:201).json(viewTransaction(result.entry))
  }))
  return router
}
