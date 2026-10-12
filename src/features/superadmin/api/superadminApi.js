import {api} from '../../../services/api'
export const getUsers=()=>api('/superadmin/users')
export const createUser=body=>api('/users',{method:'POST',body})
export const updateUser=(id,body)=>api(`/users/${encodeURIComponent(id)}`,{method:'PUT',body})
export const getSystemLogs=()=>api('/superadmin/logs')
