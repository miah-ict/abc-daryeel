import { api } from '../../../services/api'
type WorkspaceChanges = Record<string, unknown>
export const loadWorkspace = (role: string) => api(`/workspace/${role}`)
export const saveWorkspace = (role: string,changes: WorkspaceChanges,revision: string | number) => api(`/workspace/${role}`,{method:'PUT',body:{changes,revision}})
export const getDashboard = (role: string) => api(`/dashboard/${role}`)
