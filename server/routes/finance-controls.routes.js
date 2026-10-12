import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, eq, gte, lte, like, desc } from 'drizzle-orm'
import { z } from 'zod'
import { budgets, closings, financeSettings, invoices, refunds, schools, systemLogs, transactions, users } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { mutate } from '../services/mutate.js'
import { date, id } from '../services/validation.js'
import { assertOpenFinancePeriod, financeSchoolId, moneyCents, moneyString } from './finance-core.js'

const amount=z.union([z.string(),z.number()])
const month=z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)
const budgetInput=z.object({month,category:z.string().trim().min(1).max(80),amount}).strict()
const closingInput=z.object({kind:z.enum(['day','month']),period:z.string(),countedCash:amount.optional()}).strict()
const refundInput=z.object({transactionId:id,amount,date,method:z.string().trim().min(1).max(80),
  reason:z.string().trim().min(3).max(500),reference:z.string().trim().max(120).optional()}).strict()
const settingsInput=z.object({receiptAddress:z.string().trim().max(250),
  receiptPhone:z.string().trim().max(80),currency:z.literal('USD'),
  paymentMethods:z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  expenseCategories:z.array(z.string().trim().min(1).max(80)).min(1).max(30)}).strict()
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
const viewTransaction=t=>({...t,amount:Number(t.amount)})
const viewBudget=b=>({...b,amount:Number(b.amount)})
const viewClosing=c=>({...c,income:Number(c.income),expenses:Number(c.expenses),
  countedCash:c.countedCash==null?null:Number(c.countedCash),expectedCash:c.expectedCash==null?null:Number(c.expectedCash)})
const periodMatches=(kind,period,day)=>kind==='day'?day===period:day.startsWith(`${period}-`)
const signedCents=t=>t.type==='Income'?moneyCents(t.amount):-moneyCents(t.amount)
const posted=t=>t.status==='Paid'

async function periodSnapshot(tx,schoolId,kind,period){
  const rows=(await tx.select().from(transactions).where(eq(transactions.schoolId,schoolId))).filter(t=>posted(t)&&periodMatches(kind,period,t.date))
  const sum=type=>rows.filter(t=>t.type===type).reduce((n,t)=>n+moneyCents(t.amount),0)
  const cash=rows.filter(t=>t.method==='Cash').reduce((n,t)=>n+signedCents(t),0)
  return {rows,income:sum('Income'),expenses:sum('Expense')+sum('Refund'),refunds:sum('Refund'),cash,
    methods:Object.fromEntries([...new Set(rows.map(t=>t.method))].map(method=>[method,rows.filter(t=>t.method===method).reduce((n,t)=>n+signedCents(t),0)/100]))}
}
export function financeControlsRoutes(db){
  const router=Router()
  router.use(allow('superadmin','accountant'))
  router.use((req,_res,next)=>{try{req.financeSchoolId=financeSchoolId(req.user);next()}catch(error){next(error)}})

  router.get('/ledger',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId)).orderBy(desc(transactions.date))
    res.json(rows.filter(t=>(!req.query.from||t.date>=req.query.from)&&(!req.query.to||t.date<=req.query.to))
      .map(t=>({...viewTransaction(t),debit:t.type==='Income'?0:Number(t.amount),credit:t.type==='Income'?Number(t.amount):0,
        signedAmount:signedCents(t)/100})))
  }))
  router.get('/refunds',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(refunds).where(eq(refunds.schoolId,req.financeSchoolId))
    res.json(rows)
  }))
  router.post('/refunds',asyncRoute(async(req,res)=>{
    const data=refundInput.parse(req.body),cents=moneyCents(data.amount)
    const result=await mutate(db,req.user,'finance.refund',async tx=>{
      const [original]=await tx.select().from(transactions).where(and(eq(transactions.id,data.transactionId),eq(transactions.schoolId,req.financeSchoolId))).for('update')
      if(!original||original.type!=='Income'||original.status!=='Paid')throw new HttpError(404,'Refundable income payment not found.')
      await assertOpenFinancePeriod(tx,req.financeSchoolId,data.date)
      const prior=await tx.select().from(refunds).where(and(eq(refunds.schoolId,req.financeSchoolId),eq(refunds.originalTransactionId,original.id)))
      const reversals=prior.length?await tx.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId)):[]
      const byId=new Map(reversals.map(t=>[t.id,t]))
      const already=prior.reduce((n,r)=>n+moneyCents(byId.get(r.reversalTransactionId)?.amount||'0',{allowZero:true}),0)
      if(cents>moneyCents(original.amount)-already)throw new HttpError(400,'Refund exceeds the unrefunded collection.')
      if(original.invoiceId){
        const [bill]=await tx.select().from(invoices).where(and(eq(invoices.id,original.invoiceId),eq(invoices.schoolId,req.financeSchoolId))).for('update')
        if(!bill||cents>moneyCents(bill.paid,{allowZero:true}))throw new HttpError(409,'Invoice balance changed; refresh before refunding.')
        await tx.update(invoices).set({paid:moneyString(moneyCents(bill.paid,{allowZero:true})-cents)})
          .where(and(eq(invoices.id,bill.id),eq(invoices.schoolId,req.financeSchoolId)))
      }
      const [reversal]=await tx.insert(transactions).values({id:randomUUID(),schoolId:req.financeSchoolId,createdBy:req.user.id,
        invoiceId:original.invoiceId||null,sourceTransactionId:original.id,type:'Refund',category:original.category,
        description:`Refund · ${original.id}`,amount:moneyString(cents),date:data.date,method:data.method,
        reference:data.reference||null,payee:original.payee||null,metadata:{reason:data.reason}}).returning()
      const [record]=await tx.insert(refunds).values({id:randomUUID(),schoolId:req.financeSchoolId,
        originalTransactionId:original.id,reversalTransactionId:reversal.id,reason:data.reason,approvedBy:req.user.id}).returning()
      return {record,reversal:viewTransaction(reversal)}
    })
    res.status(201).json(result)
  }))
  router.get('/budgets',asyncRoute(async(req,res)=>{
    const rows=await db.select().from(budgets).where(eq(budgets.schoolId,req.financeSchoolId))
    const ledger=await db.select().from(transactions).where(eq(transactions.schoolId,req.financeSchoolId))
    res.json(rows.map(b=>({...viewBudget(b),actual:ledger.filter(t=>t.type==='Expense'&&t.status==='Paid'&&t.category===b.category&&t.date.startsWith(`${b.month}-`))
      .reduce((n,t)=>n+moneyCents(t.amount),0)/100})))
  }))
  router.put('/budgets',asyncRoute(async(req,res)=>{
    const data=budgetInput.parse(req.body),cents=moneyCents(data.amount,{allowZero:true})
    const saved=await mutate(db,req.user,'finance.budget',async tx=>{
      const [existing]=await tx.select().from(budgets).where(and(eq(budgets.schoolId,req.financeSchoolId),eq(budgets.month,data.month),eq(budgets.category,data.category)))
      if(existing){
        const [row]=await tx.update(budgets).set({amount:moneyString(cents),updatedBy:req.user.id,updatedAt:new Date()})
          .where(eq(budgets.id,existing.id)).returning();return row
      }
      const [row]=await tx.insert(budgets).values({...data,id:randomUUID(),schoolId:req.financeSchoolId,
        amount:moneyString(cents),updatedBy:req.user.id}).returning();return row
    })
    res.json(viewBudget(saved))
  }))
  router.get('/closings',asyncRoute(async(req,res)=>{
    res.json((await db.select().from(closings).where(eq(closings.schoolId,req.financeSchoolId))).map(viewClosing))
  }))
  router.get('/closings/preview',asyncRoute(async(req,res)=>{
    const kind=z.enum(['day','month']).parse(req.query.kind)
    const period=kind==='day'?date.parse(req.query.period):month.parse(req.query.period)
    const snapshot=await periodSnapshot(db,req.financeSchoolId,kind,period)
    res.json({kind,period,income:snapshot.income/100,expenses:snapshot.expenses/100,
      refunds:snapshot.refunds/100,expectedCash:snapshot.cash/100,methods:snapshot.methods,count:snapshot.rows.length})
  }))
  router.post('/closings',asyncRoute(async(req,res)=>{
    const data=closingInput.parse(req.body)
    const period=data.kind==='day'?date.parse(data.period):month.parse(data.period)
    if(period>today())throw new HttpError(400,'Future periods cannot be closed.')
    if(data.kind==='month'&&period>=today().slice(0,7))throw new HttpError(400,'A month can be closed only after it ends.')
    const counted=data.countedCash===undefined?null:moneyCents(data.countedCash,{allowZero:true})
    const saved=await mutate(db,req.user,'finance.closing',async tx=>{
      const [existing]=await tx.select().from(closings).where(and(eq(closings.schoolId,req.financeSchoolId),eq(closings.kind,data.kind),eq(closings.period,period)))
      if(existing)throw new HttpError(409,'This period is already closed.')
      if(data.kind==='day'){
        const [monthly]=await tx.select().from(closings).where(and(eq(closings.schoolId,req.financeSchoolId),eq(closings.kind,'month'),eq(closings.period,period.slice(0,7))))
        if(monthly)throw new HttpError(409,'The month is already closed.')
      }
      const snapshot=await periodSnapshot(tx,req.financeSchoolId,data.kind,period)
      if(data.kind==='month'){
        const closedDays=await tx.select().from(closings).where(and(eq(closings.schoolId,req.financeSchoolId),eq(closings.kind,'day')))
        const closedSet=new Set(closedDays.map(c=>c.period))
        const missing=[...new Set(snapshot.rows.map(t=>t.date))].filter(day=>!closedSet.has(day))
        if(missing.length)throw new HttpError(409,`Close transaction days first: ${missing.join(', ')}`)
      }
      const [row]=await tx.insert(closings).values({id:randomUUID(),schoolId:req.financeSchoolId,kind:data.kind,period,
        income:moneyString(snapshot.income),expenses:moneyString(snapshot.expenses),
        countedCash:counted==null?null:moneyString(counted),expectedCash:moneyString(snapshot.cash),
        snapshot:{count:snapshot.rows.length,refunds:moneyString(snapshot.refunds),methods:snapshot.methods,
          variance:counted==null?null:moneyString(counted-snapshot.cash)},closedBy:req.user.id}).returning()
      return row
    })
    res.status(201).json(viewClosing(saved))
  }))
  router.get('/reports',asyncRoute(async(req,res)=>{
    const from=req.query.from?date.parse(req.query.from):`${today().slice(0,7)}-01`
    const to=req.query.to?date.parse(req.query.to):today()
    if(to<from)throw new HttpError(400,'End date must follow start date.')
    const all=await db.select().from(transactions).where(and(eq(transactions.schoolId,req.financeSchoolId),gte(transactions.date,from),lte(transactions.date,to)))
    const rows=all.filter(posted),sum=type=>rows.filter(t=>t.type===type).reduce((n,t)=>n+moneyCents(t.amount),0)
    const open=await db.select().from(invoices).where(eq(invoices.schoolId,req.financeSchoolId))
    const income=sum('Income'),expenses=sum('Expense'),refundsCents=sum('Refund')
    const categories=Object.fromEntries([...new Set(rows.map(t=>t.category))].map(category=>[category,
      rows.filter(t=>t.category===category).reduce((n,t)=>n+signedCents(t),0)/100]))
    res.json({from,to,currency:'USD',income:income/100,expenses:expenses/100,refunds:refundsCents/100,
      net:(income-expenses-refundsCents)/100,
      outstanding:open.reduce((n,i)=>n+moneyCents(i.amount)-moneyCents(i.paid,{allowZero:true}),0)/100,
      categories,count:rows.length})
  }))
  router.get('/audit',asyncRoute(async(req,res)=>{
    const rows=await db.select({id:systemLogs.id,action:systemLogs.action,detail:systemLogs.detail,
      createdAt:systemLogs.createdAt,actorId:systemLogs.actorId,actorName:users.fullName})
      .from(systemLogs).innerJoin(users,eq(systemLogs.actorId,users.id))
      .where(and(eq(systemLogs.schoolId,req.financeSchoolId),like(systemLogs.action,'finance.%')))
      .orderBy(desc(systemLogs.createdAt))
    res.json(rows)
  }))
  router.get('/settings',asyncRoute(async(req,res)=>{
    const [[row],[school]]=await Promise.all([db.select().from(financeSettings).where(eq(financeSettings.schoolId,req.financeSchoolId)),db.select().from(schools).where(eq(schools.id,req.financeSchoolId))])
    if(!school)throw new HttpError(404,'School not found.')
    let info={};try{info=JSON.parse(school.info||'{}')}catch{}
    res.json({...(!row?{schoolId:req.financeSchoolId,receiptAddress:info.location||'',receiptPhone:info.phone||'',currency:'USD',
      paymentMethods:['Cash','Bank Transfer','Mobile Money','Card'],
      expenseCategories:['Rent','Electricity','Water','Internet','Supplies','Salaries','Other'],onboardingComplete:false}:row),
      schoolName:school.name,schoolLogo:school.logo||'',receiptName:school.name})
  }))
  router.put('/settings',asyncRoute(async(req,res)=>{
    const data=settingsInput.parse(req.body)
    const row=await mutate(db,req.user,'finance.settings',async tx=>{
      const [school]=await tx.select().from(schools).where(eq(schools.id,req.financeSchoolId))
      if(!school)throw new HttpError(404,'School not found.')
      const savedData={...data,receiptName:school.name}
      const [existing]=await tx.select().from(financeSettings).where(eq(financeSettings.schoolId,req.financeSchoolId))
      if(existing){const [saved]=await tx.update(financeSettings).set({...savedData,updatedAt:new Date()})
        .where(eq(financeSettings.schoolId,req.financeSchoolId)).returning();return saved}
      const [saved]=await tx.insert(financeSettings).values({...savedData,schoolId:req.financeSchoolId}).returning();return saved
    })
    const [school]=await db.select().from(schools).where(eq(schools.id,req.financeSchoolId))
    res.json({...row,schoolName:school.name,schoolLogo:school.logo||'',receiptName:school.name})
  }))
  return router
}
