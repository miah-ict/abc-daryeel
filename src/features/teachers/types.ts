import type { Dispatch, ReactNode, SetStateAction } from 'react'

export type AttendanceStatus = 'Present' | 'Absent' | 'Unmarked'
export type AssessmentTab = 'progress' | 'assignments'

export interface Student {
  id: string
  name: string
  age: number
  guardian: string
  email: string
  status: AttendanceStatus
  notes: string
}

export interface Lesson {
  id: string
  title: string
  subject: string
  date: string
  duration: number
  status: string
  objective: string
  materials?: string
  activity?: string
}

export interface Assignment {
  id: string
  title: string
  subject: string
  due: string
  description: string
  status: string
}

export interface Message {
  id: string
  sender: string
  text: string
  time: string
}

export interface MessageThread {
  id: string
  name: string
  student: string
  unread: boolean
  messages: Message[]
}

export interface Activity {
  id: string
  title: string
  description: string
  icon: string
  tone: string
}

export interface TeacherSettings {
  name: string
  email: string
  className: string
  room: string
  bio: string
  reminders: boolean
  summary: boolean
}

export type Scores = Record<string, Record<string, number>>
export type Attendance = Record<string, Record<string, AttendanceStatus>>
export type WorkspaceSetter<T> = (value: T | ((previous: T) => T)) => unknown
export type StateSetter<T> = Dispatch<SetStateAction<T>>
export type SearchField = (placeholder: string) => ReactNode
export type DownloadReport = (kind: string) => void
export type AddActivity = (title: string, description: string, icon?: string, tone?: string) => unknown

export type TeacherModal =
  | { type: 'student'; item: Student }
  | { type: 'assessment'; item: Student }
  | { type: 'lesson'; item?: Lesson }
  | { type: 'assignment'; item?: Assignment }
  | { type: 'message' }
