import {api} from '../../../services/api'

type Id = string | number
type StudentId = Id | null | undefined
type ProfileUpdate = {interests?: string; about?: string; phone?: string}
type Preferences = {dark?: boolean; largeText?: boolean; reminders?: boolean; announcements?: boolean}
const forStudent=(studentId: StudentId)=>studentId?`?studentId=${encodeURIComponent(studentId)}`:''

export const getStudentPortal=(studentId?: StudentId)=>api(`/student/portal${forStudent(studentId)}`)
export const getStudentGrades=(studentId?: StudentId)=>api(`/student/grades${forStudent(studentId)}`)
export const getStudentExamHub=(studentId?: StudentId)=>api(`/exams/v2/student/hub${forStudent(studentId)}`)
export const updateStudentProfile=(body: ProfileUpdate,studentId?: StudentId)=>api(`/student/profile${forStudent(studentId)}`,{method:'PATCH',body})
export const updateStudentPreferences=(body: Preferences)=>api('/student/preferences',{method:'PUT',body})
export const saveAssignmentSubmission=(assignmentId: Id,response: string,studentId?: StudentId)=>api(`/student/assignments/${encodeURIComponent(assignmentId)}/submission${forStudent(studentId)}`,{method:'PUT',body:{response}})
export const addGalleryFavorite=(galleryItemId: Id,studentId?: StudentId)=>api(`/student/gallery/${encodeURIComponent(galleryItemId)}/favorite${forStudent(studentId)}`,{method:'PUT'})
export const removeGalleryFavorite=(galleryItemId: Id,studentId?: StudentId)=>api(`/student/gallery/${encodeURIComponent(galleryItemId)}/favorite${forStudent(studentId)}`,{method:'DELETE'})
export const sendStudentMessage=(conversationId: Id,body: string,studentId?: StudentId)=>api(`/student/conversations/${encodeURIComponent(conversationId)}/messages${forStudent(studentId)}`,{method:'POST',body:{body}})
export const markStudentConversationRead=(conversationId: Id,studentId?: StudentId)=>api(`/student/conversations/${encodeURIComponent(conversationId)}/read${forStudent(studentId)}`,{method:'POST'})
