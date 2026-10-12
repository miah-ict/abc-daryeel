import { createContext,useCallback,useContext,useEffect,useState } from 'react'
import * as authApi from '../../features/auth/api/authApi'
const Context=createContext(null)
export function AuthProvider({children}) {
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true)
 const logout=useCallback(()=>{
  authApi.logout().catch(()=>{})
  setUser(null)
 },[])
 useEffect(()=>{
  let alive=true
  authApi.currentUser().then(value=>{if(alive)setUser(value)}).catch(()=>{}).finally(()=>{if(alive)setLoading(false)})
  window.addEventListener('abc-session-expired',logout)
  return()=>{alive=false;window.removeEventListener('abc-session-expired',logout)}
 },[logout])
 const signIn=async(mode,data,{remember=false}={})=>{
  const result=await authApi[mode]({...data,remember})
  setUser(result.user)
  return result.user
 }
 return <Context.Provider value={{user,loading,signIn,logout}}>{children}</Context.Provider>
}
export const useAuth=()=>useContext(Context)
