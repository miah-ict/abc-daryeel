import { api } from '../../../services/api'
export const login = data => api('/auth/login',{method:'POST',body:data})
export const register = data => api('/auth/register',{method:'POST',body:data})
export const currentUser = () => api('/auth/me')
export const logout = () => api('/auth/logout',{method:'POST'})
export const listSchools = () => api('/auth/schools')
