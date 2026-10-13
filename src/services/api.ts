export class ApiError extends Error {
 status: number
 payload?: unknown

 constructor(message: string, status: number) {
  super(message)
  this.name = 'ApiError'
  this.status = status
 }
}
export type ApiOptions = Omit<RequestInit, 'body' | 'headers'> & { body?: unknown; headers?: HeadersInit }

export async function api<T = any>(path: string, {body,headers,...options}: ApiOptions = {}): Promise<T> {
 let response
 try {response=await fetch(`/api${path}`,{credentials:'same-origin',...options,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})})}
 catch {throw new ApiError('Cannot reach the school API. Check your connection and retry.',0)}
 const payload: any=await response.json().catch(()=>({error:'The API returned an invalid response.'}))
 if(!response.ok){
  // A rejected sign-in is not a session expiry. Clearing an active session here
  // could sign a user out in another tab after a mistyped password.
  if(response.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('abc-session-expired'))
  const failure=new ApiError(payload.error||'Request failed.',response.status);failure.payload=payload;throw failure
 }
 return payload
}
