import {useEffect,useRef,useState} from 'react'
import Icon from '../../../components/ui/Icon'
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Mogadishu',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`
export const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(value)||0)
export function Panel({title,icon='LayoutDashboard',action,children,className=''}){return <section className={`mgr-panel ${className}`}><header><h2><Icon name={icon} size={15}/>{title}</h2>{action}</header>{children}</section>}
export function MetricStrip({items=[]}){return <div className="mgr-metrics">{items.map((item,i)=><article key={item.label||i} className={`mgr-metric ${item.color||['blue','green','purple','pink','orange','cyan'][i%6]}`}><span className="mgr-metric-icon"><Icon name={item.icon||'Users'} size={20}/></span><strong>{item.label}</strong><div><b>{item.value}</b> <span>{item.detail}</span></div><small>{item.note||item.change||'School records'}</small></article>)}</div>}
export function Status({children,status}){const value=children||status||'Unmarked';return <span className={`mgr-status ${String(value).toLowerCase().replace(/\s+/g,'-')}`}>{value}</span>}
export function Empty({children='No records yet.',title}){return <div className="mgr-empty"><Icon name="Inbox" size={26}/><p>{title||children}</p></div>}
export function Modal({title,children,onClose}){const ref=useRef(null);useEffect(()=>{const previous=document.activeElement;const node=ref.current;const focusable=()=>[...node.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(el=>!el.disabled);focusable()[0]?.focus();const handler=e=>{if(e.key==='Escape'){e.preventDefault();onClose()}if(e.key==='Tab'){const list=focusable(),first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};node.addEventListener('keydown',handler);return()=>{node.removeEventListener('keydown',handler);previous?.focus()}},[]);return <div className="mgr-modal-backdrop" onClick={onClose}><section ref={ref} className="mgr-modal" role="dialog" aria-modal="true" aria-label={title} onClick={e=>e.stopPropagation()}><header><h2>{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose}><Icon name="X"/></button></header>{children}</section></div>}

const hours=Array.from({length:12},(_,index)=>index+1)
const minutes=Array.from({length:60},(_,index)=>index)
const pad=value=>String(value).padStart(2,'0')
const parseTime=value=>{const match=/^(\d{1,2}):(\d{2})$/.exec(String(value||'')),rawHour=Math.min(23,Math.max(0,Number(match?.[1]??8))),minute=Math.min(59,Math.max(0,Number(match?.[2]??0)));return {hour:rawHour%12||12,minute,period:rawHour>=12?'PM':'AM'}}
const timeValue=({hour,minute,period})=>`${pad((hour%12)+(period==='PM'?12:0))}:${pad(minute)}`

export function IosTimePicker({name,defaultValue='08:00',required=false}){
 const initial=parseTime(defaultValue),[value,setValue]=useState(timeValue(initial)),[open,setOpen]=useState(false),[draft,setDraft]=useState(initial),pickerRef=useRef(null)
 useEffect(()=>{const next=parseTime(defaultValue);setValue(timeValue(next));setDraft(next)},[defaultValue])
 useEffect(()=>{if(!open)return;const frame=globalThis.requestAnimationFrame(()=>pickerRef.current?.querySelectorAll('.active').forEach(node=>node.scrollIntoView({block:'center'})));return()=>globalThis.cancelAnimationFrame(frame)},[open])
 const show=()=>{setDraft(parseTime(value));setOpen(true)}
 const choose=()=>{setValue(timeValue(draft));setOpen(false)}
 const pick=(field,selection,event)=>{setDraft(current=>({...current,[field]:selection}));event.currentTarget.scrollIntoView({block:'center',behavior:'smooth'})}
 const display=parseTime(value)
 return <div className="mgr-ios-time-field">
  <input type="hidden" name={name} value={value} required={required}/>
  <button className="mgr-ios-time-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={show}><Icon name="Clock3"/><span>{pad(display.hour)}:{pad(display.minute)}</span><em>{display.period}</em><Icon name="ChevronDown"/></button>
  {open&&<div className="mgr-ios-time-layer" onClick={()=>setOpen(false)}><section ref={pickerRef} className="mgr-ios-time-picker" role="dialog" aria-modal="true" aria-label="Choose time" onClick={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setOpen(false)}}}>
   <header><button type="button" onClick={()=>setOpen(false)}>Cancel</button><div><small>TIME</small><strong>Choose time</strong></div><button type="button" onClick={choose}>Done</button></header>
   <div className="mgr-ios-time-preview"><span><Icon name="Clock3"/></span><div><small>Selected time</small><strong>{pad(draft.hour)}:{pad(draft.minute)} <em>{draft.period}</em></strong></div></div>
   <div className="mgr-time-wheels"><i className="mgr-time-selection"/><div className="mgr-time-wheel" aria-label="Hour">{hours.map(hour=><button type="button" className={draft.hour===hour?'active':''} aria-pressed={draft.hour===hour} onClick={event=>pick('hour',hour,event)} key={hour}>{pad(hour)}</button>)}</div><b>:</b><div className="mgr-time-wheel" aria-label="Minute">{minutes.map(minute=><button type="button" className={draft.minute===minute?'active':''} aria-pressed={draft.minute===minute} onClick={event=>pick('minute',minute,event)} key={minute}>{pad(minute)}</button>)}</div><div className="mgr-time-wheel period" aria-label="AM or PM">{['AM','PM'].map(period=><button type="button" className={draft.period===period?'active':''} aria-pressed={draft.period===period} onClick={event=>pick('period',period,event)} key={period}>{period}</button>)}</div></div>
  </section></div>}
 </div>
}
export function downloadCSV(filename,rows){if(!rows?.length)return;const keys=Object.keys(rows[0]);const csv=[keys,...rows.map(row=>keys.map(key=>row[key]))].map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const link=document.createElement('a');link.href=url;link.download=filename.endsWith('.csv')?filename:`${filename}.csv`;link.click();URL.revokeObjectURL(url)}
