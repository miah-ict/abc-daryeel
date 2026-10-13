import {useEffect,useState} from 'react'
import {loadTeacherExamV2,isExamV2Ready} from '../../exams/v2/examV2Adapter'
import TeacherExamV2Workspace from '../../exams/v2/TeacherExamV2Workspace'
import {ExamError,ExamLoading,ExamUnsupported} from '../../exams/v2/ExamV2UI'
import type { StateSetter } from '../types'

type ExamState = Awaited<ReturnType<typeof loadTeacherExamV2>>
type ReadyExamState = Extract<ExamState, { assignments: unknown }>
interface Props { setToast?: StateSetter<string> }

export default function TeachersExamsSection({setToast}: Props) {
  const [state,setState]=useState<ExamState | null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const load=async()=>{setLoading(true);setError('');try{setState(await loadTeacherExamV2())}catch(reason){setError(reason instanceof Error ? reason.message : 'Unable to load exams.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  if(loading)return <ExamLoading/>
  if(error)return <ExamError message={error} onRetry={load}/>
  if(!isExamV2Ready(state))return <ExamUnsupported message={state && 'message' in state ? state.message : undefined}/>
  const ready = state as ReadyExamState
  type ExamAction = ReadyExamState['actions']['saveDraft']
  const wrap=(action: ExamAction)=>async(assignment: Parameters<ExamAction>[0],payload: Parameters<ExamAction>[1])=>{const result=await action(assignment,payload);await load();setToast?.(action===ready.actions.submit?'Marks submitted and locked':'Draft saved');return result}
  return <TeacherExamV2Workspace key={ready.assignments.map((item: {id: string; status: string})=>item.id+item.status).join()} assignments={ready.assignments} writable={ready.writable} onSaveDraft={wrap(ready.actions.saveDraft)} onSubmit={wrap(ready.actions.submit)}/>
}
