import { createContext,useCallback,useContext,useEffect,useRef,useState } from 'react'
import { loadWorkspace,saveWorkspace } from '../../features/dashboard/api/dashboardApi'
const Context=createContext(null)
const handled=promise=>{promise.catch(()=>{});return promise}
export function WorkspaceProvider({role,children}) {
 const [snapshot,setSnapshot]=useState(null),[error,setError]=useState(''),[saving,setSaving]=useState(false)
 const state=useRef(null),pending=useRef({}),busy=useRef(false),timer=useRef(null),alive=useRef(true),failed=useRef(false)
 const waiters=useRef([]),idle=useRef([]),active=useRef([]),generation=useRef(0),flushRef=useRef(null)
 const rejectWaiting=err=>[waiters,idle,active].forEach(ref=>ref.current.splice(0).forEach(item=>item.reject(err)))
 const reload=useCallback(async()=>{
  generation.current+=1;clearTimeout(timer.current);rejectWaiting(new Error('School records were reloaded.'));busy.current=false;setSaving(false)
  const token=generation.current
  setError('');failed.current=false;pending.current={};setSnapshot(null)
  try {const value=await loadWorkspace(role);if(alive.current&&token===generation.current){state.current=value;setSnapshot(value)}}
  catch(err){if(alive.current&&token===generation.current)setError(err.message)}
 },[role])
 useEffect(()=>{alive.current=true;reload();const warn=e=>{if(busy.current||Object.keys(pending.current).length){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>{alive.current=false;generation.current+=1;rejectWaiting(new Error('Workspace was closed.'));clearTimeout(timer.current);window.removeEventListener('beforeunload',warn)}},[reload])
 const flush=async()=>{
  if(busy.current||failed.current||!Object.keys(pending.current).length)return
  busy.current=true;setSaving(true)
  const changes=pending.current;pending.current={}
  const batch=waiters.current.splice(0),token=generation.current;active.current=batch
  try {
   const result=await saveWorkspace(role,changes,state.current.revision)
   if(!alive.current||token!==generation.current)return
   state.current={...result,data:{...result.data,...pending.current}}
   if(alive.current)setSnapshot(state.current)
   batch.forEach(item=>item.resolve(result))
  } catch(err) {
   batch.forEach(item=>item.reject(err))
   if(!alive.current||token!==generation.current)return
   rejectWaiting(err);failed.current=true;pending.current={...changes,...pending.current}
   if(alive.current)setError(`Changes were not saved: ${err.message}`)
  } finally {
   if(token!==generation.current)return
   active.current=[];busy.current=false
   if(alive.current)setSaving(false)
   if(!failed.current&&Object.keys(pending.current).length)flushRef.current()
   else if(!failed.current)idle.current.splice(0).forEach(item=>item.resolve())
  }
 }
 flushRef.current=flush
 const update=(key,value)=>{
  if(failed.current||!state.current||!alive.current)return handled(Promise.reject(new Error('Reload school records before saving changes.')))
  const next=typeof value==='function'?value(state.current.data[key]):value
  state.current={...state.current,data:{...state.current.data,[key]:next}}
  pending.current[key]=next;setSnapshot(state.current)
  const promise=handled(new Promise((resolve,reject)=>waiters.current.push({resolve,reject})))
  clearTimeout(timer.current);timer.current=setTimeout(()=>flushRef.current(),0)
  return promise
 }
 const refresh=()=>handled((async()=>{
  if(failed.current)throw new Error('Reload school records before refreshing.')
  if(busy.current||Object.keys(pending.current).length){const drained=new Promise((resolve,reject)=>idle.current.push({resolve,reject}));flushRef.current();await drained}
  if(!alive.current)throw new Error('Workspace was closed.')
  const token=generation.current;busy.current=true
  try{const value=await loadWorkspace(role);if(!alive.current||token!==generation.current)throw new Error('Workspace was closed.');state.current={...value,data:{...value.data,...pending.current}};setSnapshot(state.current);return state.current}
  catch(err){if(alive.current&&token===generation.current)setError(`School records could not be refreshed: ${err.message}`);throw err}
  finally{if(token===generation.current){busy.current=false;if(Object.keys(pending.current).length)flushRef.current();else idle.current.splice(0).forEach(item=>item.resolve())}}
 })())
 if(!snapshot)return <div className="api-state" role="status">{error||'Loading school records…'}{error&&<button onClick={reload}>Retry</button>}</div>
 return <Context.Provider value={{...snapshot,update,refresh}}><div className="persistence-status" role="status">{saving?'Saving changes…':error||'Connected to school database'}{error&&<button disabled={saving} onClick={reload}>Reload school records</button>}</div><fieldset className="workspace-fieldset" disabled={!!error}>{children}</fieldset></Context.Provider>
}
export const useWorkspace=()=>useContext(Context)
export function useWorkspaceState(key) {
 const workspace=useWorkspace()
 if(!workspace)throw new Error('Workspace state requires WorkspaceProvider')
 return [workspace.data[key],value=>workspace.update(key,value)]
}
export { Context as WorkspaceContext }
