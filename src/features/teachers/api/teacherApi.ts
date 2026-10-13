import {api} from '../../../services/api'
export const getStudents=()=>api('/students')
export const getAttendance=(date: string)=>api(`/attendance?date=${encodeURIComponent(date)}`)
export const markAttendance=(body: Record<string, unknown>)=>api('/attendance',{method:'POST',body})
export const getExams=()=>api('/exams')
export const getExamAssignment=(id: string)=>api(`/exams/assignments/${encodeURIComponent(id)}`)
export const saveExamScores=(id: string,scores: Record<string, number>)=>api(`/exams/assignments/${encodeURIComponent(id)}/scores`,{method:'PUT',body:{scores}})
export const submitExamScores=(id: string)=>api(`/exams/assignments/${encodeURIComponent(id)}/submit`,{method:'POST'})
