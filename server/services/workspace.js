import {fixtures,readonly} from '../db/fixtures.js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, or, sql } from 'drizzle-orm'
import { users, students, classes, schools, attendance, invoices, transactions, workspaces, systemLogs } from '../db/schema/index.js'
import { HttpError } from '../middleware/error.middleware.js'
import { studentInput, transactionInput, attendanceInput } from './validation.js'
import {validateManagerRecords} from './managerValidation.js'
import {assertSubscriptionSeat} from './subscriptionQuota.js'
export const rolePrefix = {admin:'abc-admin-',manager:'abc-manager-',teacher:'abc-teacher-',student:'abc-student-',accountant:'abc-finance-',superadmin:'abc-super-'}
export const studentView = s => ({...s.details,id:s.id,name:s.fullName,group:s.gradeLevel,class:s.gradeLevel,classId:s.classId||null,guardian:s.guardian,email:s.email,status:s.status,parentId:s.parentId,teacherId:s.teacherId,dateOfBirth:s.dateOfBirth||s.details?.dateOfBirth||'',emergencyContact:s.emergencyContact||s.details?.guardianPhone||''})
export const studentRow = s => ({id:s.id || randomUUID(),fullName:s.name,gradeLevel:s.group || s.class || 'Unassigned',classId:s.classId||null,guardian:s.guardian || '',email:s.email || '',status:s.status || 'Active',parentId:s.parentId || null,teacherId:s.teacherId || null,dateOfBirth:s.dateOfBirth||null,emergencyContact:s.guardianPhone||s.emergencyContact||null,details:s})
const directoryRole = role => ({Manager:'manager',Teacher:'teacher',Staff:'cleaner',Administrator:'admin','Super Admin':'superadmin',Accountant:'accountant',Guard:'guard',Student:'student',Cleaner:'cleaner',Cook:'cooking',Driver:'driver',ICT:'ict'}[role] || role)
const directoryLabel = role => ({manager:'Manager',teacher:'Teacher',admin:'Administrator',superadmin:'Super Admin',accountant:'Accountant',guard:'Guard',student:'Student',cleaner:'Cleaner',cooking:'Cook',driver:'Driver',ict:'ICT'}[role] || 'Staff')
const tenantId = user => user.schoolId||user.id
const scopeKey = user => ['admin','manager','accountant'].includes(user.role)?`${user.role}:${tenantId(user)}`:['teacher','student'].includes(user.role) ? `${user.role}:${user.id}` : user.role
const classView = classroom => ({...classroom.details,...classroom})
const schoolInfo = value => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try { return JSON.parse(value) }
  catch { return {description:String(value)} }
}

// Older admin builds stored classes inside the workspace JSON. Move those
// records into the canonical classes table so Admin and Manager always read
// and validate the same school-owned records.
async function legacyAdminOwner(db) {
  const [owner]=await db.select({id:users.id,schoolId:users.schoolId}).from(users).where(eq(users.role,'admin')).orderBy(asc(users.createdAt),asc(users.id)).limit(1)
  return owner?tenantId(owner):null
}

async function legacyAdminData(db,state,user) {
  if(!state.data?.admin||tenantId(user)!==await legacyAdminOwner(db))return null
  return state.data.admin
}

async function schoolClasses(db,user,legacyData) {
  if(!user.schoolId)return []
  let rows=await db.select().from(classes).where(eq(classes.schoolId,user.schoolId))
  if(!legacyData) {
    // Hide out-of-scope legacy rows without deleting classes that records may reference.
    rows=rows.filter(row=>!row.details?.legacyId)
    return rows.map(classView)
  }
  const knownNames=new Set(rows.map(row=>String(row.name).trim().toLowerCase()))
  const legacy=Array.isArray(legacyData['abc-admin-classes'])?legacyData['abc-admin-classes']:[]
  const occupiedIds=new Set((await db.select({id:classes.id}).from(classes)).map(row=>row.id))
  for(const classroom of legacy) {
    const name=String(classroom?.name||'').trim()
    if(!name||(classroom.schoolId&&classroom.schoolId!==user.schoolId)||knownNames.has(name.toLowerCase()))continue
    const {id:legacyId,schoolId:_schoolId,loginId:_loginId,name:_name,createdAt:_createdAt,details:legacyDetails,...fields}=classroom
    const id=legacyId&&!occupiedIds.has(legacyId)?legacyId:randomUUID()
    await db.insert(classes).values({
      id,
      schoolId:user.schoolId,
      loginId:`LEGACY-${legacyId||id}`,
      name,
      details:{...(legacyDetails&&typeof legacyDetails==='object'?legacyDetails:{}),...fields,legacyId:legacyId||null},
    })
    occupiedIds.add(id)
    knownNames.add(name.toLowerCase())
  }
  if(legacy.length)rows=await db.select().from(classes).where(eq(classes.schoolId,user.schoolId))
  return rows.map(classView)
}
export function studentScope(user) {
  return user.role === 'student' ? or(eq(students.parentId,user.id),eq(students.id,user.id)) : user.role === 'teacher' ? eq(students.teacherId,user.id) : user.schoolId ? eq(students.schoolId,user.schoolId) : ['manager','admin','accountant'].includes(user.role)?sql`false`:undefined
}
export async function readWorkspace(db,user,role=user.role) {
  const effective = {...user,role}
  if(role==='accountant'&&!user.schoolId)throw new HttpError(403,'Select a school account for finance records.')
  const [state] = await db.select().from(workspaces).where(eq(workspaces.id,'school'))
  if (!state) throw new HttpError(503,'Initialize the database with npm run db:seed.')
  const legacyAdmin=['admin','manager'].includes(role)?await legacyAdminData(db,state,user):null
  const data = structuredClone(state.data[scopeKey(effective)] || (role==='admin'?legacyAdmin:null) || {})
  for(const [name,value] of Object.entries(fixtures[role]||{}))if(!(name in data))data[name]=Array.isArray(value)?[]:typeof value==='boolean'?false:typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='boolean'?v:typeof v==='number'?0:''])):value
  const settingsKey={teacher:'abc-teacher-settings',accountant:'abc-finance-settings',superadmin:'abc-super-settings',admin:'abc-admin-settings'}[role]
  const [memberSchool]=user.schoolId?await db.select({name:schools.name}).from(schools).where(eq(schools.id,user.schoolId)):[]
  if(settingsKey&&!data[settingsKey]?.name)data[settingsKey]={...data[settingsKey],name:user.fullName,email:user.email,school:memberSchool?.name||'School'}
  const roster = await db.select().from(students).where(studentScope(effective))
  if(['admin','manager'].includes(role)) {
    const schoolUsers=await db.select().from(users).where(eq(users.schoolId,user.schoolId||''))
    const registeredClasses=await schoolClasses(db,user,legacyAdmin)
    const view=u=>({...u.details,id:u.id,name:u.fullName,email:u.email||'',role:u.role,status:u.status,loginId:u.loginId,teacherId:u.loginId,staffId:u.loginId})
    const prefix=role==='manager'?'abc-manager-':'abc-admin-'
    data[`${prefix}teachers`]=schoolUsers.filter(u=>u.role==='teacher').map(view)
    data[`${prefix}staff`]=schoolUsers.filter(u=>['manager','accountant','guard','cleaner','cooking','driver','ict'].includes(u.role)).map(view)
    if(role==='admin') data['abc-admin-classes']=registeredClasses
    if(role==='manager') {
    const teacherIds=new Set(schoolUsers.filter(u=>u.role==='teacher').map(u=>u.id))
    const adminData=state.data[`admin:${user.schoolId}`]||legacyAdmin||{}
    data['abc-manager-subjects']=(adminData['abc-admin-subjects']||[]).filter(subject=>(subject.teacherIds||[]).some(id=>teacherIds.has(id)))
    const accounts=new Map(schoolUsers.map(u=>[u.id,u]))
    data['abc-manager-students']=roster.map(s=>({...studentView(s),loginId:accounts.get(s.id)?.loginId||null}))
    data['abc-manager-classes']=registeredClasses
    const [school]=await db.select().from(schools).where(eq(schools.id,user.schoolId||''))
    data['abc-manager-settings']={...data['abc-manager-settings'],name:data['abc-manager-settings']?.name||user.fullName,email:data['abc-manager-settings']?.email||user.email||'',school:data['abc-manager-settings']?.school||school?.name||'School'}
    }
  }
  if (['admin','teacher','accountant'].includes(role)) data[`${rolePrefix[role]}students`] = roster.map(studentView)
  const records = roster.length ? await db.select().from(attendance).where(inArray(attendance.studentId,roster.map(s=>s.id))) : []
  if (['admin','teacher'].includes(role)) data[`${rolePrefix[role]}attendance`] = records.reduce((all,r)=>{ (all[r.date] ||= {})[r.studentId]=r.status;return all },{})
  if(role==='student') {data['abc-student-profile']={name:roster[0]?.fullName||user.fullName,guardian:user.fullName,email:user.email,...Object.fromEntries(Object.entries(data['abc-student-profile']||{}).filter(([,v])=>v!=='')),studentId:roster[0]?.id||'',gradeLevel:roster[0]?.gradeLevel||'Awaiting enrollment'};}
  if(role==='student') data['abc-student-attendance'] = records.map(r=>({id:r.id,date:r.date,status:r.status}))
  if(role==='accountant') {
    data['abc-finance-invoices'] = (await db.select().from(invoices).where(eq(invoices.schoolId,user.schoolId))).map(i=>({...i,amount:Number(i.amount),paid:Number(i.paid)}))
    data['abc-finance-transactions'] = (await db.select().from(transactions).where(eq(transactions.schoolId,user.schoolId))).map(t=>({...t,amount:Number(t.amount)}))
  }
  if(role==='superadmin') {
    const registeredSchools=await db.select().from(schools)
    const studentCounts=roster.reduce((counts,student)=>counts.set(student.schoolId,(counts.get(student.schoolId)||0)+1),new Map())
    data['abc-super-schools']=registeredSchools.map(school=>{
      const info=schoolInfo(school.info)
      return {id:school.id,name:school.name,location:info.location||'',email:info.email||'',status:info.status||'Active',students:studentCounts.get(school.id)||0}
    })
    data['abc-super-users']=(await db.select().from(users)).map(u=>({id:u.id,name:u.fullName,email:u.email,role:directoryLabel(u.role),school:u.schoolId,status:u.status}))
  }
  const content={...structuredClone(readonly[role]||{}),...structuredClone(state.data[`content:${role}`] || {})}
  if(role==='admin')content.linkAccounts=(await db.select().from(users).where(eq(users.schoolId,user.schoolId||''))).filter(u=>['teacher','student'].includes(u.role)&&u.status==='Active').map(u=>({id:u.id,name:u.fullName,role:u.role}))
  if(role==='student'&&!roster.length)Object.assign(content,{subjects:[],studentActivities:[],studentAnnouncements:[],studentGallery:[]})
  return {data,revision:state.revision,content,summary:{students:roster.length},overview:state.data[`overview:${role}`] || {title:'School workspace',greet:'Welcome to ABC',desc:'Your school operations overview',metrics:[],donut:0}}
}
const supplemental = {
 manager:['schedule','teacher-attendance','staff-attendance','substitutes','monitoring','leave-requests','expenses','procurements','maintenance','kitchen','transport','tasks','messages','activity','reports','settings','dark','teachers','staff','students','classes'],
 admin:['teachers','staff','classes','subjects','staff-attendance','settings','dark'],
 teacher:['lessons','assignments','scores','messages','activity','settings','dark'],
 student:['profile','settings','assignments','messages','favorites'],
 accountant:['fees','settings','dark'],
 superadmin:['schools','programs','logs','settings','dark','backup-history'],
}
export async function saveWorkspace(db,user,role,changes,revision) {
  if(role==='accountant'&&!user.schoolId)throw new HttpError(403,'Select a school account for finance records.')
  return db.transaction(async tx => {
    const [state] = await tx.select().from(workspaces).where(eq(workspaces.id,'school')).for('update')
    if (!state || state.revision!==revision) throw new HttpError(409,'School data changed. Reload before saving again.')
    const effective={...user,role},prefix=rolePrefix[role]
    if(!prefix) throw new HttpError(403,'This workspace is read only.')
    const data=structuredClone(state.data),key=scopeKey(effective)
    const legacyAdmin=role==='admin'?await legacyAdminData(tx,state,user):null
    data[key] ||= structuredClone(legacyAdmin||{})
    if(legacyAdmin)delete data.admin
    const canonical=[`${prefix}students`,`${prefix}attendance`,...(role==='accountant'?['abc-finance-invoices','abc-finance-transactions']:[]),...(role==='superadmin'?['abc-super-users']:[])]
    const allowed=[...(supplemental[role]||[]).map(k=>prefix+k),...canonical]
    for(const [name,value] of Object.entries(changes)) {
      const suffix=name.slice(prefix.length),arrays=['students','teachers','staff','classes','subjects','lessons','assignments','messages','activity','fees','invoices','transactions','users','schools','programs','logs','backup-history','favorites']
      if(role==='manager' && suffix!=='settings' && suffix!=='dark' && !Array.isArray(value))throw new HttpError(400,`Invalid ${suffix}: expected a list.`)
      if(role==='manager' && Array.isArray(value) && (value.length>10000 || value.some(v=>!v||typeof v!=='object'||Array.isArray(v))))throw new HttpError(400,'Invalid manager records.')
      if(arrays.includes(suffix)&&!Array.isArray(value))throw new HttpError(400,`Invalid ${suffix}: expected a list.`)
      if(role!=='manager' && ['profile','settings','scores','attendance','staff-attendance'].includes(suffix)&&(value===null||typeof value!=='object'||Array.isArray(value)))throw new HttpError(400,`Invalid ${suffix}: expected an object.`)
      if(suffix==='dark'&&typeof value!=='boolean')throw new HttpError(400,'Invalid theme preference.')
      if(!allowed.includes(name) || (role==='student' && name.endsWith('attendance'))) throw new HttpError(403,`Cannot update ${name}`)
      if(role==='manager')await validateManagerRecords(tx,user.schoolId,suffix,value)
      if(role==='manager' && ['teachers','staff','students','classes'].includes(suffix)) {
        const table=suffix==='students'?students:suffix==='classes'?classes:users
        const own=await tx.select({id:table.id}).from(table).where(eq(table.schoolId,user.schoolId||''))
        const ids=new Set(own.map(r=>r.id))
        if(value.some(entry=>!ids.has(entry.id)))throw new HttpError(403,'Record is outside your school.')
      } else if(name===`${prefix}students` && ['admin','teacher','accountant'].includes(role)) {
        if(role==='accountant')throw new HttpError(403,'Finance can only view student records.')
        if(!Array.isArray(value)||value.length>10000) throw new HttpError(400,'Invalid student directory.')
        const old=await tx.select().from(students).where(studentScope(effective)),byId=new Map(old.map(s=>[s.id,s]))
        for(const entry of value) {
          const s=studentInput.parse(entry),existing=byId.get(s.id)
          if(role==='teacher'&&!existing) throw new HttpError(403,'Only assigned students can be edited.')
          if(role!=='admin'&&role!=='superadmin'&&existing&&((s.parentId!==undefined&&s.parentId!==existing.parentId)||(s.teacherId!==undefined&&s.teacherId!==existing.teacherId)))throw new HttpError(403,'Only an administrator can assign a guardian or teacher.')
          const row={...studentRow({...s,parentId:s.parentId!==undefined?s.parentId:existing?.parentId,teacherId:s.teacherId!==undefined?s.teacherId:existing?.teacherId}),schoolId:existing?.schoolId||user.schoolId||null}
          if(role!=='admin' && existing && (row.parentId!==existing.parentId || row.teacherId!==existing.teacherId)) throw new HttpError(403,'Only an administrator can assign a guardian or teacher.')
          await tx.insert(students).values(row).onConflictDoUpdate({target:students.id,set:row})
        }
      } else if(name===`${prefix}attendance` && ['admin','teacher'].includes(role)) {
        const roster=await tx.select().from(students).where(studentScope(effective)),ids=new Set(roster.map(s=>s.id))
        for(const [day,marks] of Object.entries(value)) for(const [studentId,status] of Object.entries(marks)) {
          const r=attendanceInput.parse({studentId,date:day,status})
          if(!ids.has(studentId)) throw new HttpError(403,'Student is outside your roster.')
          await tx.insert(attendance).values({...r,id:randomUUID(),recordedBy:user.id}).onConflictDoUpdate({target:[attendance.studentId,attendance.date],set:{status,recordedBy:user.id}})
        }
      } else if(name==='abc-finance-invoices') {
        if(!Array.isArray(value)) throw new HttpError(400,'Invalid invoices.')
        const old=await tx.select().from(invoices).where(eq(invoices.schoolId,user.schoolId)),byId=new Map(old.map(i=>[i.id,i]))
        for(const i of value) {
          const existing=byId.get(i.id)
          if(!existing || Number(existing.amount)!==i.amount || existing.studentId!==i.studentId || !Number.isFinite(i.paid) || i.paid<Number(existing.paid) || i.paid>i.amount) throw new HttpError(400,'Invoice details cannot be changed through a payment.')
          const delta=Math.round((i.paid-Number(existing.paid))*100)
          if(delta) {
            const oldTransactions=await tx.select().from(transactions).where(and(eq(transactions.schoolId,user.schoolId),eq(transactions.invoiceId,i.id))),known=new Set(oldTransactions.map(t=>t.id))
            const entries=(changes['abc-finance-transactions']||[]).filter(t=>t.invoiceId===i.id&&!known.has(t.id))
            if(entries.some(t=>t.type!=='Income')||entries.reduce((sum,t)=>sum+Math.round(t.amount*100),0)!==delta) throw new HttpError(400,'Payment and invoice balance must be saved together.')
          }
          await tx.update(invoices).set({paid:String(i.paid)}).where(and(eq(invoices.schoolId,user.schoolId),eq(invoices.id,i.id)))
        }
      } else if(name==='abc-finance-transactions') {
        if(!Array.isArray(value)) throw new HttpError(400,'Invalid ledger.')
        for(const entry of value) {
          const {createdBy,status,schoolId,createdAt,billId,sourceTransactionId,idempotencyKey,reference,payee,staffId,payPeriod,metadata,...input}=entry,t=transactionInput.parse(input)
          const [existing]=await tx.select().from(transactions).where(eq(transactions.id,t.id))
          if(existing) {
            if(existing.schoolId!==user.schoolId)throw new HttpError(403,'Ledger entry is outside your school.')
            continue // Posted ledger entries are immutable.
          }
          if(t.invoiceId && !changes['abc-finance-invoices']) throw new HttpError(400,'Save the invoice payment with the ledger entry.')
          if(t.invoiceId) {
            const [bill]=await tx.select().from(invoices).where(eq(invoices.id,t.invoiceId))
            if(!bill||bill.schoolId!==user.schoolId)throw new HttpError(403,'Invoice is outside your school.')
          }
          await tx.insert(transactions).values({...t,id:t.id||randomUUID(),schoolId:user.schoolId,amount:String(t.amount),createdBy:user.id})
        }
      } else if(name==='abc-super-users') {
        if(!Array.isArray(value)) throw new HttpError(400,'Invalid user directory.')
        for(const u of value) {
          if(!u.name||!z.string().email().safeParse(u.email).success||!['Active','Inactive'].includes(u.status)) throw new HttpError(400,'Invalid user.')
          const role=directoryRole(u.role),[existing]=await tx.select().from(users).where(eq(users.id,u.id))
          if(!['manager','teacher','admin','superadmin','guard','cleaner','cooking','driver','ict','accountant','student'].includes(role)) throw new HttpError(400,'Invalid account role.')
          if(existing?.loginId!=null&&role!==existing.role)throw new HttpError(400,'Numeric account roles cannot be changed.')
          if(u.id===user.id && (u.status!=='Active'||role!=='superadmin')) throw new HttpError(400,'You cannot disable or demote your own account.')
          const row={id:u.id,fullName:u.name,email:u.email.toLowerCase(),role:existing && u.role===directoryLabel(existing.role)?existing.role:role,status:u.status,schoolId:u.school||null}
          const consumesNewSeat=['manager','accountant'].includes(row.role) && row.status==='Active' &&
            (!existing || existing.status!=='Active' || existing.role!==row.role || existing.schoolId!==row.schoolId)
          if(consumesNewSeat)await assertSubscriptionSeat(tx,{schoolId:row.schoolId,role:row.role,excludeUserId:existing?.id||null})
          if(u.password)row.passwordHash=await bcrypt.hash(z.string().min(12).max(128).parse(u.password),12)
          await tx.insert(users).values(row).onConflictDoUpdate({target:users.id,set:row})
        }
      } else if(name==='abc-super-schools') {
        if(!Array.isArray(value))throw new HttpError(400,'Invalid school directory.')
        const existingSchools=await tx.select().from(schools),byId=new Map(existingSchools.map(school=>[school.id,school]))
        for(const school of value) {
          if(!school?.id||!school?.name||!['Active','Inactive'].includes(school.status)||!z.union([z.string().email(),z.literal('')]).safeParse(school.email||'').success)throw new HttpError(400,'Invalid school.')
          const existing=byId.get(school.id),info={...schoolInfo(existing?.info),location:String(school.location||''),email:String(school.email||'').toLowerCase(),status:school.status}
          if(existing)await tx.update(schools).set({name:String(school.name).trim(),info:JSON.stringify(info)}).where(eq(schools.id,school.id))
          else await tx.insert(schools).values({id:school.id,name:String(school.name).trim(),info:JSON.stringify(info)})
        }
      } else data[key][name]=value
    }
    const [saved]=await tx.update(workspaces).set({data,revision:state.revision+1}).where(eq(workspaces.id,'school')).returning()
    await tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId||null,action:'workspace.update',detail:Object.keys(changes).join(', ')})
    return readWorkspace(tx,user,role)
  })
}
