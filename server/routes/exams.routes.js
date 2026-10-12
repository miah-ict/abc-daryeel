import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { academicYears, classes, courseEnrollments, examAssignments, examResults, exams, examScores, studentEnrollments, students, systemLogs, users } from '../db/schema/index.js'
import { allow } from '../middleware/auth.middleware.js'
import { asyncRoute, HttpError } from '../middleware/error.middleware.js'

const scoreInput=z.object({scores:z.array(z.object({studentId:z.string().min(1),score:z.coerce.number().int().min(0).max(100)})).max(10000)}).strict()
const examInput=z.object({title:z.string().trim().min(2).max(120),academicYearId:z.string().min(1),type:z.enum(['Main','Course','Re-exam']).default('Main'),parentExamId:z.string().nullable().optional(),passMark:z.coerce.number().int().min(0).max(100).default(50),assignments:z.array(z.object({classId:z.string().min(1),subjectName:z.string().trim().min(1).max(100),teacherId:z.string().min(1)})).min(1).max(1000)}).strict()

const classMatches=(student,classroom)=>student.classId===classroom.id||(!student.classId&&student.gradeLevel===classroom.name)

export function examsRoutes(db) {
 const router=Router()
 router.use(allow('admin','manager','teacher','student'))

 router.get('/',asyncRoute(async(req,res)=>{
  if(req.user.role==='student')return res.json([])
  const schoolExams=await db.select().from(exams).where(eq(exams.schoolId,req.user.schoolId||''))
  const ids=schoolExams.map(item=>item.id)
  const assignments=ids.length?await db.select().from(examAssignments).where(inArray(examAssignments.examId,ids)):[]
  const years=await db.select().from(academicYears).where(eq(academicYears.schoolId,req.user.schoolId||'')),yearNames=new Map(years.map(y=>[y.id,y.name]))
  const visible=req.user.role==='teacher'?schoolExams.filter(exam=>exam.status!=='Cancelled'&&assignments.some(a=>a.examId===exam.id&&a.teacherId===req.user.id)):schoolExams
  res.json(visible.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(exam=>{
   const own=assignments.filter(a=>a.examId===exam.id&&(req.user.role!=='teacher'||a.teacherId===req.user.id))
   return {...exam,academicYear:yearNames.get(exam.academicYearId)||'',assignments:own,totalAssignments:own.length,submittedAssignments:own.filter(a=>a.status==='Submitted').length}
  }))
 }))

 router.post('/',allow('admin'),asyncRoute(async(req,res)=>{
  const input=examInput.parse(req.body)
  const [year]=await db.select().from(academicYears).where(and(eq(academicYears.id,input.academicYearId),eq(academicYears.schoolId,req.user.schoolId)))
  if(!year)throw new HttpError(400,'Academic year must belong to this school.')
  if(input.type!=='Main'&&!input.parentExamId)throw new HttpError(400,'Course and re-exams require a parent exam.')
  if(input.parentExamId){const [parent]=await db.select().from(exams).where(and(eq(exams.id,input.parentExamId),eq(exams.schoolId,req.user.schoolId),eq(exams.status,'Published')));if(!parent||parent.type!=='Main')throw new HttpError(400,'Parent exam must be a published main exam from this school.');if(input.type==='Course'){const roster=await db.select().from(courseEnrollments).where(eq(courseEnrollments.examId,parent.id));if(!roster.length)throw new HttpError(409,'The parent exam has no accelerated-course students.');if(input.assignments.some(item=>!roster.some(entry=>entry.courseClassId===item.classId)))throw new HttpError(400,'Course assignments must use a course class from the parent exam.')}if(input.type==='Re-exam'){const failed=await db.select().from(examResults).where(and(eq(examResults.examId,parent.id),eq(examResults.failedDecision,'Re-exam')));if(!failed.length)throw new HttpError(409,'No failed students have been assigned to re-examination.');if(input.assignments.some(item=>!failed.some(entry=>entry.classId===item.classId)))throw new HttpError(400,'Re-exam assignments must use a class with selected re-exam students.')}}
  const schoolClasses=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),classIds=new Set(schoolClasses.map(c=>c.id))
  const schoolTeachers=await db.select().from(users).where(and(eq(users.schoolId,req.user.schoolId),eq(users.role,'teacher'))),teacherIds=new Set(schoolTeachers.map(t=>t.id))
  for(const item of input.assignments){if(!classIds.has(item.classId))throw new HttpError(400,'Every exam class must belong to this school.');if(!teacherIds.has(item.teacherId))throw new HttpError(400,'Every exam teacher must belong to this school.')}
  const created=await db.transaction(async tx=>{
   const id=randomUUID(),[exam]=await tx.insert(exams).values({id,schoolId:req.user.schoolId,academicYearId:input.academicYearId,title:input.title,type:input.type,parentExamId:input.parentExamId||null,passMark:input.passMark,status:'Collecting',createdBy:req.user.id}).returning()
   await tx.insert(examAssignments).values(input.assignments.map(item=>({...item,id:randomUUID(),examId:id,status:'Draft'})))
   await tx.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.create',detail:`${input.title} · ${input.type}`})
   return exam
  })
  res.status(201).json(created)
 }))

 const assignmentContext=async(req,id,tx=db)=>{
  const [assignment]=await tx.select().from(examAssignments).where(eq(examAssignments.id,id))
  if(!assignment)throw new HttpError(404,'Exam assignment not found.')
  const [exam]=await tx.select().from(exams).where(and(eq(exams.id,assignment.examId),eq(exams.schoolId,req.user.schoolId||'')))
  if(!exam)throw new HttpError(404,'Exam not found.')
  if(req.user.role==='teacher'&&assignment.teacherId!==req.user.id)throw new HttpError(403,'This subject is assigned to another teacher.')
  if(!['admin','manager','teacher'].includes(req.user.role))throw new HttpError(403,'This exam workspace is not available to students.')
  const [classroom]=await tx.select().from(classes).where(eq(classes.id,assignment.classId))
  let roster=await tx.select().from(students).where(eq(students.schoolId,req.user.schoolId))
  if(exam.type==='Main')roster=roster.filter(student=>classMatches(student,classroom))
  else if(exam.type==='Course'){
   const enrolled=await tx.select().from(courseEnrollments).where(and(eq(courseEnrollments.examId,exam.parentExamId),eq(courseEnrollments.courseClassId,assignment.classId))),ids=new Set(enrolled.map(x=>x.studentId));roster=roster.filter(s=>ids.has(s.id))
  }else{
   const failed=await tx.select().from(examResults).where(and(eq(examResults.examId,exam.parentExamId),eq(examResults.classId,assignment.classId),eq(examResults.failedDecision,'Re-exam'))),ids=new Set(failed.map(x=>x.studentId));roster=roster.filter(s=>ids.has(s.id))
  }
  return {assignment,exam,classroom,roster}
 }

 router.get('/assignments/:id',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{
  const context=await assignmentContext(req,req.params.id),scores=await db.select().from(examScores).where(eq(examScores.assignmentId,req.params.id)),byStudent=new Map(scores.map(s=>[s.studentId,s.score]))
  res.json({...context.assignment,exam:context.exam,classroom:context.classroom,students:context.roster.map(s=>({id:s.id,name:s.fullName,score:byStudent.get(s.id)??''}))})
 }))

 router.put('/assignments/:id/scores',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const input=scoreInput.parse(req.body)
  const saved=await db.transaction(async tx=>{
   const {assignment,exam,roster}=await assignmentContext(req,req.params.id,tx)
   if(exam.status==='Published'||assignment.status==='Submitted')throw new HttpError(409,'Submitted or published marks are locked.')
   const allowed=new Set(roster.map(s=>s.id))
   if(new Set(input.scores.map(s=>s.studentId)).size!==input.scores.length||input.scores.some(s=>!allowed.has(s.studentId)))throw new HttpError(400,'Scores contain duplicate or ineligible students.')
   for(const score of input.scores)await tx.insert(examScores).values({id:randomUUID(),assignmentId:assignment.id,...score,updatedAt:new Date()}).onConflictDoUpdate({target:[examScores.assignmentId,examScores.studentId],set:{score:score.score,updatedAt:new Date()}})
   return input.scores
  })
  res.json(saved)
 }))

 router.post('/assignments/:id/submit',allow('admin','teacher'),asyncRoute(async(req,res)=>{
  const result=await db.transaction(async tx=>{
   const {assignment,exam,roster}=await assignmentContext(req,req.params.id,tx)
   if(exam.status==='Published')throw new HttpError(409,'Published exam marks are locked.')
   const scores=await tx.select().from(examScores).where(eq(examScores.assignmentId,assignment.id))
   if(scores.length!==roster.length)throw new HttpError(409,`Enter marks for all ${roster.length} students before submitting.`)
   const [updated]=await tx.update(examAssignments).set({status:'Submitted',submittedAt:new Date()}).where(eq(examAssignments.id,assignment.id)).returning()
   await tx.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.submit',detail:`${exam.title} · ${assignment.subjectName}`})
   return updated
  })
  res.json(result)
 }))

 router.post('/assignments/:id/reopen',allow('admin'),asyncRoute(async(req,res)=>{
  const reason=z.object({reason:z.string().trim().min(3).max(500)}).parse(req.body).reason
  const {assignment,exam}=await assignmentContext(req,req.params.id)
  if(exam.status==='Published')throw new HttpError(409,'A published exam cannot be reopened.')
  const [updated]=await db.update(examAssignments).set({status:'Draft',submittedAt:null,reopenedAt:new Date()}).where(eq(examAssignments.id,assignment.id)).returning()
  await db.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.reopen',detail:`${assignment.id} · ${reason}`})
  res.json(updated)
 }))

 router.post('/:id/publish',allow('admin'),asyncRoute(async(req,res)=>{
  const published=await db.transaction(async tx=>{
   const [exam]=await tx.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId))).for('update')
   if(!exam)throw new HttpError(404,'Exam not found.')
   if(exam.status==='Published')throw new HttpError(409,'This exam is already published.')
   const assignments=await tx.select().from(examAssignments).where(eq(examAssignments.examId,exam.id))
   if(!assignments.length||assignments.some(a=>a.status!=='Submitted'))throw new HttpError(409,'Every subject must be submitted before publishing.')
   const allScores=await tx.select().from(examScores).where(inArray(examScores.assignmentId,assignments.map(a=>a.id)))
   const schoolClasses=await tx.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),classMap=new Map(schoolClasses.map(c=>[c.id,c]))
   if(exam.type==='Main')for(const classId of new Set(assignments.map(a=>a.classId))){const classroom=classMap.get(classId),next=classMap.get(classroom?.nextClassId),target=classMap.get(next?.nextClassId);if(classroom?.courseEnabled&&(!next||!target))throw new HttpError(409,`${classroom.name} needs two configured successor classes before accelerated-course results can be published.`)}
   const schoolStudents=await tx.select().from(students).where(eq(students.schoolId,req.user.schoolId))
   const parentCourses=exam.type==='Course'?await tx.select().from(courseEnrollments).where(eq(courseEnrollments.examId,exam.parentExamId)):[]
   const parentFailed=exam.type==='Re-exam'?await tx.select().from(examResults).where(and(eq(examResults.examId,exam.parentExamId),eq(examResults.failedDecision,'Re-exam'))):[]
   const results=[]
   for(const classId of [...new Set(assignments.map(a=>a.classId))]){
    const classroom=classMap.get(classId),classAssignments=assignments.filter(a=>a.classId===classId),assignmentIds=new Set(classAssignments.map(a=>a.id))
    let roster=schoolStudents.filter(s=>classMatches(s,classroom))
    if(exam.type==='Course'){const ids=new Set(parentCourses.filter(e=>e.courseClassId===classId).map(e=>e.studentId));roster=schoolStudents.filter(s=>ids.has(s.id))}
    if(exam.type==='Re-exam'){const ids=new Set(parentFailed.filter(e=>e.classId===classId).map(e=>e.studentId));roster=schoolStudents.filter(s=>ids.has(s.id))}
    const classRows=roster.map(student=>{
     const marks=allScores.filter(s=>s.studentId===student.id&&assignmentIds.has(s.assignmentId)).map(s=>s.score)
     if(marks.length!==classAssignments.length)throw new HttpError(409,`Missing marks for ${student.fullName} in ${classroom.name}.`)
     return {student,average:marks.reduce((sum,value)=>sum+value,0)/marks.length}
    }).sort((a,b)=>b.average-a.average||a.student.id.localeCompare(b.student.id))
    let rank=0,previous=null
    for(let index=0;index<classRows.length;index++){
     const row=classRows[index];if(previous===null||row.average!==previous)rank=index+1;previous=row.average
     const courseEnrollment=exam.type==='Course'?parentCourses.find(e=>e.studentId===row.student.id&&e.courseClassId===classId):null
     const courseSource=courseEnrollment?classMap.get(courseEnrollment.sourceClassId):null
     const threshold=exam.type==='Course'?(courseSource?.coursePassMark??exam.passMark):exam.passMark
     const passed=row.average>=threshold,next=classMap.get(classroom.nextClassId)
     let outcome=passed?(next?'Passed':'Completed'):'Failed',promotionClassId=passed?next?.id||null:null
     if(exam.type==='Course'){
      const enrollment=courseEnrollment
      promotionClassId=passed?enrollment?.targetClassId||null:null
      await tx.update(courseEnrollments).set({status:passed?'Passed':'Failed',score:String(row.average)}).where(eq(courseEnrollments.id,enrollment.id))
     }
     const result={id:randomUUID(),examId:exam.id,studentId:row.student.id,classId,average:String(row.average.toFixed(2)),rank,outcome,promotionClassId,failedDecision:passed?null:null}
     await tx.insert(examResults).values(result);results.push(result)
     if(passed&&promotionClassId){const destination=classMap.get(promotionClassId);await tx.update(students).set({classId:promotionClassId,gradeLevel:destination.name}).where(eq(students.id,row.student.id));await tx.insert(studentEnrollments).values({id:randomUUID(),schoolId:req.user.schoolId,studentId:row.student.id,academicYearId:exam.academicYearId,classId:promotionClassId,source:`${exam.type} Promotion`}).onConflictDoNothing()}
     if(exam.type==='Main'&&passed&&classroom.courseEnabled&&rank<=classroom.courseRankLimit&&next){
      const target=classMap.get(next.nextClassId)
      if(target)await tx.insert(courseEnrollments).values({id:randomUUID(),schoolId:req.user.schoolId,examId:exam.id,studentId:row.student.id,sourceClassId:classroom.id,courseClassId:next.id,targetClassId:target.id,source:'Auto Rank',status:'Enrolled'}).onConflictDoNothing()
     }
    }
   }
   const [updated]=await tx.update(exams).set({status:'Published',publishedAt:new Date()}).where(eq(exams.id,exam.id)).returning()
   await tx.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.publish',detail:`${exam.title} · ${results.length} results`})
   return {...updated,resultCount:results.length}
  })
  res.json(published)
 }))

 router.post('/:id/cancel',allow('admin'),asyncRoute(async(req,res)=>{
  const reason=z.object({reason:z.string().trim().min(3).max(500)}).parse(req.body).reason
  const [exam]=await db.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId)))
  if(!exam)throw new HttpError(404,'Exam not found.')
  if(exam.status!=='Collecting')throw new HttpError(409,'Only a collecting exam can be cancelled.')
  const [updated]=await db.update(exams).set({status:'Cancelled'}).where(eq(exams.id,exam.id)).returning()
  await db.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.cancel',detail:`${exam.title} · ${reason}`})
  res.json(updated)
 }))

 router.get('/results/me',allow('student'),asyncRoute(async(req,res)=>{
  const childScope=or(eq(students.id,req.user.id),eq(students.parentId,req.user.id))
  const children=await db.select().from(students).where(req.user.schoolId?and(eq(students.schoolId,req.user.schoolId),childScope):childScope)
  const ids=children.map(s=>s.id)
  if(!ids.length)return res.json([])
  const schoolIds=[...new Set(children.map(child=>child.schoolId).filter(Boolean))]
  const rows=await db.select().from(examResults).where(inArray(examResults.studentId,ids)),published=schoolIds.length?await db.select().from(exams).where(and(inArray(exams.schoolId,schoolIds),eq(exams.status,'Published'))):[],examMap=new Map(published.map(e=>[e.id,e]))
  res.json(rows.filter(r=>examMap.has(r.examId)).map(r=>({...r,examTitle:examMap.get(r.examId).title,examType:examMap.get(r.examId).type})))
 }))

 router.get('/:id/results',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{
  const [exam]=await db.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId)))
  if(!exam||exam.status!=='Published')throw new HttpError(404,'Published exam not found.')
  let rows=await db.select().from(examResults).where(eq(examResults.examId,exam.id))
  if(req.user.role==='teacher'){const own=await db.select().from(examAssignments).where(and(eq(examAssignments.examId,exam.id),eq(examAssignments.teacherId,req.user.id))),allowed=new Set(own.map(a=>a.classId));rows=rows.filter(row=>allowed.has(row.classId))}
  const studentRows=await db.select().from(students).where(eq(students.schoolId,req.user.schoolId)),classRows=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),names=new Map(studentRows.map(s=>[s.id,s.fullName])),classNames=new Map(classRows.map(c=>[c.id,c.name]))
  res.json(rows.map(r=>({...r,studentName:names.get(r.studentId)||'',className:classNames.get(r.classId)||'',promotionClassName:classNames.get(r.promotionClassId)||''})))
 }))

 router.put('/:id/results/:studentId/decision',allow('admin'),asyncRoute(async(req,res)=>{
  const decision=z.object({decision:z.enum(['Repeat','Re-exam'])}).parse(req.body).decision
  const [exam]=await db.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId),eq(exams.status,'Published')))
  if(!exam)throw new HttpError(404,'Published exam not found.')
  const [updated]=await db.update(examResults).set({failedDecision:decision}).where(and(eq(examResults.examId,exam.id),eq(examResults.studentId,req.params.studentId),eq(examResults.outcome,'Failed'))).returning()
  if(!updated)throw new HttpError(404,'Failed result not found.')
  await db.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'exams.failed-decision',detail:`${req.params.studentId} · ${decision}`})
  res.json(updated)
 }))

 router.get('/:id/courses',allow('admin','manager','teacher'),asyncRoute(async(req,res)=>{
  const [exam]=await db.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId)))
  if(!exam)throw new HttpError(404,'Exam not found.')
  const rows=await db.select().from(courseEnrollments).where(eq(courseEnrollments.examId,exam.id)),studentRows=await db.select().from(students).where(eq(students.schoolId,req.user.schoolId)),classRows=await db.select().from(classes).where(eq(classes.schoolId,req.user.schoolId)),names=new Map(studentRows.map(s=>[s.id,s.fullName])),classNames=new Map(classRows.map(c=>[c.id,c.name]))
  res.json(rows.map(r=>({...r,studentName:names.get(r.studentId)||'',courseClassName:classNames.get(r.courseClassId)||'',targetClassName:classNames.get(r.targetClassId)||''})))
 }))

 router.post('/:id/courses',allow('admin'),asyncRoute(async(req,res)=>{
  const input=z.object({studentId:z.string().min(1),sourceClassId:z.string().min(1),reason:z.string().trim().min(3).max(500)}).parse(req.body)
  const [exam]=await db.select().from(exams).where(and(eq(exams.id,req.params.id),eq(exams.schoolId,req.user.schoolId),eq(exams.status,'Published'),eq(exams.type,'Main')))
  if(!exam)throw new HttpError(404,'Published main exam not found.')
  const [student]=await db.select().from(students).where(and(eq(students.id,input.studentId),eq(students.schoolId,req.user.schoolId))),[source]=await db.select().from(classes).where(and(eq(classes.id,input.sourceClassId),eq(classes.schoolId,req.user.schoolId)))
  if(!student||!source)throw new HttpError(400,'Student and source class must belong to this school.')
  const [originalResult]=await db.select().from(examResults).where(and(eq(examResults.examId,exam.id),eq(examResults.studentId,student.id),eq(examResults.classId,source.id)))
  if(!originalResult)throw new HttpError(400,'Student did not sit this exam in the selected source class.')
  const [course]=await db.select().from(classes).where(eq(classes.id,source.nextClassId||'')),[target]=course?await db.select().from(classes).where(eq(classes.id,course.nextClassId||'')):[]
  if(!course||!target)throw new HttpError(400,'This class needs two configured successors for an accelerated course.')
  try{
   const [created]=await db.insert(courseEnrollments).values({id:randomUUID(),schoolId:req.user.schoolId,examId:exam.id,studentId:student.id,sourceClassId:source.id,courseClassId:course.id,targetClassId:target.id,source:'Manual',reason:input.reason,status:'Enrolled'}).returning()
   await db.insert(systemLogs).values({id:randomUUID(),actorId:req.user.id,schoolId:req.user.schoolId,action:'courses.manual-enroll',detail:`${student.fullName} · ${input.reason}`})
   res.status(201).json(created)
  }catch(error){if(error?.code==='23505')throw new HttpError(409,'Student is already enrolled in this course.');throw error}
 }))
 return router
}
