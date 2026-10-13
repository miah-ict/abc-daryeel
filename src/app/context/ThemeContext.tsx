import {createContext,useContext,useState,type Dispatch,type ReactNode,type SetStateAction} from 'react'
interface ThemeContextValue { dark: boolean; setDark: Dispatch<SetStateAction<boolean>> }
const Context=createContext<ThemeContextValue | null>(null)
export function ThemeProvider({children}: { children: ReactNode }) {
 const [dark,setDark]=useState(()=>localStorage.getItem('abc-theme')==='dark')
 const toggle: Dispatch<SetStateAction<boolean>>=value=>{const next=typeof value==='function'?value(dark):value;setDark(next);localStorage.setItem('abc-theme',next?'dark':'light')}
 return <Context.Provider value={{dark,setDark:toggle}}>{children}</Context.Provider>
}
export const useTheme=()=>{
 const value=useContext(Context)
 if(!value)throw new Error('Theme state requires ThemeProvider')
 return value
}
