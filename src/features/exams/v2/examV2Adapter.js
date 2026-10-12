// Exam v2 boundary. Only endpoints that exist in server/routes/exams-v2.routes.js
// are bound here. If the contract cannot be reached the adapter reports
// "unsupported" so v2 mutations never silently fall back to v1 semantics.
import {api} from '../../../services/api.js'

export const EXAM_V2_UNSUPPORTED = 'EXAM_V2_UNSUPPORTED'

export class ExamV2UnsupportedError extends Error {
  constructor(message='Exam v2 is not enabled for this school yet.') {
    super(message)
    this.name='ExamV2UnsupportedError'
    this.code=EXAM_V2_UNSUPPORTED
  }
}

const unavailable = role => ({
  mode:'unsupported',
  role,
  writable:false,
  code:EXAM_V2_UNSUPPORTED,
  message:'The Exam v2 server contract is not available. Existing exam records remain read-only; setup, scoring and publishing are disabled.',
})

export function buildPolicyRules(draft={}) {
  const passAverage=Number(draft.passAverage)
  const subjectMinimum=Number(draft.subjectMinimum)
  const normalizedPass=Number.isFinite(passAverage)&&draft.passAverage!==''&&draft.passAverage!=null?passAverage:50
  return {
    passBasis:Number.isFinite(subjectMinimum)&&subjectMinimum>0?'AverageAndSubjectMinimum':'AverageOnly',
    maxMarkModel:'PerSubject',
    deadlinePolicy:'BlockLate',
    reexamScope:'FailedSubjects',
    reexamScorePolicy:'SeparateResolution',
    promotionTiming:'OnFinalPublish',
    rounding:'HalfUp2',
    passAverage:normalizedPass,
    failBelow:Number.isFinite(Number(draft.failBelow))&&draft.failBelow!==''?Number(draft.failBelow):normalizedPass,
    subjectMinimum:Number.isFinite(subjectMinimum)&&draft.subjectMinimum!==''?subjectMinimum:0,
    reExamAllowed:true,
    displayDecimals:Number(draft.decimalPlaces??2),
  }
}

// Classes in the order the admin arranged them, up to and including the final class.
export function buildProgressionRows(classes=[],draft={}) {
  const known=new Map(classes.map(item=>[item.id,item]))
  const saved=(draft.classOrder||[]).filter(id=>known.has(id))
  const ordered=[...saved,...classes.map(item=>item.id).filter(id=>!saved.includes(id))]
  if(!ordered.length)return []
  const finalIndex=ordered.includes(draft.finalClassId)?ordered.indexOf(draft.finalClassId):ordered.length-1
  const chain=ordered.slice(0,finalIndex+1)
  return chain.map((classId,index)=>({classId,order:index+1,nextClassId:chain[index+1]||null,isFinal:index===chain.length-1}))
}

let latestVersion=0

export const loadAdminExamV2 = async()=>{
  try{
    const [v2Courses,settings,templates,sessions,years,v2Subjects]=await Promise.all([
      api('/exams/v2/courses').catch(()=>[]),
      api('/exams/v2/settings'),
      api('/exams/v2/templates').catch(()=>[]),
      api('/exams/v2/sessions').catch(()=>[]),
      api('/academic-years').catch(()=>[]),
      api('/exams/v2/subjects').catch(()=>[]),
    ])
    const monitors=await Promise.all((Array.isArray(sessions)?sessions:[]).map(item=>api(`/exams/v2/sessions/${encodeURIComponent(item.id)}/monitor`).catch(()=>null)))
    const monitored=(Array.isArray(sessions)?sessions:[]).map((item,index)=>{
      const m=monitors[index]
      if(!m)return item
      return {...item,totalAssignments:m.total,submittedAssignments:m.submitted,pendingAssignments:m.pending,lateAssignments:m.late,overdueAssignments:m.overdue,completionPercent:m.percent,ready:m.ready,classProgress:m.classes,
        assignments:m.assignments.map(row=>({...row,status:row.overdue?'Overdue':row.status}))}
    })
    const latest=(Array.isArray(settings)?settings:[])[0]
    latestVersion=latest?.version||0
    const stored=latest?.rules?.draft||{}
    const setup={
      id:latest?.id||null,
      status:latest?.status==='Complete'?'Complete':'Draft',
      currentStep:Math.max(0,Math.min(4,(latest?.currentStep||1)-1)),
      draft:stored,
    }
    const state={
      mode:'v2',
      role:'admin',
      writable:true,
      data:{setup,templates,subjects:Array.isArray(v2Subjects)?v2Subjects:[],sessions:monitored,courses:Array.isArray(v2Courses)?v2Courses:[],academicYears:Array.isArray(years)?years:[]},
    }
    state.actions=buildAdminActions(state)
    return state
  }catch{
    return unavailable('admin')
  }
}

function buildAdminActions(state) {
  // Persist the current wizard step and return the merged draft so ids created
  // on the server (such as the academic year) are kept for later steps.
  const persist=async(step,draft,classes,status='Pending')=>{
    let next={...draft}
    if(step===0&&!next.academicYearId){
      if(!next.yearName||!next.startDate||!next.endDate)throw new Error('Enter the academic year name, start date and end date.')
      if(next.endDate<=next.startDate)throw new Error('End date must be after the start date.')
      const year=await api('/academic-years',{method:'POST',body:{name:next.yearName,startDate:next.startDate,endDate:next.endDate}})
      next.academicYearId=year.id
      if(next.active)await api(`/academic-years/${encodeURIComponent(year.id)}/start`,{method:'POST'})
    }
    if(step===1){
      if(!next.academicYearId)throw new Error('Complete the academic year step first.')
      const rows=buildProgressionRows(classes,next)
      if(!rows.length)throw new Error('Create classes before configuring progression.')
      await api(`/exams/v2/progressions/${encodeURIComponent(next.academicYearId)}`,{method:'PUT',body:{rows}})
    }
    latestVersion+=1
    const saved=await api('/exams/v2/settings',{method:'PUT',body:{version:latestVersion,currentStep:Math.min(5,step+1),policyStatus:status,rules:{...buildPolicyRules(next),draft:next}}})
    return {draft:next,settings:saved}
  }
  return {
    saveSetupDraft:async({step,draft,classes=[]})=>persist(step,draft,classes),
    createTemplate:async input=>{
      const rows=(input.subjects||[]).map((row,index)=>({subjectId:row.subjectId,order:index+1,maxMark:Number(row.maxMark),minimumMark:Number(row.minimumMark||0),required:true}))
      if(!rows.length)throw new Error('Select at least one subject.')
      const created=await api('/exams/v2/templates',{method:'POST',body:{familyId:globalThis.crypto?.randomUUID?.()||`template-${Date.now()}`,version:1,name:input.name,category:input.category,promotionExam:Boolean(input.promotionExam),reExamAllowed:Boolean(input.reExamAllowed),visibility:'PublishedOnly',rules:{totalMarks:Number(input.totalMarks),passAverage:Number(input.passAverage)},subjects:rows}})
      return {...created,subjects:rows}
    },
    reopenAssignment:async(row,reason='Admin correction before publish')=>api(`/exams/v2/assignments/${encodeURIComponent(row.id)}/reopen`,{method:'POST',body:{reason}}),
    publishSession:async session=>api(`/exams/v2/sessions/${encodeURIComponent(session.id)}/publish`,{method:'POST'}),
    loadDecisions:async session=>api(`/exams/v2/sessions/${encodeURIComponent(session.id)}/decisions`),
    decide:async(resultId,body)=>api(`/exams/v2/results/${encodeURIComponent(resultId)}/decisions`,{method:'POST',body}),
    createCourse:async payload=>api('/exams/v2/courses',{method:'POST',body:payload}),
    updateCourseStatus:async(courseId,status)=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}/status`,{method:'PATCH',body:{status}}),
    loadCourseDetail:async courseId=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}`),
    loadCourseCandidates:async courseId=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}/candidates`),
    enrollCourseStudent:async(courseId,body)=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}/enroll`,{method:'POST',body}),
    updateCoursePayment:async(courseId,enrollmentId,body)=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}/payments/${encodeURIComponent(enrollmentId)}`,{method:'PUT',body}),
    createCourseExam:async(courseId,body)=>api(`/exams/v2/courses/${encodeURIComponent(courseId)}/exam`,{method:'POST',body}),
    createSubject:async name=>api('/exams/v2/subjects',{method:'POST',body:{name}}),
    createOffering:async({academicYearId,classId,subjectId,teacherId})=>api('/exams/v2/offerings',{method:'POST',body:{academicYearId,classId,subjectId,effectiveFrom:new Date().toISOString(),teachers:[{teacherId,role:'Lead'}]}}),
    previewSession:async payload=>api('/exams/v2/assignments/preview',{method:'POST',body:payload}),
    createSession:async payload=>api('/exams/v2/sessions',{method:'POST',body:{...payload,idempotencyKey:globalThis.crypto?.randomUUID?.()||`session-${Date.now()}`}}),
    completeSetup:async({draft,classes=[],subjects=[]})=>{
      const {settings}=await persist(4,draft,classes,'Confirmed')
      const selectedIds=Array.isArray(draft.templateSubjectIds)?draft.templateSubjectIds:subjects.map(item=>item.id)
      const selected=subjects.filter(item=>selectedIds.includes(item.id))
      if(selected.length){
        const existing=await api('/exams/v2/subjects')
        const byName=new Map(existing.map(item=>[item.name.trim().toLowerCase(),item]))
        const resolved=[]
        for(const subject of selected){
          const key=String(subject.name||'').trim().toLowerCase()
          let row=byName.get(key)
          if(!row){row=await api('/exams/v2/subjects',{method:'POST',body:{name:subject.name}});byName.set(key,row)}
          resolved.push(row)
        }
        const templates=await api('/exams/v2/templates')
        const templateName=String(draft.templateName||'Final Exam').trim()
        if(!templates.some(item=>item.name.trim().toLowerCase()===templateName.toLowerCase())){
          const maxMark=Number(draft.templateMaxMarks||100),minimumMark=Number(draft.templateSubjectMinimum??draft.subjectMinimum??0)
          await api('/exams/v2/templates',{method:'POST',body:{
            familyId:globalThis.crypto?.randomUUID?.()||`template-${Date.now()}`,version:1,name:templateName,
            category:draft.templateCategory||'Final',promotionExam:Boolean(draft.templatePromotion??((draft.templateCategory||'Final')==='Final')),
            reExamAllowed:Boolean(draft.templateReExam??((draft.templateCategory||'Final')==='Final')),visibility:'PublishedOnly',
            rules:{totalMarks:maxMark,passAverage:Number(draft.templatePassAverage??draft.passAverage??50)},
            subjects:resolved.map((item,index)=>({subjectId:item.id,order:index+1,maxMark,minimumMark,required:true})),
          }})
        }
      }
      return api(`/exams/v2/settings/${encodeURIComponent(settings.id)}/complete`,{method:'POST'})
    },
  }
}

const remaining=(deadline,now)=>{
  const ms=new Date(deadline)-new Date(now)
  if(!Number.isFinite(ms))return ''
  if(ms<=0)return 'Deadline passed'
  const minutes=Math.floor(ms/60000),days=Math.floor(minutes/1440),hours=Math.floor((minutes%1440)/60)
  return days?`${days}d ${hours}h remaining`:hours?`${hours}h ${minutes%60}m remaining`:`${minutes}m remaining`
}

// Teacher mark sheets: only the teacher's own assignments and their class roster.
export const loadTeacherExamV2 = async()=>{
  try{
    const listing=await api('/exams/v2/assignments')
    const details=await Promise.all(listing.assignments.map(item=>api(`/exams/v2/assignments/${encodeURIComponent(item.id)}`)))
    const assignments=listing.assignments.map((item,index)=>({
      ...item,
      subjectName:item.subjectNameSnapshot,
      timeRemainingLabel:['Submitted','Late'].includes(item.status)?'Submitted':remaining(item.deadline,listing.serverNow),
      overdue:!['Submitted','Late'].includes(item.status)&&new Date(item.deadline)<new Date(listing.serverNow),
      students:(details[index].students||[]).map(row=>({
        id:row.studentId,name:row.name,studentNumber:row.studentId,
        score:row.mark?.score??null,entryState:row.mark?.markStatus&&row.mark.markStatus!=='Missing'?row.mark.markStatus:'Scored',
      })),
    }))
    const save=async(assignment,{scores})=>api(`/exams/v2/assignments/${encodeURIComponent(assignment.id)}/scores`,{method:'PUT',body:{scores:scores.map(row=>({studentId:row.studentId,status:'Scored',score:row.score}))}})
    return {mode:'v2',role:'teacher',writable:true,assignments,actions:{
      saveDraft:save,
      submit:async(assignment,payload)=>{await save(assignment,payload);return api(`/exams/v2/assignments/${encodeURIComponent(assignment.id)}/submit`,{method:'POST'})},
    }}
  }catch{
    return unavailable('teacher')
  }
}
export const loadStudentExamV2 = async(studentId)=>{
  try{
    const query=studentId?`?studentId=${encodeURIComponent(studentId)}`:''
    const data=await api(`/exams/v2/student/hub${query}`)
    return {mode:'v2',role:'student',writable:true,data}
  }catch{
    return unavailable('student')
  }
}

export function requireExamV2Write(state) {
  if(state?.mode!=='v2'||state?.writable!==true)throw new ExamV2UnsupportedError()
  return true
}

export const isExamV2Ready = state=>state?.mode==='v2'
