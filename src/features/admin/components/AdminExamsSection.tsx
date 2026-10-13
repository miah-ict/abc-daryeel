import {useEffect,useState} from 'react'
import Icon from '../../../components/ui/Icon'
import {getAcademicYears,getExams} from '../api/adminApi'
import {loadAdminExamV2,isExamV2Ready} from '../../exams/v2/examV2Adapter'
import AdminExamV2Workspace from '../../exams/v2/AdminExamV2Workspace'
import {ExamError,ExamLoading,ExamStatus,ExamUnsupported} from '../../exams/v2/ExamV2UI'

function LegacyExamReadOnly({exams=[],years=[]}){
 const active=years.find(item=>item.status==='Active')
 return <section className="ad-panel exam-v2-legacy" aria-labelledby="legacy-exams-title"><header><div><span className="ad-icon blue"><Icon name="Archive"/></span><div><h2 id="legacy-exams-title">Existing exam records</h2><p>Legacy records remain visible for continuity. They cannot be created, scored, reopened or published from this screen.</p></div></div><span className="ad-badge orange"><i/>Read only</span></header><div className="exam-v2-legacy-summary"><span><small>Exam periods</small><strong>{exams.length}</strong></span><span><small>Collecting</small><strong>{exams.filter(item=>item.status==='Collecting').length}</strong></span><span><small>Published</small><strong>{exams.filter(item=>item.status==='Published').length}</strong></span><span><small>Active year</small><strong>{active?.name||'Not set'}</strong></span></div><div className="ad-table-scroll"><table><thead><tr><th>Exam</th><th>Academic year</th><th>Type</th><th>Submissions</th><th>Status</th></tr></thead><tbody>{exams.map(item=><tr key={item.id}><td><strong>{item.title}</strong></td><td>{item.academicYear||years.find(year=>year.id===item.academicYearId)?.name||'—'}</td><td>{item.type||'Main'}</td><td>{item.submittedAssignments||0}/{item.totalAssignments||0}</td><td><ExamStatus>{item.status}</ExamStatus></td></tr>)}</tbody></table>{!exams.length&&<div className="ad-empty"><Icon name="Archive"/><strong>No existing exam records</strong><span>Exam v2 setup will become available when its server contract is enabled.</span></div>}</div></section>
}

export default function AdminExamsSection({classes=[],subjects=[],teachers=[]}: {classes?: any[]; subjects?: any[]; teachers?: any[]; [key: string]: any}) {
 const [v2,setV2]=useState(null),[legacy,setLegacy]=useState({exams:[],years:[]}),[error,setError]=useState(''),[loading,setLoading]=useState(true)
 const load=async()=>{setLoading(true);setError('');try{const [experience,examResult,yearResult]=await Promise.allSettled([loadAdminExamV2(),getExams(),getAcademicYears()]);if(experience.status==='rejected')throw experience.reason;setV2(experience.value);setLegacy({exams:examResult.status==='fulfilled'&&Array.isArray(examResult.value)?examResult.value:[],years:yearResult.status==='fulfilled'&&Array.isArray(yearResult.value)?yearResult.value:[]})}catch(reason){setError(reason.message)}finally{setLoading(false)}}
 const refresh=async()=>{try{const next=await loadAdminExamV2();setV2(next)}catch{/* keep the current view */}}
 useEffect(()=>{load()},[])
 if(loading)return <ExamLoading label="Loading the exam administration workspace…"/>
 if(error)return <ExamError message={error} onRetry={load}/>
 if(isExamV2Ready(v2))return <AdminExamV2Workspace model={v2.data||v2} classes={classes} subjects={subjects} teachers={teachers} writable={v2.writable===true} actions={Object.fromEntries(Object.entries(v2.actions||{}).map(([key,action])=>[key,['completeSetup','reopenAssignment','publishSession','createSession','createCourse','updateCourseStatus','enrollCourseStudent','updateCoursePayment','createCourseExam'].includes(key)?async(...args)=>{const result=await (action as (...args: any[]) => Promise<unknown>)(...args);await refresh();return result}:action]))}/>
 return <div className="exam-v2-stack"><ExamUnsupported message={v2?.message}>Exam v2 is not available yet.</ExamUnsupported><LegacyExamReadOnly exams={legacy.exams} years={legacy.years}/></div>
}

export {LegacyExamReadOnly}
