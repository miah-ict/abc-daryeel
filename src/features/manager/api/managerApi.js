import {api} from '../../../services/api'
export const createTeacher=body=>api('/users',{method:'POST',body:{...body,role:'teacher'}})
export const editTeacher=(id,body)=>api(`/users/${encodeURIComponent(id)}`,{method:'PUT',body:{...body,role:'teacher'}})
export const createClass=body=>api('/classes',{method:'POST',body})
export const editClass=(id,body)=>api(`/classes/${encodeURIComponent(id)}`,{method:'PUT',body})
