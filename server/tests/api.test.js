import {IncomingMessage,ServerResponse} from 'node:http'
import {Duplex} from 'node:stream'
import {test,before,after} from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {drizzle} from 'drizzle-orm/pglite'
import {eq} from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {createApp} from '../app.js'
import {
 users,students,classes,invoices,transactions,workspaces,systemLogs,schools,attendance,
 portalSubjects,classSubjects,learningAssignments,assignmentSubmissions,portalAnnouncements,
 galleryItems,galleryFavorites,portalConversations,conversationParticipants,portalMessages,studentPreferences,
 academicYears,studentEnrollments,examSessionsV2,examAssignmentsV2,examResultsV2,studentPromotionsV2,
 paymentOrders,subscriptions,
} from '../db/schema/index.js'
import {readEnv} from '../config/env.js'
let client,db,app,adminToken,schoolAdminToken,schoolAdminBToken,teacherToken,guardianToken,financeToken
const env={JWT_SECRET:'test-secret-with-at-least-32-characters',CLIENT_ORIGIN:'http://localhost:5173',NODE_ENV:'test'}
// Dispatch real Express middleware through Node HTTP streams without opening a socket.
const request=(path,{token,body,method='GET'}={})=>new Promise((resolve,reject)=>{
 const chunks=[],socket=new Duplex({read(){},write(chunk,encoding,done){chunks.push(Buffer.from(chunk));done()}})
 Object.defineProperty(socket,'remoteAddress',{value:'127.0.0.1'})
 const req=new IncomingMessage(socket),res=new ServerResponse(req)
 req.complete=true;req.method=method;req.url=`/api${path}`;req.headers={host:'localhost',...(token?{authorization:`Bearer ${token}`}:{})}
 const input=body?Buffer.from(JSON.stringify(body)):null
 if(input){req.headers['content-type']='application/json';req.headers['content-length']=String(input.length)}
 res.assignSocket(socket)
 const timeout=setTimeout(()=>reject(new Error('In-process HTTP request timed out')),15000)
 res.on('finish',()=>{clearTimeout(timeout);const raw=Buffer.concat(chunks).toString();try{resolve({status:res.statusCode,body:JSON.parse(raw.slice(raw.indexOf('\r\n\r\n')+4))})}catch(err){reject(err)}})
 res.on('error',reject)
 app(req,res)
 if(input)req.push(input)
 req.push(null)
})
before(async()=>{
 client=new PGlite();db=drizzle(client)
 const files=(await fs.readdir(new URL('../db/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()
 for(const file of files)await client.exec(await fs.readFile(new URL(`../db/migrations/${file}`,import.meta.url),'utf8'))
 const passwordHash=await bcrypt.hash('correct-password',4)
 await db.insert(schools).values([{id:'school-b',name:'Zamzam Academy'},{id:'school-a',name:'Al Noor School',staffSeq:101}])
 await db.insert(users).values(['superadmin','teacher','student','accountant'].map(role=>({id:role,email:`${role}@test.edu`,fullName:`Test ${role}`,role,passwordHash,firstLogin:false,...(role==='teacher'?{schoolId:'school-a',loginId:100}:role==='accountant'?{schoolId:'school-a',loginId:99}:{})})))
 await db.insert(users).values([
  {id:'schooladmin',email:'schooladmin@test.edu',fullName:'School Admin',role:'admin',schoolId:'school-a',passwordHash,isVerified:true,firstLogin:false,createdAt:new Date('2026-01-01T00:00:00Z')},
  {id:'schooladmin-b',email:'schooladmin-b@test.edu',fullName:'Zamzam Admin',role:'admin',schoolId:'school-b',passwordHash,isVerified:true,firstLogin:false,createdAt:new Date('2026-02-01T00:00:00Z')},
  {id:'teacher-b',email:'teacher-b@test.edu',fullName:'Zamzam Teacher',role:'teacher',schoolId:'school-b',loginId:101,passwordHash,isVerified:true,firstLogin:false},
 ])
 await db.insert(paymentOrders).values([
  {id:'test-plan-a',ownerUserId:'schooladmin',planCode:'enterprise',amount:'10.00',status:'paid',paidAt:new Date('2026-01-01T00:00:00Z')},
  {id:'test-plan-b',ownerUserId:'schooladmin-b',planCode:'standard',amount:'1.00',status:'paid',paidAt:new Date('2026-01-01T00:00:00Z')},
 ])
 await db.insert(subscriptions).values([
  {id:'test-sub-a',ownerUserId:'schooladmin',schoolId:'school-a',planCode:'enterprise',status:'active',currentPeriodStart:new Date('2026-01-01T00:00:00Z'),currentPeriodEnd:new Date('2099-01-01T00:00:00Z'),paymentOrderId:'test-plan-a'},
  {id:'test-sub-b',ownerUserId:'schooladmin-b',schoolId:'school-b',planCode:'standard',status:'active',currentPeriodStart:new Date('2026-01-01T00:00:00Z'),currentPeriodEnd:new Date('2099-01-01T00:00:00Z'),paymentOrderId:'test-plan-b'},
 ])
 await db.insert(students).values([{id:'child-a',schoolId:'school-a',fullName:'Child A',gradeLevel:'KG 1',parentId:'student',teacherId:'teacher'},{id:'child-b',schoolId:'school-b',fullName:'Child B',gradeLevel:'KG 2'}])
 await db.insert(invoices).values({id:'bill-1',schoolId:'school-a',studentId:'child-a',description:'Tuition',amount:'100.00',paid:'0.00',issued:'2026-10-01',due:'2026-10-20'})
 await db.insert(workspaces).values({id:'school',data:{admin:{'abc-admin-classes':[{id:'legacy-class',name:'Legacy A',level:'Lower',section:'A',room:'A-2',capacity:25}]},'content:student':{subjects:[],studentGallery:[],studentAnnouncements:[],studentActivities:[]},'content:teacher':{teacherSchedule:[]}}})
 app=createApp(db,env)
 for(const role of ['superadmin','teacher','student','accountant']) {
  const result=await request('/auth/login',{method:'POST',body:{email:`${role}@test.edu`,password:'correct-password'}})
  assert.equal(result.status,200);assert.equal(result.body.user.passwordHash,undefined)
  if(role==='superadmin')adminToken=result.body.token
  if(role==='teacher')teacherToken=result.body.token
  if(role==='student')guardianToken=result.body.token
  if(role==='accountant')financeToken=result.body.token
 }
 const schoolAdmin=await request('/auth/login',{method:'POST',body:{email:'schooladmin@test.edu',password:'correct-password'}})
 assert.equal(schoolAdmin.status,200);schoolAdminToken=schoolAdmin.body.token
 schoolAdminBToken=jwt.sign({},env.JWT_SECRET,{subject:'schooladmin-b',expiresIn:'8h',issuer:'abc-daycare',audience:'abc-web',algorithm:'HS256'})
},{timeout:60000})
after(async()=>{if(client)await client.close()})
test('manager IDs, school isolation and operations persistence',async()=>{
 const created=await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'School Manager',role:'manager'}})
 assert.equal(created.status,201);assert.equal(created.body.loginId,10);assert.ok(created.body.temporaryPassword.length>=12)
 const login=await request('/auth/login',{method:'POST',body:{identifier:'010',schoolId:'school-a',password:created.body.temporaryPassword}})
 assert.equal(login.status,200)
 const token=login.body.token
 assert.equal(login.body.user.firstLogin,true)
 assert.equal((await request('/auth/change-password',{token,method:'POST',body:{newPassword:'new-manager-password'}})).status,200)
 const relogin=await request('/auth/login',{method:'POST',body:{identifier:'010',schoolId:'school-a',password:'new-manager-password'}})
 assert.equal(relogin.status,200)
 const activeToken=relogin.body.token
 assert.equal((await request('/auth/login',{method:'POST',body:{identifier:'010oops',schoolId:'school-a',password:'1234'}})).status,400)
 assert.equal((await request('/users',{token:activeToken,method:'POST',body:{fullName:'Forbidden Manager',role:'manager'}})).status,403)
 await db.insert(users).values({id:'other-teacher',schoolId:'school-b',loginId:100,fullName:'Other Teacher',role:'teacher'})
 assert.equal((await request('/users/other-teacher',{token:activeToken,method:'PUT',body:{fullName:'Changed'}})).status,404)
 const pupil=await request('/students',{token:activeToken,method:'POST',body:{name:'Manager Student',group:'Grade 1'}})
 assert.equal(pupil.status,201);assert.equal(pupil.body.loginId,1000)
 const [stored]=await db.select().from(students).where(eq(students.id,pupil.body.id));assert.equal(stored.schoolId,'school-a')
 const classroom=await request('/classes',{token:activeToken,method:'POST',body:{name:'Grade 1 A',level:'Lower',section:'A',academicYear:'2026–2027',room:'A-1',capacity:32}})
 assert.equal(classroom.status,201);assert.equal(classroom.body.details.level,'Lower');assert.equal(classroom.body.details.section,'A');assert.equal(classroom.body.details.academicYear,'2026–2027')
 const assigned=await request(`/students/${pupil.body.id}`,{token:activeToken,method:'PUT',body:{name:'Manager Student',group:'Grade 1 A',classId:classroom.body.id,section:'A'}})
 assert.equal(assigned.status,200);assert.equal(assigned.body.classId,classroom.body.id);assert.equal(assigned.body.section,'A')
 const [assignedRow]=await db.select().from(students).where(eq(students.id,pupil.body.id));assert.equal(assignedRow.classId,classroom.body.id)
 const workspace=await request('/workspace/manager',{token:activeToken})
 assert.equal(workspace.status,200)
 assert.ok(workspace.body.data['abc-manager-students'].some(s=>s.id===pupil.body.id))
 assert.ok(!workspace.body.data['abc-manager-teachers'].some(s=>s.id==='other-teacher'))
 const migrated=workspace.body.data['abc-manager-classes'].find(row=>row.name==='Legacy A')
 assert.ok(migrated);assert.equal(migrated.id,'legacy-class');assert.equal(migrated.section,'A');assert.equal(migrated.schoolId,'school-a')
 const [storedLegacy]=await db.select().from(classes).where(eq(classes.id,migrated.id))
 assert.equal(storedLegacy.schoolId,'school-a');assert.equal(storedLegacy.details.legacyId,'legacy-class')
 const schedule=await request('/workspace/manager',{token:activeToken,method:'PUT',body:{revision:workspace.body.revision,changes:{'abc-manager-schedule':[{id:'lesson-legacy-class',classId:migrated.id,teacherId:'teacher',subject:'Mathematics',date:'2026-10-08',start:'08:00',end:'08:45',status:'Scheduled'}]}}})
 assert.equal(schedule.status,200)
 const save=await request('/workspace/manager',{token:activeToken,method:'PUT',body:{revision:schedule.body.revision,changes:{'abc-manager-tasks':[{id:'task-1',title:'Prepare classroom',status:'Open'}]}}})
 assert.equal(save.status,200)
 assert.equal(save.body.data['abc-manager-tasks'][0].title,'Prepare classroom')
 const malformed=await request('/workspace/manager',{token:activeToken,method:'PUT',body:{revision:save.body.revision,changes:{'abc-manager-expenses':[{id:'bad-expense',name:'Invalid',amount:-20,date:'2026-10-07',status:'Paid'}]}}})
 assert.equal(malformed.status,400)
 const foreign=await request('/workspace/manager',{token:activeToken,method:'PUT',body:{revision:save.body.revision,changes:{'abc-manager-teacher-attendance':[{id:'foreign-mark',teacherId:'other-teacher',date:'2026-10-07',status:'Present'}]}}})
 assert.equal(foreign.status,403)
 const combinedAttendance=await request('/workspace/manager',{token:activeToken,method:'PUT',body:{revision:save.body.revision,changes:{'abc-manager-staff-attendance':[{id:'teacher-staff-mark',staffId:'teacher',date:'2026-10-07',status:'Present'}]}}})
 assert.equal(combinedAttendance.status,200)
 await db.update(schools).set({managerSeq:49}).where(eq(schools.id,'school-a'))
 const last=await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'Last Manager',role:'manager'}})
 assert.equal(last.status,201);assert.equal(last.body.loginId,49)
 assert.equal((await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'Overflow Manager',role:'manager'}})).status,409)
 const [school]=await db.select().from(schools).where(eq(schools.id,'school-a'));assert.equal(school.managerSeq,50)
 await db.delete(students).where(eq(students.id,pupil.body.id))
})
test('configuration rejects missing secrets and malformed database URLs',()=>{
 assert.throws(()=>readEnv({}),/DATABASE_URL/)
 assert.throws(()=>readEnv({DATABASE_URL:'https://example.com',JWT_SECRET:'short'}),/Invalid server configuration/)
 assert.equal(readEnv({DATABASE_URL:'postgresql://localhost/test',JWT_SECRET:env.JWT_SECRET,NODE_ENV:'test'}).PORT,5000)
})
test('API requires authentication and verifies passwords',async()=>{
 assert.equal((await request('/students')).status,401)
 assert.equal((await request('/auth/login',{method:'POST',body:{email:'teacher@test.edu',password:'wrong'}})).status,401)
 assert.equal((await request('/health')).body.database,'connected')
})
test('login school picker lists registered schools and supports ID login',async()=>{
 const result=await request('/auth/schools')
 assert.equal(result.status,200)
 assert.deepEqual(result.body,[{id:'school-a',name:'Al Noor School'},{id:'school-b',name:'Zamzam Academy'}])
 assert.equal((await request('/auth/login',{method:'POST',body:{identifier:'100',schoolId:'school-a',password:'correct-password'}})).status,200)
 assert.equal((await request('/auth/login',{method:'POST',body:{identifier:'100',schoolId:'school-b',password:'correct-password'}})).status,401)
})
test('superadmin workspace lists canonical schools and enrollment counts',async()=>{
 const workspace=await request('/workspace/superadmin',{token:adminToken})
 assert.equal(workspace.status,200)
 assert.deepEqual(workspace.body.data['abc-super-schools'].map(({id,name,students,status})=>({id,name,students,status})).sort((a,b)=>a.id.localeCompare(b.id)),[
  {id:'school-a',name:'Al Noor School',students:1,status:'Active'},
  {id:'school-b',name:'Zamzam Academy',students:1,status:'Active'},
 ])
 assert.equal(workspace.body.data['abc-super-users'].find(user=>user.id==='teacher').school,'school-a')
})
test('admin staff attendance persists by date',async()=>{
 const workspace=await request('/workspace/admin',{token:schoolAdminToken})
 const changes={'abc-admin-staff-attendance':{'2026-10-09':{accountant:'Present'}}}
 const saved=await request('/workspace/admin',{token:schoolAdminToken,method:'PUT',body:{revision:workspace.body.revision,changes}})
 assert.equal(saved.status,200)
 assert.equal(saved.body.data['abc-admin-staff-attendance']['2026-10-09'].accountant,'Present')
 const reloaded=await request('/workspace/admin',{token:schoolAdminToken})
 assert.equal(reloaded.body.data['abc-admin-staff-attendance']['2026-10-09'].accountant,'Present')
})
test('admin subjects persist with assigned teachers',async()=>{
 const workspace=await request('/workspace/admin',{token:schoolAdminToken})
 const subjects=[...workspace.body.data['abc-admin-subjects'],{id:'SUB-999',name:'Computer Science',teacherIds:['teacher']}]
 const saved=await request('/workspace/admin',{token:schoolAdminToken,method:'PUT',body:{revision:workspace.body.revision,changes:{'abc-admin-subjects':subjects}}})
 assert.equal(saved.status,200)
 assert.deepEqual(saved.body.data['abc-admin-subjects'].find(subject=>subject.id==='SUB-999'),{id:'SUB-999',name:'Computer Science',teacherIds:['teacher']})
 const reloaded=await request('/workspace/admin',{token:schoolAdminToken})
 assert.equal(reloaded.body.data['abc-admin-subjects'].find(subject=>subject.id==='SUB-999').name,'Computer Science')
})
test('admin workspaces and school records are isolated by school',async()=>{
 const schoolB=await request('/workspace/admin',{token:schoolAdminBToken})
 assert.equal(schoolB.status,200)
 assert.equal(schoolB.body.data['abc-admin-settings'].name,'Zamzam Admin')
 assert.equal(schoolB.body.data['abc-admin-settings'].school,'Zamzam Academy')
 assert.deepEqual(schoolB.body.data['abc-admin-students'].map(student=>student.id),['child-b'])
 assert.ok(schoolB.body.data['abc-admin-teachers'].some(teacher=>teacher.id==='teacher-b'))
 assert.ok(!schoolB.body.data['abc-admin-teachers'].some(teacher=>teacher.id==='teacher'))
 assert.ok(!schoolB.body.data['abc-admin-classes'].some(classroom=>classroom.name==='Legacy A'))
 assert.ok(!schoolB.body.data['abc-admin-subjects'].some(subject=>subject.id==='SUB-999'))
 assert.ok(!schoolB.body.content.linkAccounts.some(account=>account.id==='teacher'))
 const savedB=await request('/workspace/admin',{token:schoolAdminBToken,method:'PUT',body:{revision:schoolB.body.revision,changes:{
  'abc-admin-settings':{...schoolB.body.data['abc-admin-settings'],name:'Private Zamzam Admin'},
  'abc-admin-subjects':[{id:'SUB-B',name:'Zamzam Science',teacherIds:['teacher-b']}],
 }}})
 assert.equal(savedB.status,200)
 const schoolA=await request('/workspace/admin',{token:schoolAdminToken})
 assert.equal(schoolA.status,200)
 assert.notEqual(schoolA.body.data['abc-admin-settings'].name,'Private Zamzam Admin')
 assert.ok(schoolA.body.data['abc-admin-subjects'].some(subject=>subject.id==='SUB-999'))
 assert.ok(!schoolA.body.data['abc-admin-subjects'].some(subject=>subject.id==='SUB-B'))
 assert.ok(!schoolA.body.data['abc-admin-teachers'].some(teacher=>teacher.id==='teacher-b'))
 const [workspaceRow]=await db.select().from(workspaces).where(eq(workspaces.id,'school'))
 assert.ok(workspaceRow.data['admin:school-a'])
 assert.ok(workspaceRow.data['admin:school-b'])
 assert.equal(workspaceRow.data.admin,undefined)
})
test('workspace reads hide legacy classes without deleting referenced records',async()=>{
 await db.insert(classes).values({id:'legacy-school-b-class',schoolId:'school-b',loginId:'LEGACY-old-class',name:'Old Class',details:{legacyId:'old-class'}})
 await db.update(students).set({classId:'legacy-school-b-class'}).where(eq(students.id,'child-b'))
 const workspace=await request('/workspace/admin',{token:schoolAdminBToken})
 assert.equal(workspace.status,200)
 assert.ok(!workspace.body.data['abc-admin-classes'].some(classroom=>classroom.id==='legacy-school-b-class'))
 const [storedClass]=await db.select().from(classes).where(eq(classes.id,'legacy-school-b-class'))
 const [storedStudent]=await db.select().from(students).where(eq(students.id,'child-b'))
 assert.ok(storedClass)
 assert.equal(storedStudent.classId,'legacy-school-b-class')
})
test('admin-created teacher and student accounts use database login ID ranges',async()=>{
 const teacher=await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'New Teacher',email:'newteacher@test.edu',role:'teacher',status:'Active',details:{firstName:'New',lastName:'Teacher',phone:'123',location:'Hodan',gender:'Female',qualification:'B.Ed',classIds:['class-a'],subjectIds:['subject-a']}}})
 assert.equal(teacher.status,201);assert.equal(teacher.body.loginId,101);assert.ok(teacher.body.temporaryPassword.length>=12)
 const accountant=await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'New Accountant',role:'accountant',details:{phone:'456',location:'Waberi',employmentType:'salary',monthlySalary:500}}})
 assert.equal(accountant.status,201);assert.equal(accountant.body.loginId,50)
 const guard=await request('/users',{token:schoolAdminToken,method:'POST',body:{fullName:'New Guard',role:'guard',details:{phone:'789',location:'Hodan',employmentType:'internship',internshipMonths:3}}})
 assert.equal(guard.status,201);assert.equal(guard.body.loginId,102)
 const student=await request('/students',{token:schoolAdminToken,method:'POST',body:{name:'New Student',firstName:'New',lastName:'Student',dateOfBirth:'2018-04-11',gender:'Female',nationality:'Somali',address:'Hodan',academicYear:'2026–2027',group:'Lower',section:'A',enrollmentDate:'2026-10-07',guardian:'Parent',relationship:'Mother',guardianPhone:'+252610000000',email:'parent@test.edu',birthCertificate:'birth.pdf',status:'Present'}})
 assert.equal(student.status,201);assert.equal(student.body.loginId,1001);assert.ok(student.body.temporaryPassword.length>=12)
 assert.equal(student.body.dateOfBirth,'2018-04-11');assert.equal(student.body.section,'A');assert.equal(student.body.birthCertificate,'birth.pdf');assert.equal(student.body.emergencyContact,'+252610000000')
 const login=await request('/auth/login',{method:'POST',body:{identifier:'101',schoolId:'school-a',password:teacher.body.temporaryPassword}})
 assert.equal(login.status,200);assert.equal(login.body.user.firstLogin,true)
 assert.equal((await request('/workspace/teacher',{token:login.body.token})).status,403)
 const changed=await request('/auth/change-password',{token:login.body.token,method:'POST',body:{newPassword:'new-teacher-password'}})
 const workspace=await request('/workspace/teacher',{token:changed.body.token})
 assert.equal(workspace.status,200);assert.ok(Array.isArray(workspace.body.content.teacherSchedule))
 const adminWorkspace=await request('/workspace/admin',{token:schoolAdminToken})
 assert.ok(adminWorkspace.body.data['abc-admin-staff'].some(person=>person.id===guard.body.id&&person.phone==='789'))
})
test('public registration rejects a supplied role and creates an unverified admin account',async()=>{
  const result=await request('/auth/register',{method:'POST',body:{email:'new@test.edu',password:'long-new-password',fullName:'New Guardian',role:'superadmin'}})
  assert.equal(result.status,400)
  const good=await request('/auth/register',{method:'POST',body:{email:'new@test.edu',password:'long-new-password',fullName:'New Guardian'}})
  assert.equal(good.status,201)
  assert.equal(good.body.message,'Registration successful. Check email for verification code.')
  const [registered]=await db.select().from(users).where(eq(users.email,'new@test.edu'))
  assert.equal(registered.role,'admin')
  assert.equal(registered.isVerified,false)
})
test('teachers and guardians can only see linked students',async()=>{
 for(const token of [teacherToken,guardianToken]) {
  const result=await request('/students',{token});assert.equal(result.status,200);assert.deepEqual(result.body.map(s=>s.id),['child-a'])
 }
 assert.equal((await request('/dashboard/teacher',{token:teacherToken})).body.students,1)
 assert.equal((await request('/dashboard/student',{token:guardianToken})).body.students,1)
 assert.equal((await request('/finance/summary',{token:teacherToken})).status,403)
 assert.equal((await request('/workspace/admin',{token:guardianToken})).status,403)
 assert.equal((await request('/superadmin/users',{token:teacherToken})).status,403)
})
test('attendance is scoped, validated and idempotent per student/date',async()=>{
 const mark={studentId:'child-a',date:'2026-10-06',status:'Present'}
 assert.equal((await request('/attendance',{token:teacherToken,method:'POST',body:{...mark,studentId:'child-b'}})).status,403)
 assert.equal((await request('/attendance',{token:teacherToken,method:'POST',body:{...mark,date:'2026-02-31'}})).status,400)
 assert.equal((await request('/attendance',{token:teacherToken,method:'POST',body:mark})).status,200)
 assert.equal((await request('/attendance',{token:teacherToken,method:'POST',body:{...mark,status:'Late'}})).status,200)
 const result=await request('/attendance?date=2026-10-06',{token:guardianToken});assert.equal(result.body.length,1);assert.equal(result.body[0].status,'Late')
})
test('workspace conflicts reject stale writes and record an audit entry',async()=>{
 const initial=(await request('/workspace/teacher',{token:teacherToken})).body
 const save=await request('/workspace/teacher',{token:teacherToken,method:'PUT',body:{revision:initial.revision,changes:{'abc-teacher-lessons':[{id:'lesson-1',title:'Counting'}]}}})
 assert.equal(save.status,200)
 assert.equal((await request('/workspace/teacher',{token:teacherToken,method:'PUT',body:{revision:initial.revision,changes:{'abc-teacher-lessons':[]}}})).status,409)
 const reloaded=(await request('/workspace/teacher',{token:teacherToken})).body
 assert.equal(reloaded.data['abc-teacher-lessons'][0].title,'Counting')
 assert.ok((await db.select().from(systemLogs)).some(log=>log.action==='workspace.update'))
})
test('workspace refuses unknown keys and teacher reassignment',async()=>{
 const current=(await request('/workspace/teacher',{token:teacherToken})).body
 assert.equal((await request('/workspace/teacher',{token:teacherToken,method:'PUT',body:{revision:current.revision,changes:{'abc-super-users':[]}}})).status,403)
 const roster=current.data['abc-teacher-students'].map(s=>({...s,teacherId:'superadmin'}))
 assert.equal((await request('/workspace/teacher',{token:teacherToken,method:'PUT',body:{revision:current.revision,changes:{'abc-teacher-students':roster}}})).status,400)
})

test('exam publication ranks ties, promotes passes, records failures and enrolls accelerated courses',async()=>{
 const classOne=(await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'Class 1',level:'Lower',progressionOrder:1,courseEnabled:true,courseRankLimit:1,coursePassMark:60}})).body
 const classTwo=(await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'Class 2',level:'Lower',progressionOrder:2}})).body
 const classThree=(await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'Class 3',level:'Lower',progressionOrder:3}})).body
 assert.equal((await request(`/classes/${classOne.id}`,{token:schoolAdminToken,method:'PUT',body:{name:'Class 1',level:'Lower',progressionOrder:1,nextClassId:classTwo.id,courseEnabled:true,courseRankLimit:1,coursePassMark:60}})).status,200)
 assert.equal((await request(`/classes/${classTwo.id}`,{token:schoolAdminToken,method:'PUT',body:{name:'Class 2',level:'Lower',progressionOrder:2,nextClassId:classThree.id}})).status,200)
 assert.equal((await request(`/classes/${classThree.id}`,{token:schoolAdminToken,method:'PUT',body:{name:'Class 3',level:'Lower',progressionOrder:3,nextClassId:classOne.id}})).status,400)
 await db.update(students).set({classId:classOne.id,gradeLevel:'Class 1'}).where(eq(students.id,'child-a'))
 await db.insert(students).values([{id:'exam-child-b',schoolId:'school-a',fullName:'Tie Student',gradeLevel:'Class 1',classId:classOne.id,teacherId:'teacher'},{id:'exam-child-c',schoolId:'school-a',fullName:'Failed Student',gradeLevel:'Class 1',classId:classOne.id,teacherId:'teacher'}])
 const year=await request('/academic-years',{token:schoolAdminToken,method:'POST',body:{name:'2026–2027',startDate:'2026-09-01',endDate:'2027-06-30'}})
 assert.equal(year.status,201);assert.equal(year.body.status,'Active')
 const created=await request('/exams',{token:schoolAdminToken,method:'POST',body:{title:'Final Examination',academicYearId:year.body.id,type:'Main',passMark:50,assignments:[{classId:classOne.id,subjectName:'Mathematics',teacherId:'teacher'}]}})
 assert.equal(created.status,201)
 const teacherExams=await request('/exams',{token:teacherToken}),assignment=teacherExams.body.find(exam=>exam.id===created.body.id).assignments[0]
 assert.equal((await request(`/exams/assignments/${assignment.id}/scores`,{token:teacherToken,method:'PUT',body:{scores:[{studentId:'child-a',score:90},{studentId:'exam-child-b',score:90},{studentId:'exam-child-c',score:40}]}})).status,200)
 assert.equal((await request(`/exams/assignments/${assignment.id}/submit`,{token:teacherToken,method:'POST'})).status,200)
 const publish=await request(`/exams/${created.body.id}/publish`,{token:schoolAdminToken,method:'POST'})
 assert.equal(publish.status,200);assert.equal(publish.body.resultCount,3)
 assert.equal((await request(`/exams/${created.body.id}/publish`,{token:schoolAdminToken,method:'POST'})).status,409)
 const results=await request(`/exams/${created.body.id}/results`,{token:schoolAdminToken})
 assert.deepEqual(results.body.filter(row=>row.outcome==='Passed').map(row=>row.rank),[1,1])
 assert.equal(results.body.find(row=>row.studentId==='exam-child-c').outcome,'Failed')
 const [promoted,failed]=await Promise.all([db.select().from(students).where(eq(students.id,'child-a')),db.select().from(students).where(eq(students.id,'exam-child-c'))])
 assert.equal(promoted[0].classId,classTwo.id);assert.equal(failed[0].classId,classOne.id)
 const courses=await request(`/exams/${created.body.id}/courses`,{token:schoolAdminToken})
 assert.equal(courses.body.length,2);assert.ok(courses.body.every(row=>row.source==='Auto Rank'))
 const own=await request('/exams/results/me',{token:guardianToken})
 assert.ok(own.body.some(row=>row.examTitle==='Final Examination'&&row.rank===1))
 assert.equal((await request(`/exams/${created.body.id}/results/exam-child-c/decision`,{token:schoolAdminToken,method:'PUT',body:{decision:'Re-exam'}})).status,200)
 const reexam=await request('/exams',{token:schoolAdminToken,method:'POST',body:{title:'Final Re-examination',academicYearId:year.body.id,type:'Re-exam',parentExamId:created.body.id,passMark:50,assignments:[{classId:classOne.id,subjectName:'Mathematics',teacherId:'teacher'}]}})
 const reexamAssignment=(await request('/exams',{token:teacherToken})).body.find(exam=>exam.id===reexam.body.id).assignments[0]
 assert.equal((await request(`/exams/assignments/${reexamAssignment.id}/scores`,{token:teacherToken,method:'PUT',body:{scores:[{studentId:'exam-child-c',score:70}]}})).status,200)
 assert.equal((await request(`/exams/assignments/${reexamAssignment.id}/submit`,{token:teacherToken,method:'POST'})).status,200)
 assert.equal((await request(`/exams/${reexam.body.id}/publish`,{token:schoolAdminToken,method:'POST'})).status,200)
 assert.equal((await db.select().from(students).where(eq(students.id,'exam-child-c')))[0].classId,classTwo.id)
 assert.equal((await request(`/exams/${created.body.id}/courses`,{token:schoolAdminToken,method:'POST',body:{studentId:'exam-child-c',sourceClassId:classOne.id,reason:'Administration scholarship decision'}})).status,201)
 const courseExam=await request('/exams',{token:schoolAdminToken,method:'POST',body:{title:'Class 2 Accelerated Course Exam',academicYearId:year.body.id,type:'Course',parentExamId:created.body.id,passMark:50,assignments:[{classId:classTwo.id,subjectName:'Mathematics',teacherId:'teacher'}]}})
 const courseAssignment=(await request('/exams',{token:teacherToken})).body.find(exam=>exam.id===courseExam.body.id).assignments[0]
 assert.equal((await request(`/exams/assignments/${courseAssignment.id}/scores`,{token:teacherToken,method:'PUT',body:{scores:[{studentId:'child-a',score:65},{studentId:'exam-child-b',score:75},{studentId:'exam-child-c',score:80}]}})).status,200)
 assert.equal((await request(`/exams/assignments/${courseAssignment.id}/submit`,{token:teacherToken,method:'POST'})).status,200)
 assert.equal((await request(`/exams/${courseExam.body.id}/publish`,{token:schoolAdminToken,method:'POST'})).status,200)
 assert.equal((await db.select().from(students).where(eq(students.id,'child-a')))[0].classId,classThree.id)
 const cancelled=await request('/exams',{token:schoolAdminToken,method:'POST',body:{title:'Cancelled Practice Exam',academicYearId:year.body.id,type:'Main',passMark:50,assignments:[{classId:classThree.id,subjectName:'Mathematics',teacherId:'teacher'}]}})
 assert.equal((await request(`/exams/${cancelled.body.id}/cancel`,{token:schoolAdminToken,method:'POST',body:{reason:'Schedule changed'}})).status,200)
 assert.ok(!(await request('/exams',{token:teacherToken})).body.some(exam=>exam.id===cancelled.body.id))
 const nextYear=await request('/academic-years',{token:schoolAdminToken,method:'POST',body:{name:'2027–2028',startDate:'2027-09-01',endDate:'2028-06-30'}})
 assert.equal(nextYear.status,201);assert.equal(nextYear.body.status,'Draft')
 assert.equal((await request(`/academic-years/${nextYear.body.id}/start`,{token:schoolAdminToken,method:'POST'})).status,200)
 await db.update(students).set({classId:null,gradeLevel:'KG 1'}).where(eq(students.id,'child-a'))
})
test('payments atomically update the ledger and cannot exceed the invoice',async()=>{
 const data={invoiceId:'bill-1',amount:60,date:'2026-10-06',method:'Cash'}
 assert.equal((await request('/finance/payments',{token:financeToken,method:'POST',body:data})).status,201)
 assert.equal((await request('/finance/payments',{token:financeToken,method:'POST',body:data})).status,400)
 const [bill]=await db.select().from(invoices).where(eq(invoices.id,'bill-1'));assert.equal(bill.paid,'60.00')
 const ledger=await db.select().from(transactions);assert.equal(ledger.length,1);assert.equal(ledger[0].amount,'60.00')
})
test('workspace payment changes roll back when ledger and invoice disagree',async()=>{
 const current=(await request('/workspace/accountant',{token:financeToken})).body
 const bad=current.data['abc-finance-invoices'].map(i=>({...i,paid:90}))
 const result=await request('/workspace/accountant',{token:financeToken,method:'PUT',body:{revision:current.revision,changes:{'abc-finance-invoices':bad,'abc-finance-settings':{name:'Should roll back'}}}})
 assert.equal(result.status,400)
 const [bill]=await db.select().from(invoices).where(eq(invoices.id,'bill-1'));assert.equal(bill.paid,'60.00')
 const state=(await request('/workspace/accountant',{token:financeToken})).body;assert.notEqual(state.data['abc-finance-settings']?.name,'Should roll back')
})
test('a schoolless superadmin cannot provision school credentials or disable its own account',async()=>{
  const result=await request('/users',{token:adminToken,method:'POST',body:{email:'staff@test.edu',fullName:'School Staff',role:'admin',password:'strong-staff-password'}})
  assert.equal(result.status,400)
  assert.equal((await request('/users/superadmin',{token:adminToken,method:'PUT',body:{email:'superadmin@test.edu',fullName:'Super Admin',role:'admin'}})).status,400)
})

test('workspace accepts an atomic payment and keeps module defaults after save',async()=>{
 const current=(await request('/workspace/accountant',{token:financeToken})).body
 const bills=current.data['abc-finance-invoices'].map(i=>({...i,paid:100}))
 const ledger=[...current.data['abc-finance-transactions'],{id:'payment-last',invoiceId:'bill-1',date:'2026-10-06',description:'Final fee payment',type:'Income',category:'School Fees',amount:40,method:'Cash'}]
 const result=await request('/workspace/accountant',{token:financeToken,method:'PUT',body:{revision:current.revision,changes:{'abc-finance-invoices':bills,'abc-finance-transactions':ledger}}})
 assert.equal(result.status,200);assert.equal(result.body.data['abc-finance-invoices'][0].paid,100)
 assert.deepEqual(result.body.data['abc-finance-fees'],[])
})

test('finance records stay within the accountant school and payment retries keep one receipt',async()=>{
 const passwordHash=await bcrypt.hash('other-school-password',4)
 await db.insert(users).values({id:'accountant-b',email:'accountant-b@test.edu',fullName:'Other Accountant',role:'accountant',schoolId:'school-b',loginId:50,passwordHash,firstLogin:false})
 const otherToken=jwt.sign({},env.JWT_SECRET,{subject:'accountant-b',expiresIn:'8h',issuer:'abc-daycare',audience:'abc-web',algorithm:'HS256'})
 const foreign=await request('/finance/invoices',{token:otherToken})
 assert.equal(foreign.status,200);assert.deepEqual(foreign.body,[])
 assert.equal((await request('/finance/invoices',{token:financeToken,method:'POST',body:{studentId:'child-b',description:'Foreign fee',amount:80,issued:'2026-10-01',due:'2026-10-20'}})).status,404)
 const created=await request('/finance/invoices',{token:financeToken,method:'POST',body:{studentId:'child-a',description:'October tuition',amount:125,issued:'2026-10-01',due:'2026-10-20'}})
 assert.equal(created.status,201)
 assert.equal((await request('/finance/payments',{token:otherToken,method:'POST',body:{invoiceId:created.body.id,amount:25,date:'2026-10-07',method:'Cash'}})).status,404)
 const input={invoiceId:created.body.id,amount:25,date:'2026-10-07',method:'Cash',idempotencyKey:'fee-test-1'}
 const first=await request('/finance/payments',{token:financeToken,method:'POST',body:input})
 assert.equal(first.status,201);assert.ok(first.body.receipt.number)
 const replay=await request('/finance/payments',{token:financeToken,method:'POST',body:input})
 assert.equal(replay.status,200);assert.equal(replay.body.id,first.body.id)
 const ownReceipts=await request('/finance/receipts',{token:financeToken})
 assert.ok(ownReceipts.body.some(row=>row.transactionId===first.body.id))
 assert.deepEqual((await request('/finance/receipts',{token:otherToken})).body,[])
 assert.equal((await request(`/finance/receipts/${first.body.receipt.id}`,{token:otherToken})).status,404)
 const bill=(await db.select().from(invoices).where(eq(invoices.id,created.body.id)))[0]
 assert.equal(bill.paid,'25.00')
})

test('finance operations post once, refunds reverse the balance, and a close locks postings',async()=>{
 const plan=await request('/finance/fee-plans',{token:financeToken,method:'POST',body:{className:'KG 1',name:'Monthly KG fee',tuition:100,materials:10,transport:0,effectiveFrom:'2026-10-01'}})
 assert.equal(plan.status,201)
 assert.equal((await request('/finance/fee-plans',{token:financeToken})).body.length,1)
 const income=await request('/finance/other-income',{token:financeToken,method:'POST',body:{source:'Book fair',category:'Other Income',description:'Book sales',amount:35,date:'2026-10-05',method:'Cash',idempotencyKey:'other-income-1'}})
 assert.equal(income.status,201);assert.ok(income.body.receipt.number)
 assert.equal((await request('/finance/other-income',{token:financeToken,method:'POST',body:{source:'Book fair',category:'Other Income',description:'Book sales',amount:35,date:'2026-10-05',method:'Cash',idempotencyKey:'other-income-1'}})).status,200)
 const expense=await request('/finance/school-expenses',{token:financeToken,method:'POST',body:{payee:'Electric utility',category:'Electricity',description:'October power',amount:12.5,date:'2026-10-05',method:'Cash'}})
 assert.equal(expense.status,201)
 const staff=await request('/finance/staff-payments',{token:financeToken,method:'POST',body:{staffId:'teacher',period:'2026-10',gross:100,deductions:5,date:'2026-10-05',method:'Bank Transfer'}})
 assert.equal(staff.status,201);assert.equal(staff.body.amount,95)
 assert.equal((await request('/finance/staff-payments',{token:financeToken,method:'POST',body:{staffId:'teacher',period:'2026-10',gross:100,deductions:5,date:'2026-10-05',method:'Bank Transfer'}})).status,409)
 const vendorBill=await request('/finance/bills',{token:financeToken,method:'POST',body:{vendor:'Stationery Ltd',description:'Pens',category:'Supplies',amount:40,issued:'2026-10-01',due:'2026-10-31'}})
 assert.equal(vendorBill.status,201)
 assert.equal((await request(`/finance/bills/${vendorBill.body.id}/payments`,{token:financeToken,method:'POST',body:{amount:20,date:'2026-10-05',method:'Cash'}})).status,201)
 const invoice=await request('/finance/invoices',{token:financeToken,method:'POST',body:{studentId:'child-a',description:'Refund test fee',amount:20,issued:'2026-10-01',due:'2026-10-30'}})
 const payment=await request('/finance/payments',{token:financeToken,method:'POST',body:{invoiceId:invoice.body.id,amount:20,date:'2026-10-05',method:'Cash'}})
 assert.equal(payment.status,201)
 const refund=await request('/finance/refunds',{token:financeToken,method:'POST',body:{transactionId:payment.body.id,amount:5,date:'2026-10-05',method:'Cash',reason:'Family overpayment adjustment'}})
 assert.equal(refund.status,201)
 assert.equal((await request('/finance/refunds',{token:financeToken,method:'POST',body:{transactionId:payment.body.id,amount:16,date:'2026-10-05',method:'Cash',reason:'Too much'}})).status,400)
 const adjusted=(await db.select().from(invoices).where(eq(invoices.id,invoice.body.id)))[0]
 assert.equal(adjusted.paid,'15.00')
 const budget=await request('/finance/budgets',{token:financeToken,method:'PUT',body:{month:'2026-10',category:'Electricity',amount:50}})
 assert.equal(budget.status,200)
 assert.ok((await request('/finance/budgets',{token:financeToken})).body.some(line=>line.category==='Electricity'&&line.actual===12.5))
 const preview=await request('/finance/closings/preview?kind=day&period=2026-10-05',{token:financeToken})
 assert.equal(preview.status,200);assert.ok(preview.body.count>=4)
 const closing=await request('/finance/closings',{token:financeToken,method:'POST',body:{kind:'day',period:'2026-10-05',countedCash:37.5}})
 assert.equal(closing.status,201)
 assert.equal((await request('/finance/school-expenses',{token:financeToken,method:'POST',body:{payee:'Later',category:'Rent',description:'Late posting',amount:2,date:'2026-10-05',method:'Cash'}})).status,409)
 assert.ok((await request('/finance/reports?from=2026-10-01&to=2026-10-07',{token:financeToken})).body.income>0)
 assert.ok((await request('/finance/audit',{token:financeToken})).body.some(row=>row.action==='finance.refund'))
})

test('finance controls and reports remain isolated after one school closes a day',async()=>{
 const otherToken=jwt.sign({},env.JWT_SECRET,{subject:'accountant-b',expiresIn:'8h',issuer:'abc-daycare',audience:'abc-web',algorithm:'HS256'})
 for(const path of ['/transactions','/invoices','/fee-plans','/bills','/budgets','/closings','/refunds','/audit']){
  const result=await request(`/finance${path}`,{token:otherToken})
  assert.equal(result.status,200,path);assert.deepEqual(result.body,[],path)
 }
 const report=await request('/finance/reports?from=2026-10-01&to=2026-10-07',{token:otherToken})
 assert.equal(report.status,200);assert.equal(report.body.income,0);assert.equal(report.body.expenses,0)
 const schoolABill=(await request('/finance/bills',{token:financeToken})).body[0]
 assert.equal((await request(`/finance/bills/${schoolABill.id}/payments`,{token:otherToken,method:'POST',body:{amount:1,date:'2026-10-05',method:'Cash'}})).status,404)
 const schoolAPayment=(await request('/finance/transactions',{token:financeToken})).body.find(row=>row.invoiceId&&row.type==='Income')
 assert.equal((await request('/finance/refunds',{token:otherToken,method:'POST',body:{transactionId:schoolAPayment.id,amount:1,date:'2026-10-05',method:'Cash',reason:'Cross school attempt'}})).status,404)
 const ownIncome=await request('/finance/other-income',{token:otherToken,method:'POST',body:{source:'School B fair',category:'Other Income',description:'Book sale',amount:3,date:'2026-10-05',method:'Cash'}})
 assert.equal(ownIncome.status,201)
 assert.equal((await request('/finance/summary',{token:otherToken})).body.income,3)
 assert.ok((await request('/finance/summary',{token:financeToken})).body.income>3)
})

test('database ownership constraints reject cross-school finance links',async()=>{
 await assert.rejects(db.insert(invoices).values({id:'cross-school-invoice',schoolId:'school-a',studentId:'child-b',description:'Wrong school',amount:'1.00',paid:'0.00',issued:'2026-10-01',due:'2026-10-10'}))
 const own=(await db.select().from(invoices).where(eq(invoices.schoolId,'school-a')))[0]
 await assert.rejects(db.insert(transactions).values({id:'cross-school-payment',schoolId:'school-b',invoiceId:own.id,
  description:'Wrong school',category:'School Fees',amount:'1.00',type:'Income',date:'2026-10-06',method:'Cash'}))
})

test('accountant onboarding creates an idempotent annual class schedule and notifies the school admin',async()=>{
 const classroom=await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'KG 1',level:'Lower',academicYear:'2027'}})
 assert.equal(classroom.status,201)
 const visible=await request('/classes',{token:financeToken})
 assert.equal(visible.status,200);assert.ok(visible.body.some(row=>row.id===classroom.body.id))
 const body={receiptAddress:'Mogadishu',receiptPhone:'+252 61 0000000',plans:[{
  classId:classroom.body.id,className:'KG 1',name:'KG 1 annual fees',tuition:25,materials:0,transport:0,
  effectiveFrom:'2027-01-01',startMonth:'2027-01',billingMonths:12,dueDay:10,active:'Active',
  oneTimeFees:[{name:'Examination fee',amount:15,month:'2027-06'}],
 }]}
 assert.equal((await request('/finance/onboarding',{token:financeToken,method:'PUT',body:{...body,receiptName:'Renamed by accountant'}})).status,400)
 const first=await request('/finance/onboarding',{token:financeToken,method:'PUT',body})
 assert.equal(first.status,200);assert.equal(first.body.onboardingComplete,true)
 assert.equal(first.body.generated[0].students,1);assert.equal(first.body.generated[0].created,13)
 const second=await request('/finance/onboarding',{token:financeToken,method:'PUT',body})
 assert.equal(second.status,200);assert.equal(second.body.generated[0].created,0)
 const settings=await request('/finance/settings',{token:financeToken})
 assert.equal(settings.body.onboardingComplete,true);assert.equal(settings.body.schoolName,'Al Noor School');assert.equal(settings.body.receiptName,'Al Noor School')
 const scheduled=(await request('/finance/invoices',{token:financeToken})).body.filter(row=>row.feePlanId===first.body.generated[0].plan.id)
 assert.equal(scheduled.length,13);assert.equal(new Set(scheduled.map(row=>row.scheduleKey)).size,13)
 const notices=await request('/admin/notifications',{token:schoolAdminToken})
 assert.equal(notices.status,200);assert.ok(notices.body.some(row=>row.action==='finance.onboarding.complete'))
})

test('student portal returns owned database records, ordered attendance, and supports linked-child selection',async()=>{
 const now=new Date('2026-10-09T09:00:00.000Z')
 await db.insert(classes).values([
  {id:'portal-class-a',schoolId:'school-a',loginId:'PORTAL-A',name:'Sunshine KG',details:{room:'Sunshine Room'}},
  {id:'portal-class-empty',schoolId:'school-a',loginId:'PORTAL-EMPTY',name:'Rainbow KG',details:{}},
  {id:'portal-class-b',schoolId:'school-b',loginId:'PORTAL-B',name:'Foreign KG',details:{}},
 ]).onConflictDoNothing()
 await db.update(students).set({classId:'portal-class-a',gradeLevel:'Sunshine KG'}).where(eq(students.id,'child-a'))
 await db.insert(students).values({id:'portal-child-empty',schoolId:'school-a',fullName:'Empty Child',gradeLevel:'Rainbow KG',classId:'portal-class-empty',parentId:'student'}).onConflictDoNothing()
 await db.insert(portalSubjects).values([
  {id:'portal-reading',schoolId:'school-a',name:'Reading',description:'Stories and sounds',icon:'BookOpen',tone:'blue'},
  {id:'portal-foreign-subject',schoolId:'school-b',name:'Foreign subject'},
 ])
 await db.insert(classSubjects).values({id:'portal-reading-slot',schoolId:'school-a',classId:'portal-class-a',subjectId:'portal-reading',teacherId:'teacher',weekday:5,startTime:'08:00',endTime:'09:00',room:'Sunshine Room'})
 await db.insert(learningAssignments).values([
  {id:'portal-open-assignment',schoolId:'school-a',classId:'portal-class-a',subjectId:'portal-reading',teacherId:'teacher',title:'Read Together',description:'Read one story.',dueAt:new Date('2026-10-10T12:00:00Z'),status:'Open'},
  {id:'portal-closed-assignment',schoolId:'school-a',classId:'portal-class-a',subjectId:'portal-reading',teacherId:'teacher',title:'Finished Story',dueAt:new Date('2026-10-08T12:00:00Z'),status:'Closed'},
  {id:'portal-draft-assignment',schoolId:'school-a',classId:'portal-class-a',subjectId:'portal-reading',teacherId:'teacher',title:'Hidden Draft',dueAt:new Date('2026-10-11T12:00:00Z'),status:'Draft'},
  {id:'portal-foreign-assignment',schoolId:'school-b',classId:'portal-class-b',subjectId:'portal-foreign-subject',teacherId:'teacher',title:'Foreign Work',dueAt:new Date('2026-10-10T12:00:00Z'),status:'Open'},
 ])
 await db.insert(portalAnnouncements).values([
  {id:'portal-school-news',schoolId:'school-a',title:'School News',status:'Published',publishedAt:new Date('2026-10-08T08:00:00Z')},
  {id:'portal-class-news',schoolId:'school-a',classId:'portal-class-a',title:'Class News',status:'Published',publishedAt:new Date('2026-10-09T08:00:00Z')},
  {id:'portal-expired-news',schoolId:'school-a',title:'Expired News',status:'Published',publishedAt:new Date('2026-09-01T08:00:00Z'),expiresAt:new Date('2026-09-02T08:00:00Z')},
  {id:'portal-draft-news',schoolId:'school-a',title:'Draft News',status:'Draft'},
  {id:'portal-foreign-news',schoolId:'school-b',title:'Foreign News',status:'Published',publishedAt:now},
 ])
 await db.insert(galleryItems).values([
  {id:'portal-class-photo',schoolId:'school-a',classId:'portal-class-a',title:'Reading Day',assetUrl:'/gallery/story.png',capturedAt:now,status:'Published'},
  {id:'portal-school-photo',schoolId:'school-a',title:'School Day',assetUrl:'/gallery/playground.png',capturedAt:new Date('2026-10-08T08:00:00Z'),status:'Published'},
  {id:'portal-hidden-photo',schoolId:'school-a',classId:'portal-class-a',title:'Hidden',assetUrl:'/hidden.png',status:'Draft'},
  {id:'portal-foreign-photo',schoolId:'school-b',classId:'portal-class-b',title:'Foreign',assetUrl:'/foreign.png',status:'Published'},
 ])
 await db.insert(portalConversations).values([
  {id:'portal-own-thread',schoolId:'school-a',subject:'Reading support',updatedAt:now},
  {id:'portal-foreign-thread',schoolId:'school-b',subject:'Foreign thread',updatedAt:now},
 ])
 await db.insert(conversationParticipants).values([
  {id:'portal-own-student-participant',conversationId:'portal-own-thread',userId:'student'},
  {id:'portal-own-teacher-participant',conversationId:'portal-own-thread',userId:'teacher'},
 ])
 await db.insert(portalMessages).values({id:'portal-teacher-message',conversationId:'portal-own-thread',senderId:'teacher',body:'Please read tonight.',createdAt:new Date(Date.now()-1000)})
 for(const row of [
  {id:'portal-attendance-09',studentId:'child-a',date:'2026-10-09',status:'Present',arrivalTime:'07:55',recordedBy:'teacher'},
  {id:'portal-attendance-08',studentId:'child-a',date:'2026-10-08',status:'Late',arrivalTime:'08:20',recordedBy:'teacher'},
  {id:'portal-attendance-07',studentId:'child-a',date:'2026-10-07',status:'Absent',recordedBy:'teacher'},
 ]) await db.insert(attendance).values(row).onConflictDoUpdate({target:[attendance.studentId,attendance.date],set:{status:row.status,arrivalTime:row.arrivalTime||null,recordedBy:'teacher'}})

 const result=await request('/student/portal?studentId=child-a',{token:guardianToken})
 assert.equal(result.status,200)
 assert.equal(result.body.profile.id,'child-a')
 assert.equal(result.body.profile.classroom.id,'portal-class-a')
 assert.deepEqual(result.body.profile.linkedStudents.map(row=>row.id).sort(),['child-a','portal-child-empty'])
 assert.deepEqual(result.body.subjects.map(row=>row.id),['portal-reading'])
 assert.deepEqual(result.body.assignments.map(row=>row.id),['portal-closed-assignment','portal-open-assignment'])
 assert.deepEqual(result.body.attendance.slice(0,3).map(row=>row.date),['2026-10-09','2026-10-08','2026-10-07'])
 assert.equal(result.body.attendance[0].arrival,'07:55')
 assert.deepEqual(result.body.announcements.map(row=>row.id),['portal-class-news','portal-school-news'])
 assert.deepEqual(result.body.gallery.map(row=>row.id),['portal-class-photo','portal-school-photo'])
 assert.equal(result.body.threads.length,1);assert.equal(result.body.threads[0].unread,true)

 const selected=await request('/student/me?studentId=portal-child-empty',{token:guardianToken})
 assert.equal(selected.status,200);assert.equal(selected.body.id,'portal-child-empty');assert.equal(selected.body.classroom.id,'portal-class-empty')
 assert.deepEqual((await request('/student/classes?studentId=portal-child-empty',{token:guardianToken})).body.subjects,[])
 assert.deepEqual((await request('/student/assignments?studentId=portal-child-empty',{token:guardianToken})).body,[])
 assert.deepEqual((await request('/student/attendance?studentId=portal-child-empty',{token:guardianToken})).body,[])
 assert.equal((await request('/student/me?studentId=child-b',{token:guardianToken})).status,403)
 assert.equal((await request('/student/portal',{token:teacherToken})).status,403)

 const ranged=await request('/student/attendance?studentId=child-a&from=2026-10-08&to=2026-10-09',{token:guardianToken})
 assert.deepEqual(ranged.body.map(row=>row.date),['2026-10-09','2026-10-08'])
 assert.equal((await request('/student/attendance?studentId=child-a&from=2026-10-10&to=2026-10-09',{token:guardianToken})).status,400)
})

test('student assignment submission persists, upserts, and rejects another linked child',async()=>{
 const path='/student/assignments/portal-open-assignment/submission?studentId=child-a'
 const first=await request(path,{token:guardianToken,method:'PUT',body:{response:'My first reading response'}})
 assert.equal(first.status,200);assert.equal(first.body.response,'My first reading response')
 const second=await request(path,{token:guardianToken,method:'PUT',body:{response:'My corrected reading response'}})
 assert.equal(second.status,200);assert.equal(second.body.id,first.body.id);assert.equal(second.body.response,'My corrected reading response')
 const rows=await db.select().from(assignmentSubmissions).where(eq(assignmentSubmissions.assignmentId,'portal-open-assignment'))
 assert.equal(rows.length,1);assert.equal(rows[0].studentId,'child-a');assert.equal(rows[0].response,'My corrected reading response')
 const visible=await request('/student/assignments?studentId=child-a',{token:guardianToken})
 const assignment=visible.body.find(row=>row.id==='portal-open-assignment')
 assert.equal(assignment.status,'Submitted');assert.equal(assignment.response,'My corrected reading response')
 assert.equal((await request('/student/assignments/portal-open-assignment/submission?studentId=portal-child-empty',{token:guardianToken,method:'PUT',body:{response:'Not my class'}})).status,404)
 assert.equal((await request('/student/assignments/portal-foreign-assignment/submission?studentId=child-a',{token:guardianToken,method:'PUT',body:{response:'Foreign'}})).status,404)
 assert.equal((await request(path,{token:guardianToken,method:'PUT',body:{response:'   '}})).status,400)
})

test('exam v2 generates deterministic assignments, publishes without class mutation, and transitions once',async()=>{
 const sourceYear=(await request('/academic-years',{token:schoolAdminToken,method:'POST',body:{name:'2030–2031',startDate:'2030-09-01',endDate:'2031-06-30'}})).body
 const sourceClass=(await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'V2 Source',level:'Middle',section:'A',academicYear:'2030–2031',room:'V2-A',capacity:30}})).body
 const targetClass=(await request('/classes',{token:schoolAdminToken,method:'POST',body:{name:'V2 Target',level:'Upper',section:'A',academicYear:'2031–2032',room:'V2-B',capacity:30}})).body
 await db.update(students).set({classId:sourceClass.id,gradeLevel:sourceClass.name}).where(eq(students.id,'child-a'))
 await db.insert(studentEnrollments).values({id:'v2-source-enrollment',schoolId:'school-a',studentId:'child-a',academicYearId:sourceYear.id,classId:sourceClass.id,status:'Active',source:'V2 test'})
 const rules={passBasis:'AverageAndSubjectMinimum',maxMarkModel:'PerSubject',deadlinePolicy:'AllowLate',reexamScope:'FailedSubjects',reexamScorePolicy:'SeparateResolution',promotionTiming:'YearTransition',rounding:'HalfUp2',passAverage:50,reExamAllowed:true}
 const settings=await request('/exams/v2/settings',{token:schoolAdminToken,method:'PUT',body:{version:1,currentStep:5,featureEnabled:false,policyStatus:'Confirmed',rules}})
 assert.equal(settings.status,201)
 assert.equal((await request(`/exams/v2/settings/${settings.body.id}/complete`,{token:schoolAdminToken,method:'POST'})).status,200)
 const progression=await request(`/exams/v2/progressions/${sourceYear.id}`,{token:schoolAdminToken,method:'PUT',body:{rows:[{classId:sourceClass.id,order:1,nextClassId:targetClass.id,isFinal:false},{classId:targetClass.id,order:2,nextClassId:null,isFinal:true}]}})
 assert.equal(progression.status,200)
 const subject=await request('/exams/v2/subjects',{token:schoolAdminToken,method:'POST',body:{name:'V2 Mathematics'}})
 assert.equal(subject.status,201)
 const offering=await request('/exams/v2/offerings',{token:schoolAdminToken,method:'POST',body:{academicYearId:sourceYear.id,classId:sourceClass.id,subjectId:subject.body.id,effectiveFrom:'2030-01-01T00:00:00.000Z',teachers:[{teacherId:'teacher',role:'Lead'}]}})
 assert.equal(offering.status,201)
 const template=await request('/exams/v2/templates',{token:schoolAdminToken,method:'POST',body:{familyId:'v2-final',version:1,name:'V2 Final',category:'Final',promotionExam:true,reExamAllowed:true,rules:{},subjects:[{subjectId:subject.body.id,order:1,maxMark:80,minimumMark:32,required:true}]}})
 assert.equal(template.status,201)
 const sessionBody={idempotencyKey:'v2-session-one',title:'V2 Final 2031',academicYearId:sourceYear.id,templateId:template.body.id,term:'Term 3',startDate:'2031-05-01',endDate:'2031-05-05',teacherDeadline:'2031-05-10T12:00:00.000Z',publishMode:'Manual',allClasses:false,classIds:[sourceClass.id]}
 const created=await request('/exams/v2/sessions',{token:schoolAdminToken,method:'POST',body:sessionBody})
 assert.equal(created.status,201)
 const replay=await request('/exams/v2/sessions',{token:schoolAdminToken,method:'POST',body:sessionBody})
 assert.equal(replay.status,201);assert.equal(replay.body.id,created.body.id)
 const [assignment]=await db.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.sessionId,created.body.id))
 assert.equal(Number(assignment.maxMark),80);assert.equal(assignment.leadTeacherId,'teacher')
 const detail=await request(`/exams/v2/assignments/${assignment.id}`,{token:teacherToken})
 assert.equal(detail.status,200);assert.deepEqual(detail.body.students.map(row=>row.studentId),['child-a'])
 assert.equal((await request(`/exams/v2/assignments/${assignment.id}/scores`,{token:teacherToken,method:'PUT',body:{scores:[{studentId:'child-a',status:'Scored',score:64}]}})).status,200)
 assert.equal((await request(`/exams/v2/assignments/${assignment.id}/submit`,{token:teacherToken,method:'POST'})).status,200)
 const before=(await db.select().from(students).where(eq(students.id,'child-a')))[0].classId
 const published=await request(`/exams/v2/sessions/${created.body.id}/publish`,{token:schoolAdminToken,method:'POST'})
 assert.equal(published.status,200);assert.equal(published.body.results[0].outcome,'Passed')
 assert.equal((await db.select().from(students).where(eq(students.id,'child-a')))[0].classId,before)
 assert.equal((await db.select().from(examResultsV2).where(eq(examResultsV2.sessionId,created.body.id))).length,1)
 const promotions=await db.select().from(studentPromotionsV2).where(eq(studentPromotionsV2.schoolId,'school-a'))
 assert.ok(promotions.some(row=>row.sourceResultId===published.body.results[0].id&&row.status==='Pending'))
 const targetYear=(await db.select().from(academicYears).where(eq(academicYears.status,'Active'))).find(row=>row.schoolId==='school-a')
 const transitioned=await request('/exams/v2/year-transitions',{token:schoolAdminToken,method:'POST',body:{fromAcademicYearId:sourceYear.id,toAcademicYearId:targetYear.id,idempotencyKey:'v2-transition-one'}})
 assert.equal(transitioned.status,200);assert.equal(transitioned.body.applied,1)
 assert.equal((await db.select().from(students).where(eq(students.id,'child-a')))[0].classId,targetClass.id)
 assert.equal((await request('/exams/v2/year-transitions',{token:schoolAdminToken,method:'POST',body:{fromAcademicYearId:sourceYear.id,toAcademicYearId:targetYear.id,idempotencyKey:'v2-transition-one'}})).body.applied,0)
 assert.equal((await db.select().from(examSessionsV2).where(eq(examSessionsV2.id,created.body.id)))[0].status,'Published')
 await db.update(students).set({classId:'portal-class-a',gradeLevel:'Portal Class A'}).where(eq(students.id,'child-a'))
})

test('student profile, preferences, gallery favorites, and conversations persist with ownership checks',async()=>{
 const profile=await request('/student/profile?studentId=child-a',{token:guardianToken,method:'PATCH',body:{interests:'Reading and painting',about:'I enjoy story time.',phone:'+252 61 1111111',photoUrl:'https://example.com/avatar.png'}})
 assert.equal(profile.status,200);assert.equal(profile.body.name,'Child A');assert.equal(profile.body.interests,'Reading and painting')
 assert.equal((await request('/student/profile?studentId=child-a',{token:guardianToken,method:'PATCH',body:{name:'Changed identity'}})).status,400)
 const reloaded=await request('/student/me?studentId=child-a',{token:guardianToken})
 assert.equal(reloaded.body.name,'Child A');assert.equal(reloaded.body.phone,'+252 61 1111111')

 const settings={dark:true,largeText:true,reminders:false,announcements:false}
 const savedSettings=await request('/student/preferences',{token:guardianToken,method:'PUT',body:settings})
 assert.equal(savedSettings.status,200);assert.deepEqual(savedSettings.body,settings)
 assert.deepEqual((await request('/student/preferences',{token:guardianToken})).body,settings)
 assert.equal((await db.select().from(studentPreferences).where(eq(studentPreferences.userId,'student'))).length,1)
 assert.equal((await request('/student/preferences',{token:guardianToken,method:'PUT',body:{...settings,unknown:true}})).status,400)

 const favoritePath='/student/gallery/portal-class-photo/favorite?studentId=child-a'
 assert.equal((await request(favoritePath,{token:guardianToken,method:'PUT'})).status,200)
 assert.equal((await request(favoritePath,{token:guardianToken,method:'PUT'})).status,200)
 assert.equal((await db.select().from(galleryFavorites).where(eq(galleryFavorites.studentId,'child-a'))).length,1)
 assert.deepEqual((await request('/student/gallery?studentId=child-a',{token:guardianToken})).body.favorites,['portal-class-photo'])
 assert.equal((await request('/student/gallery/portal-class-photo/favorite?studentId=portal-child-empty',{token:guardianToken,method:'PUT'})).status,404)
 assert.equal((await request('/student/gallery/portal-foreign-photo/favorite?studentId=child-a',{token:guardianToken,method:'PUT'})).status,404)
 assert.equal((await request(favoritePath,{token:guardianToken,method:'DELETE'})).status,200)
 assert.deepEqual((await request('/student/gallery?studentId=child-a',{token:guardianToken})).body.favorites,[])

 const sent=await request('/student/conversations/portal-own-thread/messages?studentId=child-a',{token:guardianToken,method:'POST',body:{body:'Thank you, teacher.'}})
 assert.equal(sent.status,201);assert.equal(sent.body.text,'Thank you, teacher.')
 let threads=(await request('/student/conversations?studentId=child-a',{token:guardianToken})).body
 assert.equal(threads[0].messages.at(-1).text,'Thank you, teacher.');assert.equal(threads[0].unread,false)
 await db.update(conversationParticipants).set({lastReadAt:new Date(Date.now()-5000)}).where(eq(conversationParticipants.id,'portal-own-student-participant'))
 await db.insert(portalMessages).values({id:'portal-second-teacher-message',conversationId:'portal-own-thread',senderId:'teacher',body:'You are welcome.',createdAt:new Date(Date.now()-1000)})
 threads=(await request('/student/conversations?studentId=child-a',{token:guardianToken})).body
 assert.equal(threads[0].unread,true)
 assert.equal((await request('/student/conversations/portal-own-thread/read?studentId=child-a',{token:guardianToken,method:'POST'})).status,200)
 threads=(await request('/student/conversations?studentId=child-a',{token:guardianToken})).body
 assert.equal(threads[0].unread,false)
 assert.equal((await request('/student/conversations/portal-foreign-thread/messages?studentId=child-a',{token:guardianToken,method:'POST',body:{body:'Not allowed'}})).status,404)
 assert.equal((await request('/student/conversations/portal-own-thread/messages?studentId=child-a',{token:guardianToken,method:'POST',body:{body:' '}})).status,400)
})
