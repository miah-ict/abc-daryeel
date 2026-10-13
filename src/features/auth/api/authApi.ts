import { api } from '../../../services/api'
type AuthCredentials = {identifier?: string; email?: string; password: string; schoolId?: string | number; fullName?: string; remember?: boolean}
export const login = (data: AuthCredentials) => api('/auth/login',{method:'POST',body:data})
export const register = (data: AuthCredentials) => api('/auth/register',{method:'POST',body:data})
export const currentUser = () => api('/auth/me')
export const logout = () => api('/auth/logout',{method:'POST'})
export const listSchools = () => api('/auth/schools')
