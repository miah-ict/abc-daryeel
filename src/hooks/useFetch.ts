import {useEffect,useState} from 'react'
export default function useFetch(load) {
 const [state,setState]=useState({data:null,loading:true,error:null})
 useEffect(()=>{let live=true;setState({data:null,loading:true,error:null});load().then(data=>{if(live)setState({data,loading:false,error:null})}).catch(error=>{if(live)setState({data:null,loading:false,error})});return()=>{live=false}},[load])
 return state
}
