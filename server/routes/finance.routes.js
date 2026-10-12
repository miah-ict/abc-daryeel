import {mutate} from '../services/mutate.js'
import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { transactions,invoices,receipts,students } from '../db/schema/index.js'
import { transactionInput,date,id } from '../services/validation.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute,HttpError } from '../middleware/error.middleware.js'
import { assertOpenFinancePeriod,financeSchoolId,moneyCents,moneyString } from './finance-core.js'

const invoiceInput=z.object({studentId:id,description:z.string().trim().min(1).max(250),amount:z.union([z.number(),z.string()]),issued:date,due:date}).strict()
const paymentInput=z.object({invoiceId:id,amount:z.union([z.number(),z.string()]),date,method:z.string().trim().min(1).max(80),idempotencyKey:z.string().trim().min(1).max(200).optional()}).strict()
const invoiceView=i=>({...i,amount:Number(i.amount),paid:Number(i.paid)})
const transactionView=t=>({...t,amount:Number(t.amount)})
export function financeRoutes(db) {
 const router=Router();router.use(allow('superadmin','accountant'))
 router.use((req,_res,next)=>{try{req.financeSchoolId=financeSchoolId(req.user);next()}catch(error){next(error)}})
 router.get('/transactions',asyncRoute(async(req,res)=>res.json((await db.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId))).map(transactionView))))
 router.get('/invoices',asyncRoute(async(req,res)=>res.json((await db.select().from(invoices).where(eq(invoices.schoolId,req.financeSchoolId))).map(invoiceView))))
 router.get('/summary',asyncRoute(async(req,res)=>{
  const [ledger,bills]=await Promise.all([db.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId)),db.select().from(invoices).where(eq(invoices.schoolId,req.financeSchoolId))])
  const sum=type=>ledger.filter(t=>t.type===type&&t.status==='Paid').reduce((n,t)=>n+moneyCents(t.amount),0)
  const income=sum('Income'),expenses=sum('Expense'),refunds=sum('Refund'),pending=bills.reduce((n,i)=>n+moneyCents(i.amount)-moneyCents(i.paid,{allowZero:true}),0)
  res.json({income:income/100,expenses:expenses/100,refunds:refunds/100,net:(income-expenses-refunds)/100,pending:pending/100})
 }))
 router.post('/invoices',asyncRoute(async(req,res)=>{
  const data=invoiceInput.parse(req.body),amount=moneyCents(data.amount)
  if(data.due<data.issued)throw new HttpError(400,'Due date must be on or after the issue date.')
  const saved=await mutate(db,req.user,'finance.invoice',async tx=>{
   const [student]=await tx.select({id:students.id}).from(students).where(and(eq(students.id,data.studentId),eq(students.schoolId,req.financeSchoolId)))
   if(!student)throw new HttpError(404,'Student not found.')
   await assertOpenFinancePeriod(tx,req.financeSchoolId,data.issued)
   const [invoice]=await tx.insert(invoices).values({id:randomUUID(),schoolId:req.financeSchoolId,studentId:student.id,description:data.description,amount:moneyString(amount),paid:'0.00',issued:data.issued,due:data.due}).returning()
   return invoice
  });res.status(201).json(invoiceView(saved))
 }))
 router.post('/transactions',asyncRoute(async(req,res)=>{
  const data=transactionInput.parse(req.body)
  if(data.invoiceId)throw new HttpError(400,'Record invoice payments through /api/finance/payments.')
  if(data.type==='Income'&&/^(school fees|student fees)$/i.test(data.category))throw new HttpError(400,'Collect student fees against an invoice.')
  if(data.type==='Expense'&&data.category==='Salaries')throw new HttpError(400,'Use Staff Payments for salaries.')
  const cents=moneyCents(data.amount)
  const saved=await mutate(db,req.user,'finance.transaction',async tx=>{
   await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
   const [entry]=await tx.insert(transactions).values({...data,id:data.id||randomUUID(),schoolId:req.financeSchoolId,amount:moneyString(cents),createdBy:req.user.id}).returning()
   if(data.type!=='Income')return {entry,receipt:null}
   const receiptId=randomUUID()
   const [receipt]=await tx.insert(receipts).values({id:receiptId,schoolId:req.financeSchoolId,
    number:`R-${data.date.replaceAll('-','')}-${receiptId.slice(0,13).replace('-','').toUpperCase()}`,
    transactionId:entry.id,payer:data.description}).returning()
   return {entry,receipt}
  });res.status(201).json({...transactionView(saved.entry),receipt:saved.receipt})
 }))
 router.post('/payments',asyncRoute(async(req,res)=>{
  const data=paymentInput.parse(req.body),cents=moneyCents(data.amount)
  const result=await mutate(db,req.user,'finance.payment',async tx=>{
   if(data.idempotencyKey){
    const [existing]=await tx.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),eq(transactions.idempotencyKey,data.idempotencyKey)))
    if(existing){
     if(existing.invoiceId!==data.invoiceId||existing.date!==data.date||existing.method!==data.method||moneyCents(existing.amount)!==cents)throw new HttpError(409,'Idempotency key was already used for another payment.')
     const [receipt]=await tx.select().from(receipts).where(and(eq(receipts.schoolId,req.financeSchoolId),eq(receipts.transactionId,existing.id)))
     if(!receipt)throw new HttpError(409,'Payment already exists without a receipt.')
     return {entry:existing,receipt,duplicate:true}
    }
   }
   const [bill]=await tx.select().from(invoices).where(and(eq(invoices.id,data.invoiceId),eq(invoices.schoolId,req.financeSchoolId))).for('update')
   if(!bill)throw new HttpError(404,'Invoice not found.')
   await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
   const paid=moneyCents(bill.paid,{allowZero:true}),total=moneyCents(bill.amount)
   if(cents>total-paid)throw new HttpError(400,'Payment exceeds the remaining balance.')
   await tx.update(invoices).set({paid:moneyString(paid+cents)}).where(and(eq(invoices.id,bill.id),eq(invoices.schoolId,req.financeSchoolId)))
   const [entry]=await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,invoiceId:bill.id,idempotencyKey:data.idempotencyKey||null,date:data.date,method:data.method,type:'Income',category:'School Fees',description:`Payment · ${bill.id}`,amount:moneyString(cents),createdBy:req.user.id}).returning()
   const [student]=await tx.select({fullName:students.fullName}).from(students).where(and(eq(students.id,bill.studentId),eq(students.schoolId,req.financeSchoolId)))
   const receiptId=randomUUID()
   const [receipt]=await tx.insert(receipts).values({id:receiptId,schoolId:req.financeSchoolId,number:`R-${data.date.replaceAll('-','')}-${receiptId.slice(0,13).replace('-','').toUpperCase()}`,transactionId:entry.id,payer:student?.fullName||bill.studentId}).returning()
   return {entry,receipt,duplicate:false}
  });res.status(result.duplicate?200:201).json({...result.entry,receipt:result.receipt})
 }))
 router.get('/receipts',asyncRoute(async(req,res)=>{
  const rows=await db.select().from(receipts).where(eq(receipts.schoolId,req.financeSchoolId))
  const ledger=await db.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId))
  const byId=new Map(ledger.map(t=>[t.id,t]))
  res.json(rows.filter(r=>byId.has(r.transactionId)).map(r=>({...r,transaction:transactionView(byId.get(r.transactionId))})))
 }))
 router.get('/receipts/:id',asyncRoute(async(req,res)=>{
  const [receipt]=await db.select().from(receipts).where(and(eq(receipts.id,req.params.id),eq(receipts.schoolId,req.financeSchoolId)))
  if(!receipt)throw new HttpError(404,'Receipt not found.')
  const [entry]=await db.select().from(transactions).where(and(eq(transactions.id,receipt.transactionId),eq(transactions.schoolId,req.financeSchoolId)))
  if(!entry)throw new HttpError(404,'Receipt not found.')
  let invoice=null,student=null
  if(entry.invoiceId){
   [invoice]=await db.select().from(invoices).where(and(eq(invoices.id,entry.invoiceId),eq(invoices.schoolId,req.financeSchoolId)))
   if(invoice)[student]=await db.select({id:students.id,fullName:students.fullName}).from(students).where(and(eq(students.id,invoice.studentId),eq(students.schoolId,req.financeSchoolId)))
  }
  res.json({...receipt,transaction:transactionView(entry),invoice:invoice?invoiceView(invoice):null,student:student||null})
 }))
 // Additional finance modules are mounted by the application after this core router.
 return router
}
