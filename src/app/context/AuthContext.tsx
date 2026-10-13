import { createContext,useCallback,useContext,useEffect,useState, type ReactNode } from 'react'
import * as authApi from '../../features/auth/api/authApi'
import type { AuthResult, AuthUser } from '../../types/auth'

type AuthMode = 'login' | 'register'
type AuthPayload = Record<string, FormDataEntryValue | boolean | undefined>
interface AuthContextValue {
 user: AuthUser | null
 loading: boolean
 signIn: (mode: AuthMode, data: AuthPayload, options?: { remember?: boolean }) => Promise<AuthUser>
 logout: () => void
}

const unauthenticatedContext: AuthContextValue = {
 user: null,
 loading: false,
 signIn: async () => { throw new Error('Authentication state requires AuthProvider') },
 logout: () => {},
}
const Context=createContext<AuthContextValue>(unauthenticatedContext)
export function AuthProvider({children}: { children: ReactNode }) {
 const [user,setUser]=useState<AuthUser | null>(null),[loading,setLoading]=useState(true)
 const logout=useCallback(()=>{
  authApi.logout().catch(()=>{})
  setUser(null)
 },[])
 useEffect(()=>{
  let alive=true
  authApi.currentUser().then((value: AuthUser)=>{if(alive)setUser(value)}).catch(()=>{}).finally(()=>{if(alive)setLoading(false)})
  window.addEventListener('abc-session-expired',logout)
  return()=>{alive=false;window.removeEventListener('abc-session-expired',logout)}
 },[logout])
 const signIn=async(mode: AuthMode,data: AuthPayload,{remember=false}: { remember?: boolean }={})=>{
  const credentials={...data,remember}
  const action=authApi[mode] as (payload: typeof credentials) => Promise<AuthResult>
  const result=await action(credentials)
  setUser(result.user)
  return result.user
 }
 return <Context.Provider value={{user,loading,signIn,logout}}>{children}</Context.Provider>
}
export const useAuth=()=>{
 return useContext(Context)
}
