import {createContext,useContext,useState} from 'react'
const Context=createContext(null)
export function ThemeProvider({children}) {
 const [dark,setDark]=useState(()=>localStorage.getItem('abc-theme')==='dark')
 const toggle=value=>{const next=typeof value==='function'?value(dark):value;setDark(next);localStorage.setItem('abc-theme',next?'dark':'light')}
 return <Context.Provider value={{dark,setDark:toggle}}>{children}</Context.Provider>
}
export const useTheme=()=>useContext(Context)
