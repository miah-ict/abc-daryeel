import {api} from '../../../services/api'
export const getUsers=()=>api('/superadmin/users')
export const createUser=(body: Record<string, unknown>)=>api('/users',{method:'POST',body})
export const updateUser=(id: string,body: Record<string, unknown>)=>api(`/users/${encodeURIComponent(id)}`,{method:'PUT',body})
export const getSystemLogs=()=>api('/superadmin/logs')
