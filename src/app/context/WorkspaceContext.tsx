import { createContext,useCallback,useContext,useEffect,useRef,useState, type ReactNode } from 'react'
import { loadWorkspace,saveWorkspace } from '../../features/dashboard/api/dashboardApi'
import type { Role } from '../../data/roles'

interface WorkspaceSnapshot { revision: number; data: Record<string, any>; overview?: any; [key: string]: any }
interface Deferred { resolve: (value?: any) => void; reject: (reason?: any) => void }
interface WorkspaceContextValue extends WorkspaceSnapshot {
 update: (key: string, value: any) => Promise<any>
 refresh: () => Promise<WorkspaceSnapshot>
}
const Context=createContext<WorkspaceContextValue | null>(null)
const handled=<T,>(promise: Promise<T>)=>{promise.catch(()=>{});return promise}
export function WorkspaceProvider({role,children}: { role: Role; children: ReactNode }) {
 const [snapshot,setSnapshot]=useState<WorkspaceSnapshot | null>(null),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 const state=useRef<WorkspaceSnapshot | null>(null),pending=useRef<Record<string, any>>({}),busy=useRef(false),timer=useRef<ReturnType<typeof setTimeout> | null>(null),alive=useRef(true),failed=useRef(false)
 const waiters=useRef<Deferred[]>([]),idle=useRef<Deferred[]>([]),active=useRef<Deferred[]>([]),generation=useRef(0),flushRef=useRef<(() => Promise<void>) | null>(null)
 const rejectWaiting=(err: unknown)=>[waiters,idle,active].forEach(ref=>ref.current.splice(0).forEach(item=>item.reject(err)))
 const reload=useCallback(async()=>{
  generation.current+=1;if(timer.current)clearTimeout(timer.current);rejectWaiting(new Error('School records were reloaded.'));busy.current=false;setSaving(false)
  const token=generation.current
  setError('');failed.current=false;pending.current={};setSnapshot(null)
  try {const value=await loadWorkspace(role);if(alive.current&&token===generation.current){state.current=value;setSnapshot(value)}}
  catch(err){if(alive.current&&token===generation.current)setError(err instanceof Error ? err.message : 'School records could not be loaded.')}
 },[role])
 useEffect(()=>{alive.current=true;reload();const warn=(e: BeforeUnloadEvent)=>{if(busy.current||Object.keys(pending.current).length){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>{alive.current=false;generation.current+=1;rejectWaiting(new Error('Workspace was closed.'));if(timer.current)clearTimeout(timer.current);window.removeEventListener('beforeunload',warn)}},[reload])
 const flush=async()=>{
  if(busy.current||failed.current||!Object.keys(pending.current).length)return
  busy.current=true;setSaving(true)
  const changes=pending.current;pending.current={}
  const batch=waiters.current.splice(0),token=generation.current;active.current=batch
  try {
   if(!state.current)throw new Error('Workspace is not loaded.')
   const result=await saveWorkspace(role,changes,state.current.revision) as WorkspaceSnapshot
   if(!alive.current||token!==generation.current)return
   state.current={...result,data:{...result.data,...pending.current}}
   if(alive.current)setSnapshot(state.current)
   batch.forEach(item=>item.resolve(result))
  } catch(err) {
   batch.forEach(item=>item.reject(err))
   if(!alive.current||token!==generation.current)return
   rejectWaiting(err);failed.current=true;pending.current={...changes,...pending.current}
   if(alive.current)setError(`Changes were not saved: ${err instanceof Error ? err.message : 'Unknown error'}`)
  } finally {
   if(token!==generation.current)return
   active.current=[];busy.current=false
   if(alive.current)setSaving(false)
   if(!failed.current&&Object.keys(pending.current).length)flushRef.current?.()
   else if(!failed.current)idle.current.splice(0).forEach(item=>item.resolve())
  }
 }
 flushRef.current=flush
 const update=(key: string,value: any)=>{
  if(failed.current||!state.current||!alive.current)return handled(Promise.reject(new Error('Reload school records before saving changes.')))
  const next=typeof value==='function'?value(state.current.data[key]):value
  state.current={...state.current,data:{...state.current.data,[key]:next}}
  pending.current[key]=next;setSnapshot(state.current)
  const promise=handled(new Promise((resolve,reject)=>waiters.current.push({resolve,reject})))
  if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>flushRef.current?.(),0)
  return promise
 }
 const refresh=()=>handled((async()=>{
  if(failed.current)throw new Error('Reload school records before refreshing.')
  if(busy.current||Object.keys(pending.current).length){const drained=new Promise((resolve,reject)=>idle.current.push({resolve,reject}));flushRef.current?.();await drained}
  if(!alive.current)throw new Error('Workspace was closed.')
  const token=generation.current;busy.current=true
  try{const value=await loadWorkspace(role);if(!alive.current||token!==generation.current)throw new Error('Workspace was closed.');state.current={...value,data:{...value.data,...pending.current}};setSnapshot(state.current);return state.current}
  catch(err){if(alive.current&&token===generation.current)setError(`School records could not be refreshed: ${err instanceof Error ? err.message : 'Unknown error'}`);throw err}
  finally{if(token===generation.current){busy.current=false;if(Object.keys(pending.current).length)flushRef.current?.();else idle.current.splice(0).forEach(item=>item.resolve())}}
 })())
 if(!snapshot)return <div className="api-state" role="status">{error||'Loading school records…'}{error&&<button onClick={reload}>Retry</button>}</div>
 return <Context.Provider value={{...snapshot,update,refresh}}><div className="persistence-status" role="status">{saving?'Saving changes…':error||'Connected to school database'}{error&&<button disabled={saving} onClick={reload}>Reload school records</button>}</div><fieldset className="workspace-fieldset" disabled={!!error}>{children}</fieldset></Context.Provider>
}
export const useWorkspace=()=>{
 const value=useContext(Context)
 if(!value)throw new Error('Workspace state requires WorkspaceProvider')
 return value
}
export function useWorkspaceState<T = any>(key: string): [T, (value: T | ((current: T) => T)) => Promise<any>] {
 const workspace=useWorkspace()
 if(!workspace)throw new Error('Workspace state requires WorkspaceProvider')
 return [workspace.data[key] as T,value=>workspace.update(key,value)]
}
export { Context as WorkspaceContext }
