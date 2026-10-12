import {useEffect,useState} from 'react'
import {loadTeacherExamV2,isExamV2Ready} from '../../exams/v2/examV2Adapter'
import TeacherExamV2Workspace from '../../exams/v2/TeacherExamV2Workspace'
import {ExamError,ExamLoading,ExamUnsupported} from '../../exams/v2/ExamV2UI'

export default function TeachersExamsSection({setToast}) {
  const [state,setState]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const load=async()=>{setLoading(true);setError('');try{setState(await loadTeacherExamV2())}catch(reason){setError(reason.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  if(loading)return <ExamLoading/>
  if(error)return <ExamError message={error} onRetry={load}/>
  if(!isExamV2Ready(state))return <ExamUnsupported message={state?.message}/>
  const wrap=action=>async(assignment,payload)=>{const result=await action(assignment,payload);await load();setToast?.(action===state.actions.submit?'Marks submitted and locked':'Draft saved');return result}
  return <TeacherExamV2Workspace key={state.assignments.map(item=>item.id+item.status).join()} assignments={state.assignments} writable={state.writable} onSaveDraft={wrap(state.actions.saveDraft)} onSubmit={wrap(state.actions.submit)}/>
}
