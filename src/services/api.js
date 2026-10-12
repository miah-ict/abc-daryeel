export class ApiError extends Error {
 constructor(message,status){super(message);this.status=status}
}
export async function api(path,{body,headers,...options}={}) {
 let response
 try {response=await fetch(`/api${path}`,{credentials:'same-origin',...options,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})})}
 catch {throw new ApiError('Cannot reach the school API. Check your connection and retry.',0)}
 const payload=await response.json().catch(()=>({error:'The API returned an invalid response.'}))
 if(!response.ok){
  // A rejected sign-in is not a session expiry. Clearing an active session here
  // could sign a user out in another tab after a mistyped password.
  if(response.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('abc-session-expired'))
  const failure=new ApiError(payload.error||'Request failed.',response.status);failure.payload=payload;throw failure
 }
 return payload
}
