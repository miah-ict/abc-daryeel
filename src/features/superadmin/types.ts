import type { ComponentType, Dispatch, ReactNode, RefObject, SetStateAction } from 'react'

export interface SuperUser { id: string; name: string; email: string; role: string; school: string; status: string }
export interface School { id: string; name: string; location: string; students: number; status: string; email: string }
export interface Program { id: string; name: string; category: string; age: string; enrolled: number; status: string }
export interface LogEntry { id: string; title: string; detail: string; type: string; icon: string; time: string; actor: string }
export interface SuperSettings { name: string; school: string; email: string; timezone: string; notifications: boolean }
export interface BackupHistory { id: string; date: string; users: number; centers: number }
export interface BackupPayload { version: 1; createdAt: string; data: { users: SuperUser[]; schools: School[]; programs: Program[]; logs: LogEntry[]; settings: SuperSettings } }
export type EntityKind = 'user' | 'school' | 'program'
export interface EditableEntity { id: string; name: string; email?: string; role?: string; school?: string; location?: string; students?: number; category?: string; age?: string; enrolled?: number; status: string }
export type SuperModal = { kind: EntityKind; item?: EditableEntity } | { kind: 'restore' }
export type WorkspaceSetter<T> = (value: T | ((previous: T) => T)) => unknown
export type StateSetter<T> = Dispatch<SetStateAction<T>>
export type DownloadReport = (kind: string) => void
export type Match = (...values: string[]) => boolean
export type FilterRenderer = (options: string[] | undefined, placeholder: string) => ReactNode

export interface TileIconProps { name: string; tone?: string; sprite?: number }
export type TileIconComponent = ComponentType<TileIconProps>
export interface PanelProps { title: string; icon: string; tone?: string; children?: ReactNode; link?: string; action?: ReactNode; className?: string }
export type PanelComponent = ComponentType<PanelProps>
export type StatusComponent = ComponentType<{ value: string }>
export type BackupFileRef = RefObject<HTMLInputElement | null>
