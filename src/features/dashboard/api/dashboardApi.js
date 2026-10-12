import { api } from '../../../services/api'
export const loadWorkspace = role => api(`/workspace/${role}`)
export const saveWorkspace = (role,changes,revision) => api(`/workspace/${role}`,{method:'PUT',body:{changes,revision}})
export const getDashboard = role => api(`/dashboard/${role}`)
