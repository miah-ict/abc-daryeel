import { Router } from 'express'
import { z } from 'zod'
import { asyncRoute,HttpError } from '../middleware/error.middleware.js'
import { canAccessRole } from '../middleware/auth.middleware.js'
import { readWorkspace,saveWorkspace } from '../services/workspace.js'
import { fixtures } from '../db/fixtures.js'
export function workspaceRoutes(db) {
 const router=Router()
 router.use('/:role',(req,res,next)=>canAccessRole(req.user,req.params.role)?next():next(new HttpError(403,'This dashboard is outside your role.')))
 router.get('/:role',asyncRoute(async(req,res)=>{
  const role=req.params.role,result=await readWorkspace(db,req.user,role)
  // Defaults describe empty modules; school records never fall back to browser fixtures.
  for(const [key,value] of Object.entries(fixtures[role]||{})) if(!(key in result.data)) {
   result.data[key]=Array.isArray(value)?[]:typeof value==='boolean'?false:typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='boolean'?v:typeof v==='number'?0:''])):value
  }
  const settingsKey={teacher:'abc-teacher-settings',accountant:'abc-finance-settings',superadmin:'abc-super-settings',admin:'abc-admin-settings'}[role]
  if(settingsKey&&!result.data[settingsKey]?.name)result.data[settingsKey]={...result.data[settingsKey],name:req.user.fullName,email:req.user.email,school:'ABC Daycare & Kindergarten'}
  if(role==='student') {
    result.data['abc-student-profile'] ||= {}
    result.data['abc-student-profile']={name:req.user.fullName,guardian:req.user.fullName,email:req.user.email,...result.data['abc-student-profile']}
  }
  res.json(result)
 }))
 router.put('/:role',asyncRoute(async(req,res)=>{
  const body=z.object({revision:z.number().int().nonnegative(),changes:z.record(z.string(),z.unknown())}).strict().parse(req.body)
  if(Object.keys(body.changes).length>30)throw new HttpError(400,'Too many workspace changes.')
  res.json(await saveWorkspace(db,req.user,req.params.role,body.changes,body.revision))
 }))
 return router
}
