import {createHash,randomUUID} from 'node:crypto'
import {and,eq,inArray} from 'drizzle-orm'
import {
 academicYears,classes,students,studentEnrollments,users,systemLogs,
 examSettingsV2,classProgressionsV2,academicSubjectsV2,classSubjectOfferingsV2,offeringTeachersV2,
 examTemplatesV2,examTemplateSubjectsV2,examSessionsV2,examSessionClassesV2,examAssignmentsV2,
 examAssignmentTeachersV2,examAssignmentStudentsV2,examScoresV2,examResultsV2,examResultSubjectsV2,studentPromotionsV2,examDecisionsV2,coursesV2,courseClassesV2,courseSubjectsV2,courseEnrollmentsV2,
} from '../db/schema/index.js'
import {HttpError} from '../middleware/error.middleware.js'

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
export const requestHash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const instant=value=>new Date(value).getTime()
const activeAt=(row,at)=>row.status==='Active'&&instant(row.effectiveFrom)<=at&&(!row.effectiveTo||instant(row.effectiveTo)>at)
const num=value=>Number(value)
const subjectPass=(assignment,passAverage)=>num(assignment.minimumMark)>0?num(assignment.minimumMark):num(assignment.maxMark)*passAverage/100
const round2=value=>Math.round((value+Number.EPSILON)*100)/100
const requiredPolicies=['passBasis','maxMarkModel','deadlinePolicy','reexamScope','reexamScorePolicy','promotionTiming','rounding']

export async function confirmedSettings(db,schoolId,tx=db){
 const rows=await tx.select().from(examSettingsV2).where(eq(examSettingsV2.schoolId,schoolId))
 const settings=rows.sort((a,b)=>b.version-a.version)[0]
 if(!settings||settings.status!=='Complete'||!settings.featureEnabled||settings.policyStatus!=='Confirmed')throw new HttpError(409,'Exam v2 requires completed setup and confirmed policy decisions.')
 const missing=requiredPolicies.filter(key=>!settings.rules?.[key])
 if(missing.length)throw new HttpError(409,`Confirmed exam policy is incomplete: ${missing.join(', ')}.`)
 return settings
}

export async function writableYear(db,schoolId,id,tx=db){
 const [year]=await tx.select().from(academicYears).where(and(eq(academicYears.id,id),eq(academicYears.schoolId,schoolId)))
 if(!year)throw new HttpError(404,'Academic year not found.')
 if(year.status==='Closed')throw new HttpError(409,'Closed academic years are read only.')
 return year
}

async function reExamScope(db,schoolId,parentSessionId){
 const [parent]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,parentSessionId),eq(examSessionsV2.schoolId,schoolId)))
 if(!parent||parent.status!=='Published')throw new HttpError(409,'The parent exam must be published before a re-exam.')
 const results=await db.select().from(examResultsV2).where(and(eq(examResultsV2.sessionId,parent.id),eq(examResultsV2.outcome,'Failed')))
 const resultMap=new Map(results.map(row=>[row.id,row])),decisions=results.length?(await db.select().from(examDecisionsV2).where(inArray(examDecisionsV2.resultId,results.map(row=>row.id)))).filter(row=>row.decision==='Re-exam'&&row.status==='Open'):[]
 if(!decisions.length)throw new HttpError(409,'No students are assigned to this re-exam.')
 const failedRows=(await db.select().from(examResultSubjectsV2).where(inArray(examResultSubjectsV2.resultId,[...new Set(decisions.map(row=>row.resultId))]))).filter(row=>row.outcome==='Failed')
 const byClassSubject=new Map(),classIds=new Set()
 for(const decision of decisions){const result=resultMap.get(decision.resultId),subjectIds=decision.subjectId?[decision.subjectId]:failedRows.filter(row=>row.resultId===decision.resultId).map(row=>row.subjectId);classIds.add(result.classId);for(const subjectId of subjectIds){const key=`${result.classId}|${subjectId}`;byClassSubject.set(key,[...new Set([...(byClassSubject.get(key)||[]),result.studentId])])}}
 return {parent,classIds,byClassSubject,decisions}
}

async function courseScope(db,schoolId,courseId,academicYearId){
 const [course]=await db.select().from(coursesV2).where(and(eq(coursesV2.id,courseId),eq(coursesV2.schoolId,schoolId)))
 if(!course)throw new HttpError(404,'Course not found.')
 if(course.academicYearId!==academicYearId)throw new HttpError(400,'A course exam must use the academic year of its course.')
 if(!['Open','Running'].includes(course.status))throw new HttpError(409,'The course must be Open or Running before its exam is created.')
 const [subjects,enrollments]=await Promise.all([db.select().from(courseSubjectsV2).where(eq(courseSubjectsV2.courseId,course.id)),db.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.courseId,course.id),eq(courseEnrollmentsV2.status,'Enrolled')))])
 if(!enrollments.length)throw new HttpError(409,'The course has no enrolled students.')
 return {course,subjects,enrollments}
}

export async function assignmentPreview(db,schoolId,input){
 await confirmedSettings(db,schoolId)
 await writableYear(db,schoolId,input.academicYearId)
 const [template]=await db.select().from(examTemplatesV2).where(and(eq(examTemplatesV2.id,input.templateId),eq(examTemplatesV2.schoolId,schoolId),eq(examTemplatesV2.status,'Active')))
 if(!template)throw new HttpError(404,'Active exam template not found.')
 const [templateSubjects,schoolClasses,progressions,offerings,teacherLinks,schoolTeachers,subjectRows,enrollments]=await Promise.all([
  db.select().from(examTemplateSubjectsV2).where(and(eq(examTemplateSubjectsV2.templateId,template.id),eq(examTemplateSubjectsV2.schoolId,schoolId))),
  db.select().from(classes).where(eq(classes.schoolId,schoolId)),
  db.select().from(classProgressionsV2).where(and(eq(classProgressionsV2.schoolId,schoolId),eq(classProgressionsV2.academicYearId,input.academicYearId),eq(classProgressionsV2.status,'Active'))),
  db.select().from(classSubjectOfferingsV2).where(and(eq(classSubjectOfferingsV2.schoolId,schoolId),eq(classSubjectOfferingsV2.academicYearId,input.academicYearId))),
  db.select().from(offeringTeachersV2).where(eq(offeringTeachersV2.schoolId,schoolId)),
  db.select().from(users).where(and(eq(users.schoolId,schoolId),eq(users.role,'teacher'),eq(users.status,'Active'))),
  db.select().from(academicSubjectsV2).where(eq(academicSubjectsV2.schoolId,schoolId)),
  db.select().from(studentEnrollments).where(and(eq(studentEnrollments.schoolId,schoolId),eq(studentEnrollments.academicYearId,input.academicYearId),eq(studentEnrollments.status,'Active'))),
 ])
 const classMap=new Map(schoolClasses.map(row=>[row.id,row])),progressionMap=new Map(progressions.map(row=>[row.classId,row])),subjectMap=new Map(subjectRows.map(row=>[row.id,row])),teacherMap=new Map(schoolTeachers.map(row=>[row.id,row]))
 const courseMode=input.courseId?await courseScope(db,schoolId,input.courseId,input.academicYearId):null
 const reexam=input.parentSessionId?await reExamScope(db,schoolId,input.parentSessionId):null
 if(reexam&&reexam.parent.academicYearId!==input.academicYearId)throw new HttpError(400,'A re-exam must use the academic year of its parent exam.')
 const classIds=courseMode?[...new Set(courseMode.enrollments.map(row=>row.sourceClassId))]:reexam?[...reexam.classIds]:input.allClasses?progressions.sort((a,b)=>a.order-b.order||a.classId.localeCompare(b.classId)).map(row=>row.classId):[...new Set(input.classIds)]
 if(!classIds.length)throw new HttpError(400,'Select at least one class.')
 for(const id of classIds)if(!classMap.has(id)||(!courseMode&&!progressionMap.has(id)))throw new HttpError(400,'Every selected class must belong to the academic-year progression.')
 const orderedClasses=classIds.sort((a,b)=>((progressionMap.get(a)?.order||0)-(progressionMap.get(b)?.order||0))||a.localeCompare(b))
 const orderedSubjects=(courseMode&&courseMode.subjects.length?templateSubjects.filter(row=>courseMode.subjects.some(item=>item.subjectId===row.subjectId)):templateSubjects).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id))
 if(!orderedSubjects.length)throw new HttpError(409,'The template has no subjects.')
 const at=instant(`${input.startDate}T00:00:00.000Z`),issues=[],candidates=[]
 for(const classId of orderedClasses)for(const templateSubject of orderedSubjects){
  const subject=subjectMap.get(templateSubject.subjectId)
  if(reexam&&!reexam.byClassSubject.get(`${classId}|${templateSubject.subjectId}`)?.length)continue
  if(!subject||subject.status!=='Active'){issues.push({code:'SUBJECT_INACTIVE',classId,subjectId:templateSubject.subjectId,message:'The template subject is not active.'});continue}
  if(courseMode){const courseSubject=courseMode.subjects.find(row=>row.subjectId===subject.id),teacher=courseSubject?.teacherId&&teacherMap.get(courseSubject.teacherId);if(courseMode.subjects.length&&!teacher){issues.push({code:'TEACHER_MISSING',classId,subjectId:subject.id,message:'Assign an active teacher to this course subject.'});continue}const roster=courseMode.enrollments.filter(row=>row.sourceClassId===classId).map(row=>({studentId:row.studentId,enrollmentId:null}));if(!roster.length)continue;candidates.push({classId,className:classMap.get(classId).name,classOrder:0,templateSubjectId:templateSubject.id,subjectId:subject.id,subjectName:subject.name,subjectOrder:templateSubject.order,offeringId:null,leadTeacherId:teacher?.id||courseMode.course.createdBy,teacherIds:teacher?[{id:teacher.id,role:'Lead',sourceTeacherLinkId:null}]:[],maxMark:num(templateSubject.maxMark),minimumMark:num(templateSubject.minimumMark),required:templateSubject.required,roster});continue}
  const matches=offerings.filter(row=>row.classId===classId&&row.subjectId===subject.id&&activeAt(row,at))
  if(matches.length!==1){issues.push({code:matches.length?'OFFERING_AMBIGUOUS':'OFFERING_MISSING',classId,subjectId:subject.id,message:matches.length?'More than one active class-subject offering matches.':'No active class-subject offering matches.'});continue}
  const offering=matches[0],links=teacherLinks.filter(row=>row.offeringId===offering.id&&activeAt(row,at)&&teacherMap.has(row.teacherId)),leads=links.filter(row=>row.role==='Lead')
  if(leads.length!==1){issues.push({code:leads.length?'LEAD_TEACHER_AMBIGUOUS':links.length?'LEAD_TEACHER_MISSING':'TEACHER_MISSING',classId,subjectId:subject.id,offeringId:offering.id,candidateTeacherIds:links.map(row=>row.teacherId).sort(),message:leads.length?'More than one lead teacher is effective.':'Choose one effective lead teacher.'});continue}
  const roster=enrollments.filter(row=>row.classId===classId&&(!reexam||reexam.byClassSubject.get(`${classId}|${subject.id}`)?.includes(row.studentId))),lead=leads[0]
  candidates.push({classId,className:classMap.get(classId).name,classOrder:progressionMap.get(classId)?.order||0,templateSubjectId:templateSubject.id,subjectId:subject.id,subjectName:subject.name,subjectOrder:templateSubject.order,offeringId:offering.id,leadTeacherId:lead.teacherId,teacherIds:links.sort((a,b)=>a.role.localeCompare(b.role)||a.teacherId.localeCompare(b.teacherId)).map(row=>({id:row.teacherId,role:row.role,sourceTeacherLinkId:row.id})),maxMark:num(templateSubject.maxMark),minimumMark:num(templateSubject.minimumMark),required:templateSubject.required,roster:roster.map(row=>({studentId:row.studentId,enrollmentId:row.id})).sort((a,b)=>a.studentId.localeCompare(b.studentId))})
 }
 issues.sort((a,b)=>(progressionMap.get(a.classId)?.order||999)-(progressionMap.get(b.classId)?.order||999)||a.classId.localeCompare(b.classId)||String(a.subjectId).localeCompare(String(b.subjectId))||a.code.localeCompare(b.code))
 return {template,course:courseMode?.course||null,orderedClasses,candidates,issues,summary:{selectedClasses:orderedClasses.length,templateSubjects:orderedSubjects.length,candidates:candidates.length,issues:issues.length}}
}

export async function createSession(db,user,input){
 const hash=requestHash(input)
 const [existing]=await db.select().from(examSessionsV2).where(and(eq(examSessionsV2.schoolId,user.schoolId),eq(examSessionsV2.idempotencyKey,input.idempotencyKey)))
 if(existing){if(existing.requestHash!==hash)throw new HttpError(409,'Idempotency key was already used with different input.');return existing}
 const preview=await assignmentPreview(db,user.schoolId,input)
 if(preview.issues.length)return {preview,invalid:true}
 return db.transaction(async tx=>{
  const settings=await confirmedSettings(tx,user.schoolId,tx);await writableYear(tx,user.schoolId,input.academicYearId,tx)
  const [again]=await tx.select().from(examSessionsV2).where(and(eq(examSessionsV2.schoolId,user.schoolId),eq(examSessionsV2.idempotencyKey,input.idempotencyKey)))
  if(again){if(again.requestHash!==hash)throw new HttpError(409,'Idempotency key was already used with different input.');return again}
  const sessionId=randomUUID(),sessionClassIds=new Map(),sourceSnapshot={settingsId:settings.id,settingsVersion:settings.version,templateId:preview.template.id,templateVersion:preview.template.version}
  const [session]=await tx.insert(examSessionsV2).values({id:sessionId,schoolId:user.schoolId,academicYearId:input.academicYearId,templateId:input.templateId,title:input.title,term:input.term,startDate:input.startDate,endDate:input.endDate,teacherDeadline:new Date(input.teacherDeadline),publishMode:'Manual',status:'Collecting',rulesSnapshot:{...settings.rules,...preview.template.rules,...(preview.course?.rules?.passMark!=null?{passAverage:Number(preview.course.rules.passMark)}:{})},sourceSnapshot,parentSessionId:input.parentSessionId||null,courseId:input.courseId||null,idempotencyKey:input.idempotencyKey,requestHash:hash,createdBy:user.id}).returning()
  for(let i=0;i<preview.orderedClasses.length;i++){const id=randomUUID();sessionClassIds.set(preview.orderedClasses[i],id);await tx.insert(examSessionClassesV2).values({id,schoolId:user.schoolId,sessionId,classId:preview.orderedClasses[i],order:i+1})}
  for(const row of preview.candidates){
   const assignmentId=randomUUID();await tx.insert(examAssignmentsV2).values({id:assignmentId,schoolId:user.schoolId,sessionId,sessionClassId:sessionClassIds.get(row.classId),templateSubjectId:row.templateSubjectId,offeringId:row.offeringId,classId:row.classId,subjectId:row.subjectId,leadTeacherId:row.leadTeacherId,subjectNameSnapshot:row.subjectName,maxMark:String(row.maxMark),minimumMark:String(row.minimumMark),deadline:new Date(input.teacherDeadline),status:row.roster.length?'Draft':'NotApplicable'})
   if(row.teacherIds.length)await tx.insert(examAssignmentTeachersV2).values(row.teacherIds.map(link=>({id:randomUUID(),schoolId:user.schoolId,assignmentId,teacherId:link.id,role:link.role,sourceTeacherLinkId:link.sourceTeacherLinkId})))
   if(row.roster.length)await tx.insert(examAssignmentStudentsV2).values(row.roster.map(item=>({id:randomUUID(),schoolId:user.schoolId,assignmentId,studentId:item.studentId,enrollmentId:item.enrollmentId,status:'Expected'})))
  }
  await tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId,action:'exams.v2.session.create',detail:JSON.stringify({sessionId,assignments:preview.candidates.length,sourceSnapshot})})
  return session
 })
}

async function publishReExam(tx,user,session,applicable,roster,scoreMap){
 const rules=session.rulesSnapshot||{},passAverage=Number(rules.passAverage)
 const [parentResults,progressions,studentRows]=await Promise.all([tx.select().from(examResultsV2).where(eq(examResultsV2.sessionId,session.parentSessionId)),tx.select().from(classProgressionsV2).where(and(eq(classProgressionsV2.schoolId,user.schoolId),eq(classProgressionsV2.academicYearId,session.academicYearId),eq(classProgressionsV2.status,'Active'))),tx.select().from(students).where(eq(students.schoolId,user.schoolId))])
 const parentByStudent=new Map(parentResults.map(row=>[row.studentId,row])),progressionMap=new Map(progressions.map(row=>[row.classId,row])),studentMap=new Map(studentRows.map(row=>[row.id,row]))
 const parentSubjects=parentResults.length?await tx.select().from(examResultSubjectsV2).where(inArray(examResultSubjectsV2.resultId,parentResults.map(row=>row.id))):[]
 const studentIds=[...new Set(roster.map(row=>row.studentId))],calculated=[]
 for(const studentId of studentIds){
  const parent=parentByStudent.get(studentId);if(!parent)throw new HttpError(409,'Re-exam student has no parent result.')
  const merged=new Map(parentSubjects.filter(row=>row.resultId===parent.id).map(row=>[row.subjectId,{earned:num(row.earned),possible:num(row.possible)}])),parts=[]
  for(const assignment of applicable){const ar=roster.find(row=>row.assignmentId===assignment.id&&row.studentId===studentId);if(!ar)continue;const score=num(scoreMap.get(ar.id).score);parts.push({assignment,score});merged.set(assignment.subjectId,{earned:score,possible:num(assignment.maxMark)})}
  const earned=[...merged.values()].reduce((n,p)=>n+p.earned,0),possible=[...merged.values()].reduce((n,p)=>n+p.possible,0),average=possible?earned/possible*100:0
  calculated.push({studentId,parent,parts,earned,possible,average,passed:average>=passAverage,failed:parts.filter(p=>p.score<subjectPass(p.assignment,passAverage))})
 }
 calculated.sort((a,b)=>b.average-a.average||a.studentId.localeCompare(b.studentId))
 const results=[];let rank=0,previous=null
 for(let i=0;i<calculated.length;i++){
  const row=calculated[i];if(previous===null||row.average!==previous)rank=i+1;previous=row.average
  const progression=progressionMap.get(row.parent.classId),resultId=randomUUID(),eligibility={promotion:row.passed&&!progression?.isFinal,targetClassId:row.passed?progression?.nextClassId||null:null,reExam:false,reExamOf:row.parent.id}
  await tx.insert(examResultsV2).values({id:resultId,schoolId:user.schoolId,sessionId:session.id,studentId:row.studentId,classId:row.parent.classId,earned:String(round2(row.earned)),possible:String(round2(row.possible)),average:String(row.average.toFixed(4)),displayAverage:String(round2(row.average).toFixed(2)),rank,outcome:row.passed?(progression?.isFinal?'Graduated':'Passed'):'Failed',passedSubjects:row.parts.length-row.failed.length,failedSubjects:row.failed.length,eligibility,calculationVersion:'v2.1-reexam'})
  await tx.insert(examResultSubjectsV2).values(row.parts.map(part=>({id:randomUUID(),schoolId:user.schoolId,resultId,subjectId:part.assignment.subjectId,assignmentId:part.assignment.id,earned:String(part.score),possible:String(part.assignment.maxMark),minimumMark:String(part.assignment.minimumMark),outcome:part.score>=subjectPass(part.assignment,passAverage)?'Passed':'Failed'})))
  await tx.update(examDecisionsV2).set({status:'Resolved'}).where(and(eq(examDecisionsV2.resultId,row.parent.id),eq(examDecisionsV2.decision,'Re-exam'),eq(examDecisionsV2.status,'Open')))
  if(eligibility.promotion&&!session.courseId)await tx.insert(studentPromotionsV2).values({id:randomUUID(),schoolId:user.schoolId,studentId:row.studentId,sourceResultId:resultId,fromAcademicYearId:session.academicYearId,toAcademicYearId:session.academicYearId,fromClassId:row.parent.classId,toClassId:eligibility.targetClassId,kind:'Promotion',status:'Pending',idempotencyKey:`result:${resultId}`})
  results.push({id:resultId,studentId:row.studentId,studentName:studentMap.get(row.studentId)?.fullName||'',rank,outcome:row.passed?'Passed':'Failed',average:round2(row.average)})
 }
 let promotionsApplied=0
 if(rules.promotionTiming==='OnFinalPublish'){
  const [nextYear]=(await tx.select().from(academicYears).where(and(eq(academicYears.schoolId,user.schoolId),eq(academicYears.status,'Active')))).filter(row=>row.id!==session.academicYearId)
  if(nextYear){const ids=results.map(row=>row.id),pendingRows=ids.length?await tx.select().from(studentPromotionsV2).where(and(inArray(studentPromotionsV2.sourceResultId,ids),eq(studentPromotionsV2.status,'Pending'))):[];await applyPromotions(tx,user,pendingRows,nextYear.id,`publish:${session.id}`);promotionsApplied=pendingRows.length}
 }
 const [published]=await tx.update(examSessionsV2).set({status:'Published',publishedAt:new Date()}).where(eq(examSessionsV2.id,session.id)).returning()
 await tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId,action:'exams.v2.reexam.publish',detail:JSON.stringify({sessionId:session.id,parentSessionId:session.parentSessionId,results:results.length,promotionsApplied})})
 return {...published,results,promotionsApplied}
}

// Students with an active course keep their normal promotion pending until the course exam is resolved.
async function courseTakerIds(tx,schoolId,academicYearId){
 const courses=await tx.select().from(coursesV2).where(and(eq(coursesV2.schoolId,schoolId),eq(coursesV2.academicYearId,academicYearId)))
 if(!courses.length)return new Set()
 const rows=await tx.select().from(courseEnrollmentsV2).where(and(inArray(courseEnrollmentsV2.courseId,courses.map(row=>row.id)),eq(courseEnrollmentsV2.status,'Enrolled')))
 return new Set(rows.map(row=>row.studentId))
}

// Passed course exam: the student's pending normal promotion is replaced by the
// target (accelerated) class. Failed: the normal promotion stands. Both are kept as history.
async function resolveCourseExam(tx,user,session,results){
 const enrollments=await tx.select().from(courseEnrollmentsV2).where(and(eq(courseEnrollmentsV2.courseId,session.courseId),eq(courseEnrollmentsV2.status,'Enrolled')))
 const byStudent=new Map(enrollments.map(row=>[row.studentId,row])),touched=[]
 for(const result of results){
  const enrollment=byStudent.get(result.studentId);if(!enrollment)continue
  const passed=result.outcome==='Passed'||result.outcome==='Graduated'
  await tx.update(courseEnrollmentsV2).set({status:passed?'Passed':'Failed'}).where(eq(courseEnrollmentsV2.id,enrollment.id))
  const pending=await tx.select().from(studentPromotionsV2).where(and(eq(studentPromotionsV2.schoolId,user.schoolId),eq(studentPromotionsV2.studentId,result.studentId),eq(studentPromotionsV2.fromAcademicYearId,session.academicYearId),eq(studentPromotionsV2.status,'Pending')))
  for(const promotion of pending){
   if(passed&&promotion.kind==='Promotion')await tx.update(studentPromotionsV2).set({toClassId:enrollment.targetClassId,kind:'CourseAcceleration'}).where(eq(studentPromotionsV2.id,promotion.id))
   touched.push({...promotion,toClassId:passed&&promotion.kind==='Promotion'?enrollment.targetClassId:promotion.toClassId})
  }
 }
 const [nextYear]=(await tx.select().from(academicYears).where(and(eq(academicYears.schoolId,user.schoolId),eq(academicYears.status,'Active')))).filter(row=>row.id!==session.academicYearId)
 if(nextYear&&touched.length){await applyPromotions(tx,user,touched,nextYear.id,`course:${session.id}`);return touched.length}
 return 0
}

export async function publishSession(db,user,sessionId){
 return db.transaction(async tx=>{
  const [session]=await tx.select().from(examSessionsV2).where(and(eq(examSessionsV2.id,sessionId),eq(examSessionsV2.schoolId,user.schoolId))).for('update')
  if(!session)throw new HttpError(404,'Exam session not found.')
  if(session.status==='Published')return session
  await writableYear(tx,user.schoolId,session.academicYearId,tx)
  const assignments=await tx.select().from(examAssignmentsV2).where(eq(examAssignmentsV2.sessionId,session.id))
  const applicable=assignments.filter(row=>row.status!=='NotApplicable')
  if(!applicable.length)throw new HttpError(409,'An exam with no applicable assignments cannot be published.')
  if(applicable.some(row=>!['Submitted','Late'].includes(row.status)))throw new HttpError(409,'Every applicable assignment must be submitted before publishing.')
  const roster=await tx.select().from(examAssignmentStudentsV2).where(inArray(examAssignmentStudentsV2.assignmentId,applicable.map(row=>row.id)))
  const scores=roster.length?await tx.select().from(examScoresV2).where(inArray(examScoresV2.assignmentStudentId,roster.map(row=>row.id))):[]
  const scoreMap=new Map(scores.map(row=>[row.assignmentStudentId,row]))
  if(roster.some(row=>scoreMap.get(row.id)?.markStatus!=='Scored'))throw new HttpError(409,'Every expected student must have a scored mark before publishing.')
  if(session.parentSessionId)return publishReExam(tx,user,session,applicable,roster,scoreMap)
  const studentRows=await tx.select().from(students).where(eq(students.schoolId,user.schoolId)),studentMap=new Map(studentRows.map(row=>[row.id,row])),progressions=await tx.select().from(classProgressionsV2).where(and(eq(classProgressionsV2.schoolId,user.schoolId),eq(classProgressionsV2.academicYearId,session.academicYearId),eq(classProgressionsV2.status,'Active'))),progressionMap=new Map(progressions.map(row=>[row.classId,row]))
  const rules=session.rulesSnapshot||{},passAverage=Number(rules.passAverage),requireMinimum=rules.passBasis!=='AverageOnly',results=[]
  for(const classId of [...new Set(applicable.map(row=>row.classId))]){
   const classAssignments=applicable.filter(row=>row.classId===classId),studentIds=[...new Set(roster.filter(row=>classAssignments.some(a=>a.id===row.assignmentId)).map(row=>row.studentId))],calculated=[]
   for(const studentId of studentIds){const parts=[];for(const assignment of classAssignments){const ar=roster.find(row=>row.assignmentId===assignment.id&&row.studentId===studentId);if(!ar)throw new HttpError(409,`Frozen roster is incomplete for ${studentId}.`);parts.push({assignment,score:num(scoreMap.get(ar.id).score)})}const earned=parts.reduce((n,p)=>n+p.score,0),possible=parts.reduce((n,p)=>n+num(p.assignment.maxMark),0),average=possible?earned/possible*100:0,failed=parts.filter(p=>p.score<subjectPass(p.assignment,passAverage));calculated.push({studentId,parts,earned,possible,average,passed:average>=passAverage&&(!requireMinimum||!failed.length),failed})}
   calculated.sort((a,b)=>b.average-a.average||a.studentId.localeCompare(b.studentId));let rank=0,previous=null
   for(let i=0;i<calculated.length;i++){const row=calculated[i];if(previous===null||row.average!==previous)rank=i+1;previous=row.average;const progression=progressionMap.get(classId),outcome=row.passed?(progression?.isFinal?'Graduated':'Passed'):'Failed',resultId=randomUUID(),eligibility={promotion:row.passed&&!progression?.isFinal,targetClassId:row.passed?progression?.nextClassId||null:null,reExam:!row.passed&&Boolean(rules.reExamAllowed)&&!session.courseId};await tx.insert(examResultsV2).values({id:resultId,schoolId:user.schoolId,sessionId:session.id,studentId:row.studentId,classId,earned:String(round2(row.earned)),possible:String(round2(row.possible)),average:String(row.average.toFixed(4)),displayAverage:String(round2(row.average).toFixed(2)),rank,outcome,passedSubjects:row.parts.length-row.failed.length,failedSubjects:row.failed.length,eligibility,calculationVersion:'v2.1'});await tx.insert(examResultSubjectsV2).values(row.parts.map(part=>({id:randomUUID(),schoolId:user.schoolId,resultId,subjectId:part.assignment.subjectId,assignmentId:part.assignment.id,earned:String(part.score),possible:String(part.assignment.maxMark),minimumMark:String(part.assignment.minimumMark),outcome:part.score>=subjectPass(part.assignment,passAverage)?'Passed':'Failed'})));if(eligibility.promotion)await tx.insert(studentPromotionsV2).values({id:randomUUID(),schoolId:user.schoolId,studentId:row.studentId,sourceResultId:resultId,fromAcademicYearId:session.academicYearId,toAcademicYearId:session.academicYearId,fromClassId:classId,toClassId:eligibility.targetClassId,kind:'Promotion',status:'Pending',idempotencyKey:`result:${resultId}`});results.push({id:resultId,studentId:row.studentId,studentName:studentMap.get(row.studentId)?.fullName||'',rank,outcome,average:round2(row.average)})}
  }
  let promotionsApplied=0
  const [template]=await tx.select().from(examTemplatesV2).where(eq(examTemplatesV2.id,session.templateId))
  if(template?.promotionExam&&rules.promotionTiming==='OnFinalPublish'){
   const [nextYear]=(await tx.select().from(academicYears).where(and(eq(academicYears.schoolId,user.schoolId),eq(academicYears.status,'Active')))).filter(row=>row.id!==session.academicYearId)
   if(nextYear){const ids=results.map(row=>row.id),held=await courseTakerIds(tx,user.schoolId,session.academicYearId),pendingRows=(ids.length?await tx.select().from(studentPromotionsV2).where(and(inArray(studentPromotionsV2.sourceResultId,ids),eq(studentPromotionsV2.status,'Pending'))):[]).filter(row=>!held.has(row.studentId));await applyPromotions(tx,user,pendingRows,nextYear.id,`publish:${session.id}`);promotionsApplied=pendingRows.length}
  }
  if(session.courseId)promotionsApplied=await resolveCourseExam(tx,user,session,results)
  const [published]=await tx.update(examSessionsV2).set({status:'Published',publishedAt:new Date()}).where(eq(examSessionsV2.id,session.id)).returning();await tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId,action:'exams.v2.publish',detail:JSON.stringify({sessionId:session.id,results:results.length,promotionsApplied})});return {...published,results,promotionsApplied}
 })
}

async function applyPromotions(tx,user,pending,toAcademicYearId,idempotencyKey){
  for(const promotion of pending){const key=`${idempotencyKey}:${promotion.id}`;await tx.update(studentEnrollments).set({status:'Completed'}).where(and(eq(studentEnrollments.schoolId,user.schoolId),eq(studentEnrollments.studentId,promotion.studentId),eq(studentEnrollments.academicYearId,promotion.fromAcademicYearId),eq(studentEnrollments.status,'Active')));if(promotion.toClassId)await tx.insert(studentEnrollments).values({id:randomUUID(),schoolId:user.schoolId,studentId:promotion.studentId,academicYearId:toAcademicYearId,classId:promotion.toClassId,status:'Active',source:'Exam v2 Transition'}).onConflictDoNothing();await tx.update(studentPromotionsV2).set({toAcademicYearId,status:'Applied',idempotencyKey:key,appliedAt:new Date(),appliedBy:user.id}).where(eq(studentPromotionsV2.id,promotion.id));if(promotion.toClassId){const [destination]=await tx.select().from(classes).where(and(eq(classes.id,promotion.toClassId),eq(classes.schoolId,user.schoolId)));await tx.update(students).set({classId:promotion.toClassId,gradeLevel:destination?.name||''}).where(and(eq(students.id,promotion.studentId),eq(students.schoolId,user.schoolId)))}}
}

export async function applyYearTransition(db,user,{fromAcademicYearId,toAcademicYearId,idempotencyKey}){
 if(fromAcademicYearId===toAcademicYearId)throw new HttpError(400,'Destination academic year must be different.')
 return db.transaction(async tx=>{
  const [source]=await tx.select().from(academicYears).where(and(eq(academicYears.id,fromAcademicYearId),eq(academicYears.schoolId,user.schoolId))),[target]=await tx.select().from(academicYears).where(and(eq(academicYears.id,toAcademicYearId),eq(academicYears.schoolId,user.schoolId)))
  if(!source||!target)throw new HttpError(404,'Academic year not found.');if(target.status!=='Active')throw new HttpError(409,'Destination academic year must be Active.')
  const pending=await tx.select().from(studentPromotionsV2).where(and(eq(studentPromotionsV2.schoolId,user.schoolId),eq(studentPromotionsV2.fromAcademicYearId,fromAcademicYearId),eq(studentPromotionsV2.status,'Pending')))
  await applyPromotions(tx,user,pending,toAcademicYearId,idempotencyKey)
  await tx.insert(systemLogs).values({id:randomUUID(),actorId:user.id,schoolId:user.schoolId,action:'exams.v2.year-transition',detail:JSON.stringify({fromAcademicYearId,toAcademicYearId,count:pending.length,idempotencyKey})});return {applied:pending.length}
 })
}
