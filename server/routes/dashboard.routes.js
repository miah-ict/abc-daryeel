import { Router } from 'express'
import { asyncRoute,HttpError } from '../middleware/error.middleware.js'
import { canAccessRole } from '../middleware/auth.middleware.js'
import { readWorkspace } from '../services/workspace.js'
export function dashboardRoutes(db) {
 const router=Router()
 router.get('/:role',asyncRoute(async(req,res)=>{
  const role=req.params.role
  if(!canAccessRole(req.user,role))throw new HttpError(403,'This dashboard is outside your role.')
  const {data,revision,summary}=await readWorkspace(db,req.user,role)
  const roster=data['abc-admin-students']||data['abc-teacher-students']||data['abc-finance-students']||[]
  const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const marks=(data['abc-admin-attendance']||data['abc-teacher-attendance']||{})[day]||{}
  const ledger=data['abc-finance-transactions']||[],bills=data['abc-finance-invoices']||[]
  const sum=type=>ledger.filter(t=>t.type===type).reduce((n,t)=>n+t.amount,0)
  res.json({role,revision,students:summary.students,attendance:{present:Object.values(marks).filter(s=>s==='Present').length,absent:Object.values(marks).filter(s=>s==='Absent').length},
   ...(role==='superadmin'?{users:data['abc-super-users'].length,centers:(data['abc-super-schools']||[]).length}:{}),
   ...(role==='accountant'?{finance:{income:sum('Income'),expenses:sum('Expense'),pending:bills.reduce((n,i)=>n+Math.max(0,i.amount-i.paid),0)}}:{})})
 }))
 return router
}
