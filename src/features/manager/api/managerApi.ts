import {api} from '../../../services/api'
type Id = string | number
type Payload = Record<string, unknown>
export const createTeacher=(body: Payload)=>api('/users',{method:'POST',body:{...body,role:'teacher'}})
export const editTeacher=(id: Id,body: Payload)=>api(`/users/${encodeURIComponent(id)}`,{method:'PUT',body:{...body,role:'teacher'}})
export const createClass=(body: Payload)=>api('/classes',{method:'POST',body})
export const editClass=(id: Id,body: Payload)=>api(`/classes/${encodeURIComponent(id)}`,{method:'PUT',body})
