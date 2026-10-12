import {api} from '../../../services/api'
export const getStudents=()=>api('/students')
export const getAttendance=date=>api(`/attendance?date=${encodeURIComponent(date)}`)
export const markAttendance=body=>api('/attendance',{method:'POST',body})
export const getExams=()=>api('/exams')
export const getExamAssignment=id=>api(`/exams/assignments/${encodeURIComponent(id)}`)
export const saveExamScores=(id,scores)=>api(`/exams/assignments/${encodeURIComponent(id)}/scores`,{method:'PUT',body:{scores}})
export const submitExamScores=id=>api(`/exams/assignments/${encodeURIComponent(id)}/submit`,{method:'POST'})
