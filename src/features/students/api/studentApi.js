import {api} from '../../../services/api'

const forStudent=studentId=>studentId?`?studentId=${encodeURIComponent(studentId)}`:''

export const getStudentPortal=studentId=>api(`/student/portal${forStudent(studentId)}`)
export const getStudentGrades=studentId=>api(`/student/grades${forStudent(studentId)}`)
export const getStudentExamHub=studentId=>api(`/exams/v2/student/hub${forStudent(studentId)}`)
export const updateStudentProfile=(body,studentId)=>api(`/student/profile${forStudent(studentId)}`,{method:'PATCH',body})
export const updateStudentPreferences=body=>api('/student/preferences',{method:'PUT',body})
export const saveAssignmentSubmission=(assignmentId,response,studentId)=>api(`/student/assignments/${encodeURIComponent(assignmentId)}/submission${forStudent(studentId)}`,{method:'PUT',body:{response}})
export const addGalleryFavorite=(galleryItemId,studentId)=>api(`/student/gallery/${encodeURIComponent(galleryItemId)}/favorite${forStudent(studentId)}`,{method:'PUT'})
export const removeGalleryFavorite=(galleryItemId,studentId)=>api(`/student/gallery/${encodeURIComponent(galleryItemId)}/favorite${forStudent(studentId)}`,{method:'DELETE'})
export const sendStudentMessage=(conversationId,body,studentId)=>api(`/student/conversations/${encodeURIComponent(conversationId)}/messages${forStudent(studentId)}`,{method:'POST',body:{body}})
export const markStudentConversationRead=(conversationId,studentId)=>api(`/student/conversations/${encodeURIComponent(conversationId)}/read${forStudent(studentId)}`,{method:'POST'})
