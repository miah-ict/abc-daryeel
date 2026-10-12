import {createEmailService} from '../services/email.js'
import {Router} from 'express'
import {randomUUID} from 'node:crypto'
import {and,eq,inArray} from 'drizzle-orm'
import {z} from 'zod'
import {
 academicYears,classes,users,systemLogs,examSettingsV2,classProgressionsV2,academicSubjectsV2,classSubjectOfferingsV2,offeringTeachersV2,
 examTemplatesV2,examTemplateSubjectsV2,examSessionsV2,examAssignmentsV2,examAssignmentStudentsV2,examScoresV2,examResultsV2,examResultSubjectsV2,
 examDecisionsV2,studentPromotionsV2,coursesV2,courseClassesV2,courseSubjectsV2,courseOffersV2,courseEnrollmentsV2,coursePaymentsV2,students,
} from '../db/schema/index.js'
import {allow} from '../middleware/auth.middleware.js'
import {asyncRoute,HttpError} from '../middleware/error.middleware.js'
import {assignmentPreview,createSession,publishSession,applyYearTransition,writableYear} from '../services/exams-v2.service.js'

const id=z.string().min(1).max(200),date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/),instant=z.string().datetime({offset:true})
const policy=z.object({passBasis:z.enum(['AverageOnly','AverageAndSubjectMinimum']),maxMarkModel:z.literal('PerSubject'),deadlinePolicy:z.enum(['AllowLate','BlockLate']),reexamScope:z.enum(['FailedSubjects','AllSubjects']),reexamScorePolicy:z.enum(['SeparateResolution','Replace','Average']),promotionTiming:z.enum(['OnFinalPublish','YearTransition']),rounding:z.enum(['HalfUp2']),passAverage:z.coerce.number().min(0).max(100),reExamAllowed:z.boolean().default(true)}).passthrough()
const sessionInput=z.object({idempotencyKey:id,title:z.string().trim().min(2).max(160),academicYearId:id,templateId:id,term:z.string().trim().min(1).max(80),startDate:date,endDate:date,teacherDeadline:instant,publishMode:z.literal('Manual').default('Manual'),allClasses:z.boolean().default(false),classIds:z.array(id).max(500).default([]),parentSessionId:id.nullable().optional(),courseId:id.nullable().optional()}).strict()
const previewInput=sessionInput.omit({idempotencyKey:true,title:true,publishMode:true})
const setupInput=z.object({version:z.coerce.number().int().positive(),currentStep:z.coerce.number().int().min(1).max(5),featureEnabled:z.boolean().default(false),policyStatus:z.enum(['Pending','Confirmed']),rules:z.record(z.string(),z.unknown())}).strict()
const assertDates=row=>{if(row.endDate<row.startDate)throw new HttpError(400,'End date must not be before start date.');const deadline=new Date(row.teacherDeadline);if(Number.isNaN(deadline.getTime()))throw new HttpError(400,'Teacher deadline is invalid.')}
const audit=(tx,user,action,detail)=>tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId,action,detail:JSON.stringify(detail)})

export function examsV2Routes(db,env={}){
 const emailService=createEmailService(env)
 const router=Router();router.use(allow('admin','manager','teacher','student'))

 router.get('/settings',allow('admin','manager'),asyncRoute(async(req,res)=>{const rows=await db.select().from(examSettingsV2).where(eq(examSettingsV2.schoolId,req.user.schoolId));res.json(rows.sort((a,b)=>b.version-a.version))}))
 router.put('/settings',allow('admin'),asyncRoute(async(req,res)=>{const input=setupInput.parse(req.body);if(input.policyStatus==='Confirmed')policy.parse(input.rules);const existing=await db.select().from(examSettingsV2).where(eq(examSettingsV2.schoolId,req.user.schoolId));const current=existing.sort((a,b)=>b.version-a.version)[0];if(current&&input.version<=current.version)throw new HttpError(409,'Settings version must increase.');const [created]=await db.transaction(async tx=>{const [row]=await tx.insert(examSettingsV2).values({id:randomUUID(),schoolId:req.user.schoolId,version:input.version,status:'Draft',currentStep:input.currentStep,featureEnabled:false,policyStatus:input.policyStatus,rules:input.rules}).returning();await audit(tx,req.user,'exams.v2.settings.draft',{id:row.id,version:row.version,policyStatus:row.policyStatus});return [row]});res.status(201).json(created)}))
 router.post('/settings/:id/complete',allow('admin'),asyncRoute(async(req,res)=>{const [row]=await db.select().from(examSettingsV2).where(and(eq(examSettingsV2.id,req.params.id),eq(examSettingsV2.schoolId,req.user.schoolId)));if(!row)throw new HttpError(404,'Exam settings not found.');if(row.policyStatus!=='Confirmed')throw new HttpError(409,'Academic policy decisions must be confirmed before enabling exam v2.');policy.parse(row.rules);const [updated]=await db.transaction(async tx=>{const [item]=await tx.update(examSettingsV2).set({status:'Complete',currentStep:5,featureEnabled:true,completedAt:new Date(),completedBy:req.user.id}).where(eq(examSettingsV2.id,row.id)).returning();await audit(tx,req.user,'exams.v2.settings.complete',{id:item.id,version:item.version});return [item]});res.json(updated)}))

 router.put('/progressions/:academicYearId',allow('admin'),asyncRoute(async(req,res)=>{await writableYear(db,req.user.schoolId,req.params.academicYearId);const input=z.object({rows:z.array(z.object({classId:id,order:z.coerce.number().int().positive(),nextClassId:id.nullable(),isFinal:z.boolean()})).min(1).max(500)}).strict().parse(req.body),classIds=new Set(input.rows.map(row=>row.classId)),orders=new Set(input.rows.map(row=>row.order));if(classIds.size!==input.rows.length||orders.size!==input.rows.length)throw new HttpError(400,'Progression classes and order values must be unique.');if(input.rows.filter(row=>row.isFinal).length!==1)throw new HttpError(400,'Exactly one final class is required.');const schoolClasses=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),allowed=new Set(schoolClasses.map(row=>row.id));if(input.rows.some(row=>!allowed.has(row.classId)||(row.nextClassId&&!allowed.has(row.nextClassId))||(row.isFinal&&row.nextClassId)))throw new HttpError(400,'Progression contains an invalid class or final target.');const byId=new Map(input.rows.map(row=>[row.classId,row]));for(const start of input.rows){const seen=new Set();let cursor=start;while(cursor?.nextClassId){if(seen.has(cursor.classId))throw new HttpError(400,'Class progression cannot contain a cycle.');seen.add(cursor.classId);cursor=byId.get(cursor.nextClassId);if(!cursor)throw new HttpError(400,'Every next class must be in the progression set.')}}const result=await db.transaction(async tx=>{await tx.delete(classProgressionsV2).where(and(eq(classProgressionsV2.schoolId,req.user.schoolId),eq(classProgressionsV2.academicYearId,req.params.academicYearId)));const rows=await tx.insert(classProgressionsV2).values(input.rows.map(row=>({id:randomUUID(),schoolId:req.user.schoolId,academicYearId:req.params.academicYearId,...row,status:'Active'}))).returning();await audit(tx,req.user,'exams.v2.progression.replace',{academicYearId:req.params.academicYearId,count:rows.length});return rows});res.json(result)}))

 router.post('/subjects',allow('admin'),asyncRoute(async(req,res)=>{const input=z.object({name:z.string().trim().min(1).max(120)}).strict().parse(req.body),normalizedName=input.name.toLocaleLowerCase('en').replace(/\s+/g,' ');const [created]=await db.insert(academicSubjectsV2).values({id:randomUUID(),schoolId:req.user.schoolId,name:input.name,normalizedName,status:'Active'}).returning();res.status(201).json(created)}))
 router.get('/subjects',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>res.json(await db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)))))
 router.post('/offerings',allow('admin'),asyncRoute(async(req,res)=>{const input=z.object({academicYearId:id,classId:id,subjectId:id,effectiveFrom:instant,effectiveTo:instant.nullable().optional(),teachers:z.array(z.object({teacherId:id,role:z.enum(['Lead','CoTeacher'])})).min(1).max(20)}).strict().parse(req.body);await writableYear(db,req.user.schoolId,input.academicYearId);if(input.teachers.filter(row=>row.role==='Lead').length!==1)throw new HttpError(400,'Exactly one lead teacher is required.');const [[classroom],[subject],teacherRows]=await Promise.all([db.select().from(classes).where(and(eq(classes.id,input.classId),eq(classes.schoolId,req.user.schoolId))),db.select().from(academicSubjectsV2).where(and(eq(academicSubjectsV2.id,input.subjectId),eq(academicSubjectsV2.schoolId,req.user.schoolId))),db.select().from(users).where(and(eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher'),eq(users.status,'Active')))]);const teacherIds=new Set(teacherRows.map(row=>row.id));if(!classroom||!subject||input.teachers.some(row=>!teacherIds.has(row.teacherId)))throw new HttpError(400,'Offering class, subject, and teachers must belong to this school.');const created=await db.transaction(async tx=>{const offeringId=randomUUID(),[offering]=await tx.insert(classSubjectOfferingsV2).values({id:offeringId,schoolId:req.user.schoolId,academicYearId:input.academicYearId,classId:input.classId,subjectId:input.subjectId,effectiveFrom:new Date(input.effectiveFrom),effectiveTo:input.effectiveTo?new Date(input.effectiveTo):null,status:'Active'}).returning();await tx.insert(offeringTeachersV2).values(input.teachers.map(row=>({id:randomUUID(),schoolId:req.user.schoolId,offeringId,effectiveFrom:new Date(input.effectiveFrom),effectiveTo:input.effectiveTo?new Date(input.effectiveTo):null,status:'Active',...row})));await audit(tx,req.user,'exams.v2.offering.create',{offeringId});return offering});res.status(201).json(created)}))

 router.post('/templates',allow('admin'),asyncRoute(async(req,res)=>{const input=z.object({familyId:id,version:z.coerce.number().int().positive(),name:z.string().trim().min(2).max(120),category:z.enum(['Monthly','Midterm','Final','Re-exam','Course']),promotionExam:z.boolean().default(false),reExamAllowed:z.boolean().default(false),visibility:z.enum(['PublishedOnly']).default('PublishedOnly'),rules:z.record(z.string(),z.unknown()).default({}),subjects:z.array(z.object({subjectId:id,order:z.coerce.number().int().positive(),maxMark:z.coerce.number().positive().max(10000),minimumMark:z.coerce.number().min(0).max(10000),required:z.boolean().default(true)})).min(1).max(200)}).strict().parse(req.body);if(new Set(input.subjects.map(row=>row.subjectId)).size!==input.subjects.length||new Set(input.subjects.map(row=>row.order)).size!==input.subjects.length||input.subjects.some(row=>row.minimumMark>row.maxMark))throw new HttpError(400,'Template subjects, order, and mark bounds must be valid and unique.');const subjects=await db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)),ids=new Set(subjects.map(row=>row.id));if(input.subjects.some(row=>!ids.has(row.subjectId)))throw new HttpError(400,'Every template subject must belong to this school.');const created=await db.transaction(async tx=>{const templateId=randomUUID(),[template]=await tx.insert(examTemplatesV2).values({id:templateId,schoolId:req.user.schoolId,familyId:input.familyId,version:input.version,name:input.name,category:input.category,status:'Active',promotionExam:input.promotionExam,reExamAllowed:input.reExamAllowed,visibility:input.visibility,rules:{...input.rules,reExamAllowed:input.reExamAllowed},createdBy:req.user.id}).returning();await tx.insert(examTemplateSubjectsV2).values(input.subjects.map(row=>({id:randomUUID(),schoolId:req.user.schoolId,templateId,...row,maxMark:String(row.maxMark),minimumMark:String(row.minimumMark)})));await audit(tx,req.user,'exams.v2.template.create',{templateId,version:template.version});return template});res.status(201).json(created)}))
 router.get('/templates',allow('admin','manager'),asyncRoute(async(req,res)=>{const rows=await db.select().from(examTemplatesV2).where(eq(examTemplatesV2.schoolId,req.user.schoolId)),ids=rows.map(row=>row.id),subjectRows=ids.length?await db.select().from(examTemplateSubjectsV2).where(inArray(examTemplateSubjectsV2.templateId,ids)):[];res.json(rows.map(row=>({...row,subjects:subjectRows.filter(subject=>subject.templateId===row.id).sort((a,b)=>a.order-b.order)})))}))

 router.post('/assignments/preview',allow('admin'),asyncRoute(async(req,res)=>{const input=previewInput.parse(req.body);assertDates(input);const preview=await assignmentPreview(db,req.user.schoolId,input);if(preview.issues.length)return res.status(422).json({error:'Exam assignments could not be generated.',code:'ASSIGNMENT_SOURCE_INVALID',summary:preview.summary,issues:preview.issues});res.json(preview)}))
 router.post('/sessions',allow('admin'),asyncRoute(async(req,res)=>{const input=sessionInput.parse(req.body);assertDates(input);const created=await createSession(db,req.user,input);if(created?.invalid)return res.status(422).json({error:'Exam assignments could not be generated.',code:'ASSIGNMENT_SOURCE_INVALID',summary:created.preview.summary,issues:created.preview.issues});res.status(201).json(created)}))
 router.get('/sessions',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{let sessions=await db.select().from(examSessionsV2).where(eq(examSessionsV2.schoolId,req.user.schoolId));if(req.user.role==='teacher'){const own=await db.select().from(examAssignmentsV2).where(and(eq(examAssignmentsV2.schoolId,req.user.schoolId),eq(examAssignmentsV2.leadTeacherId,req.user.id))),allowed=new Set(own.map(row=>row.sessionId));sessions=sessions.filter(row=>allowed.has(row.id))}res.json(sessions)}))

 const assignmentContext=async(req,assignmentId,tx=db)=>{const [assignment]=await tx.select().from(examAssignmentsV2).where(and(eq(examAssignmentsV2.id,assignmentId),eq(examAssignmentsV2.schoolId,req.user.schoolId)));if(!assignment)throw new HttpError(404,'Exam assignment not found.');if(req.user.role==='teacher'&&assignment.leadTeacherId!==req.user.id)throw new HttpError(403,'This assignment belongs to another teacher.');const [session]=await tx.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,assignment.sessionId),eq(examSessionsV2.schoolId,req.user.schoolId)));if(!session)throw new HttpError(404,'Exam session not found.');return {assignment,session}}
 router.get('/assignments',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{let rows=await db.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.schoolId,req.user.schoolId));if(req.user.role==='teacher')rows=rows.filter(row=>row.leadTeacherId===req.user.id);const sessionIds=[...new Set(rows.map(row=>row.sessionId))],[sessionRows,classRows,rosterRows]=await Promise.all([sessionIds.length?db.select().from(examSessionsV2).where(inArray(examSessionsV2.id,sessionIds)):[],db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),rows.length?db.select().from(examAssignmentStudentsV2).where(inArray(examAssignmentStudentsV2.assignmentId,rows.map(row=>row.id))):[]]),sessionMap=new Map(sessionRows.map(row=>[row.id,row])),classMap=new Map(classRows.map(row=>[row.id,row.name])),counts=new Map();for(const row of rosterRows)counts.set(row.assignmentId,(counts.get(row.assignmentId)||0)+1);res.json({serverNow:new Date().toISOString(),assignments:rows.filter(row=>sessionMap.get(row.sessionId)?.status!=='Cancelled').map(row=>({...row,examName:sessionMap.get(row.sessionId)?.title||'',sessionStatus:sessionMap.get(row.sessionId)?.status||'',className:classMap.get(row.classId)||'',studentCount:counts.get(row.id)||0}))})}))
 router.get('/assignments/:id',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{const {assignment,session}=await assignmentContext(req,req.params.id),roster=await db.select().from(examAssignmentStudentsV2).where(eq(examAssignmentStudentsV2.assignmentId,assignment.id)),scoreRows=roster.length?await db.select().from(examScoresV2).where(inArray(examScoresV2.assignmentStudentId,roster.map(row=>row.id))):[],studentRows=roster.length?await db.select().from(students).where(inArray(students.id,roster.map(row=>row.studentId))):[],scoreMap=new Map(scoreRows.map(row=>[row.assignmentStudentId,row])),nameMap=new Map(studentRows.map(row=>[row.id,row.fullName]));res.json({...assignment,session,serverNow:new Date().toISOString(),students:roster.map(row=>({...row,name:nameMap.get(row.studentId)||'',mark:scoreMap.get(row.id)||null}))})}))
 router.put('/assignments/:id/scores',allow('admin','teacher'),asyncRoute(async(req,res)=>{const input=z.object({scores:z.array(z.object({studentId:id,status:z.enum(['Scored','Absent','Withdrawn','Exempt']),score:z.coerce.number().min(0).max(10000).nullable().optional(),reason:z.string().trim().max(500).optional()})).max(5000)}).strict().parse(req.body);const saved=await db.transaction(async tx=>{const {assignment,session}=await assignmentContext(req,req.params.id,tx);await writableYear(tx,req.user.schoolId,session.academicYearId,tx);if(session.status==='Published'||['Submitted','Late'].includes(assignment.status)||assignment.hardLocked)throw new HttpError(409,'This mark sheet is locked.');if(session.rulesSnapshot?.deadlinePolicy==='BlockLate'&&assignment.status!=='Reopened'&&req.user.role==='teacher'&&new Date()>new Date(assignment.deadline))throw new HttpError(409,'The teacher deadline has passed. Ask an admin to reopen submission.');const roster=await tx.select().from(examAssignmentStudentsV2).where(eq(examAssignmentStudentsV2.assignmentId,assignment.id)),byStudent=new Map(roster.map(row=>[row.studentId,row]));if(new Set(input.scores.map(row=>row.studentId)).size!==input.scores.length||input.scores.some(row=>!byStudent.has(row.studentId)))throw new HttpError(400,'Scores contain duplicate or ineligible students.');for(const row of input.scores){if(row.status==='Scored'&&(row.score===null||row.score===undefined||row.score>Number(assignment.maxMark)))throw new HttpError(400,`Score must be between 0 and ${assignment.maxMark}.`);if(row.status!=='Scored'&&row.score!=null)throw new HttpError(400,'Only Scored marks may include a score.');if(row.status!=='Scored'&&!row.reason)throw new HttpError(400,'A reason is required for a non-scored mark.');const rosterRow=byStudent.get(row.studentId);await tx.insert(examScoresV2).values({id:randomUUID(),schoolId:req.user.schoolId,assignmentStudentId:rosterRow.id,score:row.status==='Scored'?String(row.score):null,markStatus:row.status,reason:row.reason||null,updatedBy:req.user.id}).onConflictDoUpdate({target:examScoresV2.assignmentStudentId,set:{score:row.status==='Scored'?String(row.score):null,markStatus:row.status,reason:row.reason||null,updatedBy:req.user.id,updatedAt:new Date()}})}return input.scores});res.json(saved)}))
 router.post('/assignments/:id/submit',allow('admin','teacher'),asyncRoute(async(req,res)=>{const result=await db.transaction(async tx=>{const {assignment,session}=await assignmentContext(req,req.params.id,tx);await writableYear(tx,req.user.schoolId,session.academicYearId,tx);if(['Submitted','Late'].includes(assignment.status))return assignment;if(assignment.hardLocked)throw new HttpError(409,'This mark sheet is hard locked.');const roster=await tx.select().from(examAssignmentStudentsV2).where(eq(examAssignmentStudentsV2.assignmentId,assignment.id)),scores=roster.length?await tx.select().from(examScoresV2).where(inArray(examScoresV2.assignmentStudentId,roster.map(row=>row.id))):[],map=new Map(scores.map(row=>[row.assignmentStudentId,row]));if(roster.some(row=>map.get(row.id)?.markStatus!=='Scored'))throw new HttpError(409,'Every expected student must have a scored mark before submission.');const now=new Date(),lateSeconds=Math.max(0,Math.floor((now-new Date(assignment.deadline))/1000));if(lateSeconds>0&&session.rulesSnapshot?.deadlinePolicy==='BlockLate'&&assignment.status!=='Reopened')throw new HttpError(409,'The teacher deadline has passed. Ask an admin to reopen submission.');const status=lateSeconds>0?'Late':'Submitted',[updated]=await tx.update(examAssignmentsV2).set({status,submittedAt:now,lateSeconds}).where(eq(examAssignmentsV2.id,assignment.id)).returning();await audit(tx,req.user,'exams.v2.assignment.submit',{assignmentId:assignment.id,status,lateSeconds});return updated});res.json(result)}))
 router.post('/assignments/:id/reopen',allow('admin'),asyncRoute(async(req,res)=>{const {reason}=z.object({reason:z.string().trim().min(3).max(500)}).strict().parse(req.body);const result=await db.transaction(async tx=>{const {assignment,session}=await assignmentContext(req,req.params.id,tx);await writableYear(tx,req.user.schoolId,session.academicYearId,tx);if(session.status==='Published')throw new HttpError(409,'Published sessions cannot be reopened.');const [updated]=await tx.update(examAssignmentsV2).set({status:'Reopened',submittedAt:null,lateSeconds:null,reopenedAt:new Date(),reopenedBy:req.user.id,reopenReason:reason,hardLocked:false}).where(eq(examAssignmentsV2.id,assignment.id)).returning();await audit(tx,req.user,'exams.v2.assignment.reopen',{assignmentId:assignment.id,reason});return updated});res.json(result)}))

 router.get('/sessions/:id/monitor',allow('admin','manager'),asyncRoute(async(req,res)=>{const [session]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,req.params.id),eq(examSessionsV2.schoolId,req.user.schoolId)));if(!session)throw new HttpError(404,'Exam session not found.');const assignments=await db.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.sessionId,session.id)),applicable=assignments.filter(row=>row.status!=='NotApplicable'),complete=applicable.filter(row=>['Submitted','Late'].includes(row.status)),byClass=[...new Set(assignments.map(row=>row.classId))].map(classId=>{const rows=assignments.filter(row=>row.classId===classId&&row.status!=='NotApplicable'),done=rows.filter(row=>['Submitted','Late'].includes(row.status));return {classId,total:rows.length,submitted:done.length,late:done.filter(row=>row.status==='Late').length,percent:rows.length?Math.round(done.length/rows.length*100):100}});const teacherRows=await db.select().from(users).where(eq(users.schoolId,req.user.schoolId)),teacherNames=new Map(teacherRows.map(row=>[row.id,row.name||row.fullName||row.email||''])),classRows=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),classNames=new Map(classRows.map(row=>[row.id,row.name])),rosterRows=assignments.length?await db.select().from(examAssignmentStudentsV2).where(inArray(examAssignmentStudentsV2.assignmentId,assignments.map(row=>row.id))):[],scoreRows=rosterRows.length?await db.select().from(examScoresV2).where(inArray(examScoresV2.assignmentStudentId,rosterRows.map(row=>row.id))):[],scored=new Set(scoreRows.filter(row=>row.markStatus==='Scored').map(row=>row.assignmentStudentId)),now=new Date(),enriched=assignments.map(row=>{const roster=rosterRows.filter(item=>item.assignmentId===row.id),done=['Submitted','Late'].includes(row.status);return {...row,className:classNames.get(row.classId)||'',teacherName:teacherNames.get(row.leadTeacherId)||'',studentCount:roster.length,missingMarks:roster.filter(item=>!scored.has(item.id)).length,overdue:!done&&row.status!=='NotApplicable'&&now>new Date(row.deadline)}});res.json({sessionId:session.id,total:applicable.length,submitted:complete.length,pending:applicable.length-complete.length,late:complete.filter(row=>row.status==='Late').length,percent:applicable.length?Math.round(complete.length/applicable.length*100):0,ready:applicable.length>0&&complete.length===applicable.length,classes:byClass,assignments:enriched,overdue:enriched.filter(row=>row.overdue).length})}))
 router.post('/sessions/:id/publish',allow('admin'),asyncRoute(async(req,res)=>res.json(await publishSession(db,req.user,req.params.id))))
 router.get('/sessions/:id/results',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{const [session]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,req.params.id),eq(examSessionsV2.schoolId,req.user.schoolId),eq(examSessionsV2.status,'Published')));if(!session)throw new HttpError(404,'Published session not found.');const rows=await db.select().from(examResultsV2).where(eq(examResultsV2.sessionId,session.id)),ids=rows.map(row=>row.id),subjects=ids.length?await db.select().from(examResultSubjectsV2).where(inArray(examResultSubjectsV2.resultId,ids)):[];res.json(rows.map(row=>({...row,subjects:subjects.filter(subject=>subject.resultId===row.id)})))}))
 router.post('/results/:id/decisions',allow('admin'),asyncRoute(async(req,res)=>{const input=z.object({decision:z.enum(['Repeat','Re-exam','SpecialReview']),reason:z.string().trim().min(3).max(1000),subjectId:id.nullable().optional()}).strict().parse(req.body),[result]=await db.select().from(examResultsV2).where(and(eq(examResultsV2.id,req.params.id),eq(examResultsV2.schoolId,req.user.schoolId)));if(!result)throw new HttpError(404,'Result not found.');if(result.outcome!=='Failed')throw new HttpError(409,'Only failed results can receive a repeat, re-exam or review decision.');if(input.subjectId){const [failedSubject]=await db.select().from(examResultSubjectsV2).where(and(eq(examResultSubjectsV2.resultId,result.id),eq(examResultSubjectsV2.schoolId,req.user.schoolId),eq(examResultSubjectsV2.subjectId,input.subjectId),eq(examResultSubjectsV2.outcome,'Failed')));if(!failedSubject)throw new HttpError(400,'Decision subject must be a failed subject from this result.')}const [session]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,result.sessionId),eq(examSessionsV2.schoolId,req.user.schoolId)));if(!session||session.status!=='Published')throw new HttpError(409,'The exam must be published first.');const [template]=await db.select().from(examTemplatesV2).where(and(eq(examTemplatesV2.id,session.templateId),eq(examTemplatesV2.schoolId,req.user.schoolId)));if(input.decision==='Re-exam'&&!(template?.reExamAllowed&&session.rulesSnapshot?.reExamAllowed!==false))throw new HttpError(409,'Re-exams are not allowed for this exam.');const existing=await db.select().from(examDecisionsV2).where(and(eq(examDecisionsV2.resultId,result.id),eq(examDecisionsV2.schoolId,req.user.schoolId)));if(existing.some(row=>row.status==='Open'&&['Repeat','SpecialReview'].includes(row.decision))||(input.decision!=='Re-exam'&&existing.some(row=>row.status==='Open')))throw new HttpError(409,'This student already has an open decision.');const created=await db.transaction(async tx=>{const [row]=await tx.insert(examDecisionsV2).values({id:randomUUID(),schoolId:req.user.schoolId,resultId:result.id,studentId:result.studentId,subjectId:input.subjectId||null,decision:input.decision,status:input.decision==='Repeat'?'Resolved':'Open',reason:input.reason,decidedBy:req.user.id}).returning();if(input.decision==='Repeat')await tx.insert(studentPromotionsV2).values({id:randomUUID(),schoolId:req.user.schoolId,studentId:result.studentId,sourceResultId:result.id,fromAcademicYearId:session.academicYearId,toAcademicYearId:session.academicYearId,fromClassId:result.classId,toClassId:result.classId,kind:'Repeat',status:'Pending',idempotencyKey:`repeat:${result.id}`}).onConflictDoNothing();await audit(tx,req.user,'exams.v2.decision',{resultId:result.id,decision:input.decision});return row});res.status(201).json(created)}))
 router.get('/sessions/:id/decisions',allow('admin','manager'),asyncRoute(async(req,res)=>{const [session]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,req.params.id),eq(examSessionsV2.schoolId,req.user.schoolId)));if(!session)throw new HttpError(404,'Exam session not found.');const results=await db.select().from(examResultsV2).where(eq(examResultsV2.sessionId,session.id)),ids=results.map(row=>row.id),decisions=ids.length?await db.select().from(examDecisionsV2).where(inArray(examDecisionsV2.resultId,ids)):[],subjects=ids.length?await db.select().from(examResultSubjectsV2).where(inArray(examResultSubjectsV2.resultId,ids)):[],studentRows=ids.length?await db.select().from(students).where(inArray(students.id,results.map(row=>row.studentId))):[],names=new Map(studentRows.map(row=>[row.id,row.fullName])),subjectRows=await db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)),subjectNames=new Map(subjectRows.map(row=>[row.id,row.name]));res.json(results.filter(row=>row.outcome==='Failed').map(row=>({...row,studentName:names.get(row.studentId)||'',failedSubjects:subjects.filter(subject=>subject.resultId===row.id&&subject.outcome==='Failed').map(subject=>({subjectId:subject.subjectId,name:subjectNames.get(subject.subjectId)||'',earned:subject.earned,possible:subject.possible})),decisions:decisions.filter(item=>item.resultId===row.id)})))}))
 router.post('/year-transitions',allow('admin'),asyncRoute(async(req,res)=>{const input=z.object({fromAcademicYearId:id,toAcademicYearId:id,idempotencyKey:id}).strict().parse(req.body);res.json(await applyYearTransition(db,req.user,input))}))
 router.get('/promotions',allow('admin','manager'),asyncRoute(async(req,res)=>res.json(await db.select().from(studentPromotionsV2).where(eq(studentPromotionsV2.schoolId,req.user.schoolId)))))

 // Additive course foundation.
 router.post('/courses',allow('admin'),asyncRoute(async(req,res)=>{
  const input=z.object({
   academicYearId:id,name:z.string().trim().min(2).max(120),description:z.string().trim().max(2000).default(''),
   startDate:date,endDate:date,capacity:z.coerce.number().int().positive().max(10000),fee:z.coerce.number().min(0),
   paymentType:z.enum(['None','Full','Installment','Monthly']),targetClassId:id,classIds:z.array(id).min(1),
   subjects:z.array(z.object({subjectId:id,teacherId:id.nullable().optional(),order:z.coerce.number().int().positive(),rules:z.record(z.string(),z.unknown()).default({})})).default([]),
   rules:z.record(z.string(),z.unknown()).default({})
  }).strict().parse(req.body);
  if(input.endDate<input.startDate)throw new HttpError(400,'Course end date must follow start date.');
  await writableYear(db,req.user.schoolId,input.academicYearId);
  const schoolClasses=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),allowed=new Set(schoolClasses.map(row=>row.id));
  if(!allowed.has(input.targetClassId)||input.classIds.some(item=>!allowed.has(item)))throw new HttpError(400,'Course classes must belong to this school.');
  if(new Set(input.subjects.map(row=>row.subjectId)).size!==input.subjects.length||new Set(input.subjects.map(row=>row.order)).size!==input.subjects.length)throw new HttpError(400,'Course subjects and order values must be unique.');
  const [schoolSubjects,schoolTeachers]=await Promise.all([db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)),db.select().from(users).where(and(eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher'),eq(users.status,'Active')))]),subjectIds=new Set(schoolSubjects.map(row=>row.id)),teacherIds=new Set(schoolTeachers.map(row=>row.id));
  if(input.subjects.some(row=>!subjectIds.has(row.subjectId)||(row.teacherId&&!teacherIds.has(row.teacherId))))throw new HttpError(400,'Course subjects and teachers must belong to this school.');
  const created=await db.transaction(async tx=>{
   const courseId=randomUUID(),[course]=await tx.insert(coursesV2).values({id:courseId,schoolId:req.user.schoolId,academicYearId:input.academicYearId,name:input.name,description:input.description,startDate:input.startDate,endDate:input.endDate,capacity:input.capacity,fee:String(input.fee),paymentType:input.paymentType,targetClassId:input.targetClassId,status:'Draft',rules:{...input.rules,policyStatus:'Confirmed'},createdBy:req.user.id}).returning();
   await tx.insert(courseClassesV2).values([...new Set(input.classIds)].map(classId=>({id:randomUUID(),schoolId:req.user.schoolId,courseId,classId})));
   if(input.subjects.length)await tx.insert(courseSubjectsV2).values(input.subjects.map(row=>({id:randomUUID(),schoolId:req.user.schoolId,courseId,subjectId:row.subjectId,teacherId:row.teacherId||null,order:row.order,rules:row.rules})));
   await audit(tx,req.user,'courses.v2.create',{courseId,status:'Draft',policyStatus:'Confirmed'});
   return course
  });
  res.status(201).json(created)
 }))

 router.get('/courses',allow('admin','manager','teacher','student'),asyncRoute(async(req,res)=>{
  const rows=await db.select().from(coursesV2).where(eq(coursesV2.schoolId,req.user.schoolId));
  const ids=rows.map(row=>row.id);
  const [cClasses,cSubjects,cEnrollments,cSessions,allYears,allSchoolClasses,allTeachers,allSubjects]=await Promise.all([
   ids.length?db.select().from(courseClassesV2).where(inArray(courseClassesV2.courseId,ids)):[],
   ids.length?db.select().from(courseSubjectsV2).where(inArray(courseSubjectsV2.courseId,ids)):[],
   ids.length?db.select().from(courseEnrollmentsV2).where(and(inArray(courseEnrollmentsV2.courseId,ids),eq(courseEnrollmentsV2.status,'Enrolled'))):[],
   ids.length?db.select().from(examSessionsV2).where(and(eq(examSessionsV2.schoolId,req.user.schoolId),inArray(examSessionsV2.courseId,ids))):[],
   db.select().from(academicYears).where(eq(academicYears.schoolId,req.user.schoolId)),
   db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),
   db.select().from(users).where(and(eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher'))),
   db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)),
  ]);
  const yearMap=new Map(allYears.map(r=>[r.id,r.name])),classMap=new Map(allSchoolClasses.map(r=>[r.id,r.name])),teacherMap=new Map(allTeachers.map(r=>[r.id,r.fullName||r.name||r.email])),subjectMap=new Map(allSubjects.map(r=>[r.id,r.name]));
  res.json(rows.map(row=>{
   const linkedClasses=cClasses.filter(c=>c.courseId===row.id).map(c=>({id:c.classId,name:classMap.get(c.classId)||''}));
   const linkedSubjects=cSubjects.filter(s=>s.courseId===row.id).map(s=>({subjectId:s.subjectId,name:subjectMap.get(s.subjectId)||'',teacherId:s.teacherId,teacherName:s.teacherId?teacherMap.get(s.teacherId)||'':''}));
   const enrollCount=cEnrollments.filter(e=>e.courseId===row.id).length;
   const session=cSessions.find(s=>s.courseId===row.id)||null;
   return {
    ...row,
    academicYearName:yearMap.get(row.academicYearId)||'',
    targetClassName:classMap.get(row.targetClassId)||'',
    classes:linkedClasses,
    subjects:linkedSubjects,
    enrolledCount:enrollCount,
    examSession:session?{id:session.id,title:session.title,status:session.status,publishedAt:session.publishedAt}:null,
   }
  }))
 }))

 router.get('/courses/:id',allow('admin','manager'),asyncRoute(async(req,res)=>{
  const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,req.params.id),eq(coursesV2.schoolId,req.user.schoolId)));
  if(!course)throw new HttpError(404,'Course not found.');
  const [cClasses,cSubjects,enrollments,payments,schoolClasses,subjectRows,teacherRows,studentRows,sessionRows]=await Promise.all([
   db.select().from(courseClassesV2).where(eq(courseClassesV2.courseId,course.id)),
   db.select().from(courseSubjectsV2).where(eq(courseSubjectsV2.courseId,course.id)),
   db.select().from(courseEnrollmentsV2).where(eq(courseEnrollmentsV2.courseId,course.id)),
   db.select().from(coursePaymentsV2).where(eq(coursePaymentsV2.schoolId,req.user.schoolId)),
   db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),
   db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,req.user.schoolId)),
   db.select().from(users).where(and(eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher'))),
   db.select().from(students).where(eq(students.schoolId,req.user.schoolId)),
   db.select().from(examSessionsV2).where(and(eq(examSessionsV2.schoolId,req.user.schoolId),eq(examSessionsV2.courseId,course.id))),
  ]);
  const classMap=new Map(schoolClasses.map(r=>[r.id,r.name])),subjectMap=new Map(subjectRows.map(r=>[r.id,r.name])),teacherMap=new Map(teacherRows.map(r=>[r.id,r.fullName||r.name||r.email])),studentMap=new Map(studentRows.map(r=>[r.id,r.fullName])),paymentMap=new Map(payments.map(r=>[r.enrollmentId,r]));
  res.json({
   ...course,
   targetClassName:classMap.get(course.targetClassId)||'',
   classes:cClasses.map(c=>({id:c.classId,name:classMap.get(c.classId)||''})),
   subjects:cSubjects.map(s=>({subjectId:s.subjectId,name:subjectMap.get(s.subjectId)||'',teacherId:s.teacherId,teacherName:s.teacherId?teacherMap.get(s.teacherId)||'':''})),
   enrollments:enrollments.map(e=>({
    id:e.id,
    studentId:e.studentId,
    studentName:studentMap.get(e.studentId)||'',
    sourceClassId:e.sourceClassId,
    sourceClassName:classMap.get(e.sourceClassId)||'',
    targetClassId:e.targetClassId,
    targetClassName:classMap.get(e.targetClassId)||'',
    seatNumber:e.seatNumber,
    status:e.status,
    payment:paymentMap.get(e.id)||null,
    createdAt:e.createdAt,
   })),
   examSession:sessionRows[0]||null,
  })
 }))

 router.patch('/courses/:id/status',allow('admin'),asyncRoute(async(req,res)=>{
  const {status}=z.object({status:z.enum(['Draft','Open','Running','Completed','Closed'])}).strict().parse(req.body);
  const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,req.params.id),eq(coursesV2.schoolId,req.user.schoolId)));
  if(!course)throw new HttpError(404,'Course not found.');
  const [updated]=await db.update(coursesV2).set({status}).where(eq(coursesV2.id,course.id)).returning();
  await audit(db,req.user,'courses.v2.status',{courseId:course.id,from:course.status,to:status});
  res.json(updated)
 }))

 router.get('/courses/:id/candidates',allow('admin'),asyncRoute(async(req,res)=>{
  const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,req.params.id),eq(coursesV2.schoolId,req.user.schoolId)));
  if(!course)throw new HttpError(404,'Course not found.');
  const cClasses=await db.select().from(courseClassesV2).where(eq(courseClassesV2.courseId,course.id));
  const eligibleClassIds=new Set(cClasses.map(c=>c.classId));
  const [allStudents,existingEnrollments,publishedResults,schoolClasses]=await Promise.all([
   db.select().from(students).where(eq(students.schoolId,req.user.schoolId)),
   db.select().from(courseEnrollmentsV2).where(eq(courseEnrollmentsV2.courseId,course.id)),
   db.select().from(examResultsV2).where(eq(examResultsV2.schoolId,req.user.schoolId)),
   db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),
  ]);
  const enrolledSet=new Set(existingEnrollments.map(e=>e.studentId));
  const classMap=new Map(schoolClasses.map(r=>[r.id,r.name]));
  const latestResultByStudent=new Map();
  for(const r of publishedResults){
   if(!latestResultByStudent.has(r.studentId)||new Date(r.createdAt)>new Date(latestResultByStudent.get(r.studentId).createdAt))latestResultByStudent.set(r.studentId,r)
  }
  const rules=course.rules||{};
  const minAvg=rules.eligibilityAverage!=null?Number(rules.eligibilityAverage):null;
  const maxRank=rules.eligibilityRank!=null?Number(rules.eligibilityRank):null;
  const candidates=allStudents.filter(s=>eligibleClassIds.has(s.classId)).map(s=>{
   const result=latestResultByStudent.get(s.id);
   const avg=result?Number(result.displayAverage||result.average):null;
   const rank=result?Number(result.rank):null;
   const matched=[];
   let qualifies=true;
   if(minAvg!=null){if(avg!=null&&avg>=minAvg)matched.push(`Average >= ${minAvg}%`);else qualifies=false}
   if(maxRank!=null){if(rank!=null&&rank<=maxRank)matched.push(`Rank <= #${maxRank}`);else qualifies=false}
   return {
    studentId:s.id,
    studentName:s.fullName,
    classId:s.classId,
    className:classMap.get(s.classId)||'',
    average:avg,
    rank,
    qualifying:qualifies&&(minAvg!=null||maxRank!=null),
    alreadyEnrolled:enrolledSet.has(s.id),
    criteriaMatched:matched,
   }
  });
  res.json(candidates)
 }))

 router.post('/courses/:id/enroll',allow('admin'),asyncRoute(async(req,res)=>{
  const input=z.object({studentId:id,reason:z.string().trim().max(500).optional()}).strict().parse(req.body);
  const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,req.params.id),eq(coursesV2.schoolId,req.user.schoolId)));
  if(!course)throw new HttpError(404,'Course not found.');
  if(!['Open','Running'].includes(course.status))throw new HttpError(409,'Course must be Open or Running to enroll students.');
  const [existingEnrollment]=await db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.courseId,course.id),eq(courseEnrollmentsV2.studentId,input.studentId)));
  if(existingEnrollment)throw new HttpError(409,'Student is already enrolled in this course.');
  const currentEnrollments=await db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.courseId,course.id),eq(courseEnrollmentsV2.status,'Enrolled')));
  if(currentEnrollments.length>=course.capacity)throw new HttpError(409,'Course capacity exceeded.');
  const [student]=await db.select().from(students).where(and(eq(students.id,input.studentId),eq(students.schoolId,req.user.schoolId)));
  if(!student)throw new HttpError(404,'Student not found.');
  const progressions=await db.select().from(classProgressionsV2).where(and(eq(classProgressionsV2.schoolId,req.user.schoolId),eq(classProgressionsV2.academicYearId,course.academicYearId),eq(classProgressionsV2.classId,student.classId),eq(classProgressionsV2.status,'Active')));
  const normalPromotionClassId=progressions[0]?.nextClassId||null;
  const enrollmentId=randomUUID();
  const enrollment=await db.transaction(async tx=>{
   const [enrolled]=await tx.insert(courseEnrollmentsV2).values({
    id:enrollmentId,
    schoolId:req.user.schoolId,
    courseId:course.id,
    studentId:student.id,
    sourceClassId:student.classId,
    normalPromotionClassId,
    targetClassId:course.targetClassId,
    status:'Enrolled',
    seatNumber:currentEnrollments.length+1,
   }).returning();
   if(Number(course.fee)>0){
    await tx.insert(coursePaymentsV2).values({
     id:randomUUID(),
     schoolId:req.user.schoolId,
     enrollmentId,
     requiredAmount:String(course.fee),
     postedAmount:'0',
     status:'Pending',
     source:'Course Enrollment',
    })
   }
   await audit(tx,req.user,'courses.v2.enroll',{courseId:course.id,studentId:student.id,seatNumber:enrolled.seatNumber,reason:input.reason||null});
   return enrolled
  });
  try{
   let recipientEmail=student.email;
   if(!recipientEmail&&student.parentId){
    const [parent]=await db.select().from(users).where(eq(users.id,student.parentId));
    if(parent?.email)recipientEmail=parent.email
   }
   if(recipientEmail){
    await emailService.sendCourseNotice({
     email:recipientEmail,
     studentName:student.fullName,
     courseName:course.name,
     startDate:course.startDate,
     endDate:course.endDate,
     fee:course.fee,
     paymentType:course.paymentType,
    })
   }
  }catch(err){/* ignore email delivery failures in dev/test */}
  res.status(201).json(enrollment)
 }))

 router.put('/courses/:id/payments/:enrollmentId',allow('admin'),asyncRoute(async(req,res)=>{
  const input=z.object({status:z.enum(['Pending','Partial','Paid']),postedAmount:z.coerce.number().min(0)}).strict().parse(req.body);
  const [enrollment]=await db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.id,req.params.enrollmentId),eq(courseEnrollmentsV2.schoolId,req.user.schoolId)));
  if(!enrollment)throw new HttpError(404,'Course enrollment not found.');
  const [payment]=await db.select().from(coursePaymentsV2).where(eq(coursePaymentsV2.enrollmentId,enrollment.id));
  if(!payment)throw new HttpError(404,'Course payment record not found.');
  const [updated]=await db.transaction(async tx=>{
   const [item]=await tx.update(coursePaymentsV2).set({status:input.status,postedAmount:String(input.postedAmount),updatedAt:new Date()}).where(eq(coursePaymentsV2.id,payment.id)).returning();
   await audit(tx,req.user,'courses.v2.payment.update',{enrollmentId:enrollment.id,paymentId:payment.id,status:input.status,postedAmount:input.postedAmount});
   return [item]
  });
  res.json(updated)
 }))

 router.post('/courses/:id/exam',allow('admin'),asyncRoute(async(req,res)=>{
  const input=z.object({templateId:id,startDate:date,endDate:date,teacherDeadline:instant,term:z.string().trim().min(1).max(80).default('Course Exam')}).strict().parse(req.body);
  const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,req.params.id),eq(coursesV2.schoolId,req.user.schoolId)));
  if(!course)throw new HttpError(404,'Course not found.');
  if(!['Open','Running'].includes(course.status))throw new HttpError(409,'Course must be Open or Running to create an exam.');
  const enrollments=await db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.courseId,course.id),eq(courseEnrollmentsV2.status,'Enrolled')));
  if(!enrollments.length)throw new HttpError(409,'Course has no enrolled students.');
  const sessionPayload={
   idempotencyKey:randomUUID(),
   title:`${course.name} Exam`,
   academicYearId:course.academicYearId,
   templateId:input.templateId,
   courseId:course.id,
   term:input.term,
   startDate:input.startDate,
   endDate:input.endDate,
   teacherDeadline:input.teacherDeadline,
   publishMode:'Manual',
   allClasses:false,
   classIds:[],
  };
  const session=await createSession(db,req.user,sessionPayload);
  await audit(db,req.user,'courses.v2.exam.create',{courseId:course.id,sessionId:session.id});
  res.status(201).json(session)
 }))

 router.get('/student/hub',allow('student','admin','manager'),asyncRoute(async(req,res)=>{
  let studentId=req.user.role==='student'?req.user.id:req.query.studentId;
  let [student]=await db.select().from(students).where(and(eq(students.id,studentId),eq(students.schoolId,req.user.schoolId)));
  if(!student&&req.user.role==='student'){
   const [byParent]=await db.select().from(students).where(and(eq(students.parentId,req.user.id),eq(students.schoolId,req.user.schoolId)));
   student=byParent
  }
  if(!student)throw new HttpError(404,'Student record not found.');
  const [currentClassRow,allClasses,results,resultSubjects,decisions,courses,enrollments,payments,promotions,upcomingSessions,allAcademicYears]=await Promise.all([
   student.classId?db.select().from(classes).where(eq(classes.id,student.classId)):[],
   db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),
   db.select().from(examResultsV2).where(and(eq(examResultsV2.studentId,student.id),eq(examResultsV2.schoolId,req.user.schoolId))),
   db.select().from(examResultSubjectsV2).where(eq(examResultSubjectsV2.schoolId,req.user.schoolId)),
   db.select().from(examDecisionsV2).where(and(eq(examDecisionsV2.studentId,student.id),eq(examDecisionsV2.schoolId,req.user.schoolId))),
   db.select().from(coursesV2).where(eq(coursesV2.schoolId,req.user.schoolId)),
   db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.studentId,student.id),eq(courseEnrollmentsV2.schoolId,req.user.schoolId))),
   db.select().from(coursePaymentsV2).where(eq(coursePaymentsV2.schoolId,req.user.schoolId)),
   db.select().from(studentPromotionsV2).where(and(eq(studentPromotionsV2.studentId,student.id),eq(studentPromotionsV2.schoolId,req.user.schoolId))),
   db.select().from(examSessionsV2).where(and(eq(examSessionsV2.schoolId,req.user.schoolId),inArray(examSessionsV2.status,['Collecting','Draft']))),
   db.select().from(academicYears).where(eq(academicYears.schoolId,req.user.schoolId)),
  ]);
  const classMap=new Map(allClasses.map(r=>[r.id,r.name])),paymentMap=new Map(payments.map(r=>[r.enrollmentId,r]));
  const yearMap=new Map(allAcademicYears.map(r=>[r.id,r.name]));
  let nextClassName='Graduating';
  if(student.classId){
   const progs=await db.select().from(classProgressionsV2).where(and(eq(classProgressionsV2.classId,student.classId),eq(classProgressionsV2.schoolId,req.user.schoolId),eq(classProgressionsV2.status,'Active')));
   if(progs[0]?.nextClassId)nextClassName=classMap.get(progs[0].nextClassId)||'Next Class';
   else if(progs[0]?.isFinal)nextClassName='Graduating Class'
  }
  const sessionMap=new Map((await db.select().from(examSessionsV2).where(eq(examSessionsV2.schoolId,req.user.schoolId))).map(r=>[r.id,r]));
  const enrichedResults=results.map(r=>{
   const sess=sessionMap.get(r.sessionId);
   return {
    ...r,
    examTitle:sess?.title||'Exam',
    term:sess?.term||'',
    subjects:resultSubjects.filter(s=>s.resultId===r.id),
   }
  });
  const myCourses=enrollments.map(e=>{
   const c=courses.find(row=>row.id===e.courseId);
   return {
    ...e,
    courseName:c?.name||'',
    description:c?.description||'',
    startDate:c?.startDate||'',
    endDate:c?.endDate||'',
    fee:c?.fee||'0',
    paymentType:c?.paymentType||'None',
    targetClassName:classMap.get(e.targetClassId)||'',
    payment:paymentMap.get(e.id)||null,
   }
  });
  res.json({
   student:{id:student.id,fullName:student.fullName,classId:student.classId,className:currentClassRow[0]?.name||'',nextClassName},
   upcomingExams:upcomingSessions.map(s=>({id:s.id,title:s.title,term:s.term,startDate:s.startDate,endDate:s.endDate,teacherDeadline:s.teacherDeadline})),
   publishedResults:enrichedResults,
   reExamNotices:decisions.filter(d=>d.status==='Open'||d.decision==='Re-exam'),
   courses:myCourses,
   promotionsHistory:promotions.map(p=>({
    id:p.id,
    kind:p.kind,
    status:p.status,
    fromClassName:classMap.get(p.fromClassId)||'',
    toClassName:p.toClassId?classMap.get(p.toClassId)||'':null,
    fromYearName:yearMap.get(p.fromAcademicYearId)||'',
    toYearName:yearMap.get(p.toAcademicYearId)||'',
    appliedAt:p.appliedAt,
   })),
  })
 }))

 return router
}
