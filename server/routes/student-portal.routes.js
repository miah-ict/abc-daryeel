import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm'
import { z } from 'zod'
import {
  academicYears, assignmentSubmissions, attendance, classes, classSubjects,
  conversationParticipants, examAssignments, examResults as examResultTable, examScores, exams, galleryFavorites,
  galleryItems, learningAssignments, portalAnnouncements, portalConversations,
  portalMessages, portalSubjects, schools, studentEnrollments, studentPreferences,
  students, users,
} from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'
import { mutate } from '../services/mutate.js'
import { date as dateInput } from '../services/validation.js'
import { studentScope } from '../services/workspace.js'

const defaultSettings={dark:false,largeText:false,reminders:true,announcements:true}
const profileInput=z.object({
  interests:z.string().trim().max(1000).optional(),
  about:z.string().trim().max(5000).optional(),
  photoUrl:z.union([z.string().url().max(2000),z.literal('')]).optional(),
  phone:z.string().trim().max(50).optional(),
}).strict()
const settingsInput=z.object({dark:z.boolean(),largeText:z.boolean(),reminders:z.boolean(),announcements:z.boolean()}).strict()
const submissionInput=z.object({response:z.string().trim().min(1).max(20000)}).strict()
const messageInput=z.object({body:z.string().trim().min(1).max(5000)}).strict()
const boolSettings=row=>row?{dark:row.dark,largeText:row.largeText,reminders:row.assignmentReminders,announcements:row.announcementNotifications}:{...defaultSettings}
const iso=value=>value instanceof Date?value.toISOString():value
const day=value=>iso(value)?.slice(0,10)||''
const clock=value=>String(value||'').slice(0,5)
const roleLabel=role=>({teacher:'Teacher',admin:'Administration',manager:'School manager'}[role]||'School staff')
const safeInfo=value=>{if(!value)return {};if(typeof value==='object')return value;try{return JSON.parse(value)}catch{return {}}}
const localNow=()=>new Date(new Date().toLocaleString('en-US',{timeZone:'Africa/Mogadishu'}))

async function selectedStudent(db,req) {
  const roster=await db.select().from(students).where(studentScope(req.user))
  if(!roster.length)throw new HttpError(404,'No student profile is linked to this account.')
  const requested=req.query.studentId===undefined?null:z.string().min(1).max(100).parse(req.query.studentId)
  const student=requested?roster.find(row=>row.id===requested):roster[0]
  if(!student)throw new HttpError(403,'Student is outside your account.')
  if(!student.schoolId)throw new HttpError(409,'The student is not assigned to a school.')
  return {student,roster}
}

async function portalProfile(db,student,roster) {
  const [[school],[classroom],[teacher],[activeYear],enrollments]=await Promise.all([
    db.select().from(schools).where(eq(schools.id,student.schoolId)),
    student.classId?db.select().from(classes).where(and(eq(classes.id,student.classId),eq(classes.schoolId,student.schoolId))):Promise.resolve([]),
    student.teacherId?db.select().from(users).where(and(eq(users.id,student.teacherId),eq(users.schoolId,student.schoolId),eq(users.role,'teacher'))):Promise.resolve([]),
    db.select().from(academicYears).where(and(eq(academicYears.schoolId,student.schoolId),eq(academicYears.status,'Active'))),
    db.select().from(studentEnrollments).where(and(eq(studentEnrollments.studentId,student.id),eq(studentEnrollments.status,'Active'))),
  ])
  const info=safeInfo(school?.info),details=student.details||{}
  return {
    id:student.id,studentId:student.id,name:student.fullName,gradeLevel:classroom?.name||student.gradeLevel,
    classId:student.classId||null,status:student.status,guardian:student.guardian||'',email:student.email||'',
    phone:details.phone||student.emergencyContact||'',interests:details.interests||'',about:details.about||'',photoUrl:details.photoUrl||'',
    school:{id:school?.id||student.schoolId,name:school?.name||'School',logo:school?.logo||'',location:info.location||''},
    classroom:classroom?{...classroom,details:classroom.details||{}}:null,
    teacher:teacher?{id:teacher.id,name:teacher.fullName,email:teacher.email||''}:null,
    academicYear:activeYear?{id:activeYear.id,name:activeYear.name,startDate:activeYear.startDate,endDate:activeYear.endDate}:null,
    enrollments:enrollments.map(row=>({id:row.id,classId:row.classId,academicYearId:row.academicYearId,status:row.status})),
    linkedStudents:roster.map(row=>({id:row.id,name:row.fullName,gradeLevel:row.gradeLevel,classId:row.classId||null})),
  }
}

async function conversationRows(db,userId,schoolId) {
  const own=await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId,userId))
  if(!own.length)return []
  const ids=own.map(row=>row.conversationId)
  const conversations=await db.select().from(portalConversations).where(and(inArray(portalConversations.id,ids),eq(portalConversations.schoolId,schoolId)))
  if(!conversations.length)return []
  const allowed=new Set(conversations.map(row=>row.id))
  const [participants,messages]=await Promise.all([
    db.select().from(conversationParticipants).where(inArray(conversationParticipants.conversationId,[...allowed])),
    db.select().from(portalMessages).where(inArray(portalMessages.conversationId,[...allowed])).orderBy(asc(portalMessages.createdAt)),
  ])
  const userIds=[...new Set(participants.map(row=>row.userId))]
  const accounts=userIds.length?await db.select().from(users).where(inArray(users.id,userIds)):[]
  const accountMap=new Map(accounts.map(row=>[row.id,row])),ownMap=new Map(own.map(row=>[row.conversationId,row]))
  return conversations.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).map(conversation=>{
    const other=participants.map(row=>accountMap.get(row.userId)).find(row=>row&&row.id!==userId)
    const rows=messages.filter(row=>row.conversationId===conversation.id),lastRead=ownMap.get(conversation.id)?.lastReadAt
    const readTime=lastRead?new Date(lastRead).getTime():0
    return {id:conversation.id,name:other?.fullName||conversation.subject,role:roleLabel(other?.role),unread:rows.some(row=>row.senderId!==userId&&new Date(row.createdAt).getTime()>readTime),messages:rows.map(row=>({id:row.id,from:row.senderId===userId?'student':'teacher',text:row.body,time:iso(row.createdAt)}))}
  })
}

async function buildPortal(db,req) {
  const {student,roster}=await selectedStudent(db,req)
  const profile=await portalProfile(db,student,roster)
  const classId=student.classId
  const now=new Date(),schedule=classId?await db.select().from(classSubjects).where(and(eq(classSubjects.schoolId,student.schoolId),eq(classSubjects.classId,classId),eq(classSubjects.status,'Active'))):[]
  const subjectIds=[...new Set(schedule.map(row=>row.subjectId))]
  const [subjectRows,teacherRows,assignmentRows,attendanceRows,announcementRows,galleryRows,favoriteRows,preferenceRows,scoreRows,officialResults,threads]=await Promise.all([
    subjectIds.length?db.select().from(portalSubjects).where(and(inArray(portalSubjects.id,subjectIds),eq(portalSubjects.schoolId,student.schoolId),eq(portalSubjects.status,'Active'))):Promise.resolve([]),
    schedule.some(row=>row.teacherId)?db.select().from(users).where(inArray(users.id,[...new Set(schedule.map(row=>row.teacherId).filter(Boolean))])):Promise.resolve([]),
    classId?db.select().from(learningAssignments).where(and(eq(learningAssignments.schoolId,student.schoolId),eq(learningAssignments.classId,classId),inArray(learningAssignments.status,['Open','Closed']))).orderBy(asc(learningAssignments.dueAt)):Promise.resolve([]),
    db.select().from(attendance).where(eq(attendance.studentId,student.id)).orderBy(desc(attendance.date)),
    db.select().from(portalAnnouncements).where(and(eq(portalAnnouncements.schoolId,student.schoolId),eq(portalAnnouncements.status,'Published'),classId?or(isNull(portalAnnouncements.classId),eq(portalAnnouncements.classId,classId)):isNull(portalAnnouncements.classId))).orderBy(desc(portalAnnouncements.publishedAt)),
    db.select().from(galleryItems).where(and(eq(galleryItems.schoolId,student.schoolId),eq(galleryItems.status,'Published'),classId?or(isNull(galleryItems.classId),eq(galleryItems.classId,classId)):isNull(galleryItems.classId))).orderBy(desc(galleryItems.capturedAt)),
    db.select().from(galleryFavorites).where(eq(galleryFavorites.studentId,student.id)),
    db.select().from(studentPreferences).where(eq(studentPreferences.userId,req.user.id)),
    db.select({subjectName:examAssignments.subjectName,score:examScores.score}).from(examScores).innerJoin(examAssignments,eq(examScores.assignmentId,examAssignments.id)).innerJoin(exams,eq(examAssignments.examId,exams.id)).where(and(eq(examScores.studentId,student.id),eq(exams.status,'Published'))),
    db.select({id:examResultTable.id,examId:examResultTable.examId,studentId:examResultTable.studentId,classId:examResultTable.classId,average:examResultTable.average,rank:examResultTable.rank,outcome:examResultTable.outcome,promotionClassId:examResultTable.promotionClassId,failedDecision:examResultTable.failedDecision,publishedAt:examResultTable.publishedAt,examTitle:exams.title,examType:exams.type}).from(examResultTable).innerJoin(exams,eq(examResultTable.examId,exams.id)).where(and(eq(examResultTable.studentId,student.id),eq(exams.status,'Published'))).orderBy(desc(examResultTable.publishedAt)),
    conversationRows(db,req.user.id,student.schoolId),
  ])
  const assignmentIds=assignmentRows.map(row=>row.id)
  const submissions=assignmentIds.length?await db.select().from(assignmentSubmissions).where(and(eq(assignmentSubmissions.studentId,student.id),inArray(assignmentSubmissions.assignmentId,assignmentIds))):[]
  const submissionMap=new Map(submissions.map(row=>[row.assignmentId,row])),subjectMap=new Map(subjectRows.map(row=>[row.id,row])),teacherMap=new Map(teacherRows.map(row=>[row.id,row]))
  const scoresByName=new Map()
  for(const row of scoreRows){const key=row.subjectName.toLowerCase(),list=scoresByName.get(key)||[];list.push(row.score);scoresByName.set(key,list)}
  const fallbackArt=[[309,505,66,66],[418,505,66,66],[526,505,66,66],[634,505,66,66],[742,505,66,66]]
  const subjects=subjectRows.map((subject,index)=>{
    const slots=schedule.filter(row=>row.subjectId===subject.id),slot=slots[0],teacher=teacherMap.get(slot?.teacherId),metadata=subject.metadata||{},marks=scoresByName.get(subject.name.toLowerCase())||[]
    return {id:subject.id,name:subject.name,icon:subject.icon,tone:subject.tone,label:metadata.label||'Scheduled',score:marks.length?Math.round(marks.reduce((sum,value)=>sum+value,0)/marks.length):null,teacher:teacher?.fullName||'',description:subject.description,time:slot?`${clock(slot.startTime)} – ${clock(slot.endTime)}`:'',art:Array.isArray(metadata.art)?metadata.art:fallbackArt[index%fallbackArt.length]}
  })
  const today=localNow().getDay()
  const activities=schedule.map((slot,index)=>{const subject=subjectMap.get(slot.subjectId),teacher=teacherMap.get(slot.teacherId),metadata=slot.metadata||{};return {id:slot.id,time:`${clock(slot.startTime)} – ${clock(slot.endTime)}`,title:subject?.name||'Class activity',description:metadata.description||[teacher?.fullName,slot.room].filter(Boolean).join(' · '),icon:subject?.icon||'BookOpen',tone:subject?.tone||'blue',status:metadata.status||(slot.weekday===today?'Upcoming':'Scheduled'),subject:slot.subjectId,weekday:slot.weekday}})
  const assignments=assignmentRows.map(row=>{const subject=subjectMap.get(row.subjectId),submission=submissionMap.get(row.id),metadata=row.metadata||{};return {id:row.id,title:row.title,subject:subject?.name||metadata.subject||'Classwork',subjectId:row.subjectId,due:day(row.dueAt),description:row.description,status:submission?'Submitted':row.status==='Open'?'Pending':'Closed',icon:metadata.icon||subject?.icon||'ClipboardList',tone:metadata.tone||subject?.tone||'purple',response:submission?.response||'',submittedAt:iso(submission?.submittedAt)}})
  const announcements=announcementRows.filter(row=>!row.expiresAt||row.expiresAt>now).map(row=>({id:row.id,title:row.title,tag:row.tag,date:day(row.publishedAt),image:row.imageUrl||'',description:row.description,body:row.body}))
  const gallery=galleryRows.map(row=>({id:row.id,title:row.title,category:row.category,src:row.assetUrl,capturedAt:iso(row.capturedAt)}))
  return {profile,settings:boolSettings(preferenceRows[0]),classroom:profile.classroom,subjects,assignments,attendance:attendanceRows.map(row=>({id:row.id,date:row.date,status:row.status,arrival:row.arrivalTime?clock(row.arrivalTime):'—',notes:row.notes||''})),activities,announcements,gallery,threads,favorites:favoriteRows.map(row=>row.galleryItemId),examResults:officialResults}
}

async function visibleAssignment(db,student,id) {
  if(!student.classId)return null
  const [row]=await db.select().from(learningAssignments).where(and(eq(learningAssignments.id,id),eq(learningAssignments.schoolId,student.schoolId),eq(learningAssignments.classId,student.classId),eq(learningAssignments.status,'Open')))
  return row||null
}

async function visibleGalleryItem(db,student,id) {
  const [row]=await db.select().from(galleryItems).where(and(eq(galleryItems.id,id),eq(galleryItems.schoolId,student.schoolId),eq(galleryItems.status,'Published'),student.classId?or(isNull(galleryItems.classId),eq(galleryItems.classId,student.classId)):isNull(galleryItems.classId)))
  return row||null
}

async function ownConversation(db,req,id) {
  const {student}=await selectedStudent(db,req)
  const [participant]=await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId,id),eq(conversationParticipants.userId,req.user.id)))
  if(!participant)return null
  const [conversation]=await db.select().from(portalConversations).where(and(eq(portalConversations.id,id),eq(portalConversations.schoolId,student.schoolId)))
  return conversation?{conversation,participant}:null
}

export function studentPortalRoutes(db) {
  const router=Router()
  router.use(allow('student'))

  router.get('/portal',asyncRoute(async(req,res)=>res.json(await buildPortal(db,req))))
  router.get('/me',asyncRoute(async(req,res)=>{const {student,roster}=await selectedStudent(db,req);res.json(await portalProfile(db,student,roster))}))
  router.get('/preferences',asyncRoute(async(req,res)=>{const [row]=await db.select().from(studentPreferences).where(eq(studentPreferences.userId,req.user.id));res.json(boolSettings(row))}))
  router.get('/classes',asyncRoute(async(req,res)=>{const portal=await buildPortal(db,req);res.json({classroom:portal.classroom,subjects:portal.subjects,activities:portal.activities})}))
  router.get('/assignments',asyncRoute(async(req,res)=>res.json((await buildPortal(db,req)).assignments)))
  router.get('/attendance',asyncRoute(async(req,res)=>{
    const {student}=await selectedStudent(db,req),from=req.query.from?dateInput.parse(req.query.from):null,to=req.query.to?dateInput.parse(req.query.to):null
    if(from&&to&&from>to)throw new HttpError(400,'The start date must be before the end date.')
    const rows=await db.select().from(attendance).where(and(eq(attendance.studentId,student.id),from?gte(attendance.date,from):undefined,to?lte(attendance.date,to):undefined)).orderBy(desc(attendance.date))
    res.json(rows.map(row=>({...row,arrival:row.arrivalTime?clock(row.arrivalTime):'—'})))
  }))
  router.get('/grades',asyncRoute(async(req,res)=>res.json((await buildPortal(db,req)).examResults)))
  router.get('/announcements',asyncRoute(async(req,res)=>res.json((await buildPortal(db,req)).announcements)))
  router.get('/gallery',asyncRoute(async(req,res)=>{const portal=await buildPortal(db,req);res.json({items:portal.gallery,favorites:portal.favorites})}))
  router.get('/conversations',asyncRoute(async(req,res)=>{const {student}=await selectedStudent(db,req);res.json(await conversationRows(db,req.user.id,student.schoolId))}))

  const updateProfile=asyncRoute(async(req,res)=>{
    const input=profileInput.parse(req.body),{student,roster}=await selectedStudent(db,req)
    await mutate(db,req.user,'student.profile.update',async tx=>{const details={...(student.details||{}),...input};await tx.update(students).set({details}).where(eq(students.id,student.id));return {id:student.id}})
    const [fresh]=await db.select().from(students).where(eq(students.id,student.id));res.json(await portalProfile(db,fresh,roster.map(row=>row.id===fresh.id?fresh:row)))
  })
  router.patch('/me',updateProfile)
  router.patch('/profile',updateProfile)

  router.put('/preferences',asyncRoute(async(req,res)=>{
    const input=settingsInput.parse(req.body),row={userId:req.user.id,dark:input.dark,largeText:input.largeText,assignmentReminders:input.reminders,announcementNotifications:input.announcements,updatedAt:new Date()}
    const [saved]=await mutate(db,req.user,'student.preferences.update',tx=>tx.insert(studentPreferences).values(row).onConflictDoUpdate({target:studentPreferences.userId,set:row}).returning())
    res.json(boolSettings(saved))
  }))

  router.put('/assignments/:id/submission',asyncRoute(async(req,res)=>{
    const input=submissionInput.parse(req.body),{student}=await selectedStudent(db,req),assignment=await visibleAssignment(db,student,req.params.id)
    if(!assignment)throw new HttpError(404,'Open assignment not found for this student.')
    const now=new Date(),row={id:randomUUID(),assignmentId:assignment.id,studentId:student.id,response:input.response,status:'Submitted',submittedAt:now,updatedAt:now}
    const [saved]=await mutate(db,req.user,'student.assignment.submit',tx=>tx.insert(assignmentSubmissions).values(row).onConflictDoUpdate({target:[assignmentSubmissions.assignmentId,assignmentSubmissions.studentId],set:{response:input.response,status:'Submitted',updatedAt:now}}).returning())
    res.json(saved)
  }))

  router.put('/gallery/:id/favorite',asyncRoute(async(req,res)=>{
    const {student}=await selectedStudent(db,req),item=await visibleGalleryItem(db,student,req.params.id)
    if(!item)throw new HttpError(404,'Gallery item not found.')
    await mutate(db,req.user,'student.gallery.favorite',tx=>tx.insert(galleryFavorites).values({id:randomUUID(),studentId:student.id,galleryItemId:item.id}).onConflictDoNothing({target:[galleryFavorites.studentId,galleryFavorites.galleryItemId]}).returning())
    res.json({galleryItemId:item.id,favorite:true})
  }))
  router.delete('/gallery/:id/favorite',asyncRoute(async(req,res)=>{
    const {student}=await selectedStudent(db,req)
    await mutate(db,req.user,'student.gallery.unfavorite',tx=>tx.delete(galleryFavorites).where(and(eq(galleryFavorites.studentId,student.id),eq(galleryFavorites.galleryItemId,req.params.id))).returning())
    res.json({galleryItemId:req.params.id,favorite:false})
  }))

  router.post('/conversations/:id/messages',asyncRoute(async(req,res)=>{
    const input=messageInput.parse(req.body),own=await ownConversation(db,req,req.params.id)
    if(!own)throw new HttpError(404,'Conversation not found.')
    const now=new Date(),[saved]=await mutate(db,req.user,'student.message.send',async tx=>{const [message]=await tx.insert(portalMessages).values({id:randomUUID(),conversationId:own.conversation.id,senderId:req.user.id,body:input.body,createdAt:now}).returning();await tx.update(portalConversations).set({updatedAt:now}).where(eq(portalConversations.id,own.conversation.id));await tx.update(conversationParticipants).set({lastReadAt:now}).where(and(eq(conversationParticipants.conversationId,own.conversation.id),eq(conversationParticipants.userId,req.user.id)));return [message]})
    res.status(201).json({id:saved.id,from:'student',text:saved.body,time:iso(saved.createdAt)})
  }))
  router.post('/conversations/:id/read',asyncRoute(async(req,res)=>{
    const own=await ownConversation(db,req,req.params.id)
    if(!own)throw new HttpError(404,'Conversation not found.')
    const now=new Date()
    await mutate(db,req.user,'student.message.read',tx=>tx.update(conversationParticipants).set({lastReadAt:now}).where(eq(conversationParticipants.id,own.participant.id)).returning())
    res.json({conversationId:own.conversation.id,lastReadAt:iso(now)})
  }))
  return router
}
